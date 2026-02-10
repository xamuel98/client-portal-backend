import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsService } from './invitations.service';
import { InvitationsRepository } from './repositories/invitations.repository';
import { ShareableLinksRepository } from './repositories/shareable-links.repository';
import { UsersRepository } from '../users/repositories/users.repository';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { UserRole } from '../../common/constants/roles.constant';
import { InvitationStatus } from '../../common/constants/invitation-status.constant';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('InvitationsService - New Features', () => {
  let service: InvitationsService;
  let invitationsRepository: InvitationsRepository;
  let shareableLinksRepository: ShareableLinksRepository;
  let usersRepository: UsersRepository;
  let emailService: EmailService;
  let configService: ConfigService;

  const mockTenantId = new Types.ObjectId().toString();
  const mockUserId = new Types.ObjectId().toString();
  const mockInvitationsRepository = {
    create: jest.fn(),
    findPendingByEmail: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
    findByTenant: jest.fn(),
  };
  const mockShareableLinksRepository = {
    create: jest.fn(),
    findByToken: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    incrementUses: jest.fn(),
    findByTenant: jest.fn(),
  };
  const mockUsersRepository = {
    create: jest.fn(),
    findOne: jest.fn(),
    findByEmailGlobal: jest.fn(),
  };
  const mockEmailService = {
    sendMemberInvitation: jest.fn(),
    sendWelcomeEmail: jest.fn(),
  };

  beforeEach(async () => {
    // Clear all mocks before each test to prevent call count accumulation
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        {
          provide: InvitationsRepository,
          useValue: mockInvitationsRepository,
        },
        {
          provide: ShareableLinksRepository,
          useValue: mockShareableLinksRepository,
        },
        {
          provide: UsersRepository,
          useValue: mockUsersRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('https://app.example.com'),
          },
        },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
    invitationsRepository = module.get<InvitationsRepository>(
      InvitationsRepository,
    );
    shareableLinksRepository = module.get<ShareableLinksRepository>(
      ShareableLinksRepository,
    );
    usersRepository = module.get<UsersRepository>(UsersRepository);
    emailService = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('bulkInviteMembers', () => {
    it('should successfully invite multiple members', async () => {
      const emails = ['user1@test.com', 'user2@test.com', 'user3@test.com'];
      const dto = { emails, role: UserRole.MEMBER };

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);
      mockInvitationsRepository.findPendingByEmail.mockResolvedValue(null);
      mockInvitationsRepository.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        email: 'test@test.com',
        role: UserRole.MEMBER,
      } as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_token');
      mockEmailService.sendMemberInvitation.mockResolvedValue(null);

      const result = await service.bulkInviteMembers(
        dto,
        mockTenantId,
        mockUserId,
        'John Doe',
        'Test Tenant',
      );

      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.message).toContain('Sent 3 invitations');
      expect(emailService.sendMemberInvitation).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures gracefully', async () => {
      const emails = ['existing@test.com', 'new@test.com'];
      const dto = { emails, role: UserRole.MEMBER };

      mockUsersRepository.findOne
        .mockResolvedValueOnce({ email: 'existing@test.com' } as any)
        .mockResolvedValueOnce(null);
      mockInvitationsRepository.findPendingByEmail.mockResolvedValue(null);
      mockInvitationsRepository.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        email: 'new@test.com',
        role: UserRole.MEMBER,
      } as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_token');
      mockEmailService.sendMemberInvitation.mockResolvedValue(null);

      const result = await service.bulkInviteMembers(
        dto,
        mockTenantId,
        mockUserId,
        'John Doe',
        'Test Tenant',
      );

      expect(result.successful).toHaveLength(1);
      expect(result.successful[0]).toBe('new@test.com');
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].email).toBe('existing@test.com');
      expect(result.failed[0].reason).toContain('already exists');
    });

    it('should remove duplicate emails', async () => {
      const emails = ['user@test.com', 'user@test.com', 'USER@TEST.COM'];
      const dto = { emails, role: UserRole.MEMBER };

      mockUsersRepository.findOne.mockResolvedValue(null);
      mockInvitationsRepository.findPendingByEmail.mockResolvedValue(null);
      mockInvitationsRepository.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        email: 'user@test.com',
        role: UserRole.MEMBER,
      } as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_token');
      mockEmailService.sendMemberInvitation.mockResolvedValue(null);

      const result = await service.bulkInviteMembers(
        dto,
        mockTenantId,
        mockUserId,
        'John Doe',
        'Test Tenant',
      );

      expect(result.successful).toHaveLength(1);
      expect(invitationsRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should reject CLIENT role for bulk member invitations', async () => {
      const dto = {
        emails: ['user@test.com'],
        role: UserRole.CLIENT,
      };

      await expect(
        service.bulkInviteMembers(
          dto,
          mockTenantId,
          mockUserId,
          'John Doe',
          'Test Tenant',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle pending invitations', async () => {
      const emails = ['pending@test.com'];
      const dto = { emails, role: UserRole.MEMBER };

      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(invitationsRepository, 'findPendingByEmail')
        .mockResolvedValue({
          email: 'pending@test.com',
          status: InvitationStatus.PENDING,
        } as any);

      const result = await service.bulkInviteMembers(
        dto,
        mockTenantId,
        mockUserId,
        'John Doe',
        'Test Tenant',
      );

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].reason).toContain('already sent');
    });
  });

  describe('createShareableLink', () => {
    it('should create shareable link with default settings', async () => {
      const dto = { role: UserRole.MEMBER };
      const mockLink = {
        _id: new Types.ObjectId(),
        token: 'abc123token',
        role: UserRole.MEMBER,
        expiresAt: new Date(),
        maxUses: null,
        currentUses: 0,
        isActive: true,
      };

      jest
        .spyOn(shareableLinksRepository, 'create')
        .mockResolvedValue(mockLink as any);

      const result = await service.createShareableLink(
        dto,
        mockTenantId,
        mockUserId,
      );

      expect(result.role).toBe(UserRole.MEMBER);
      expect(result.isActive).toBe(true);
      expect(result.inviteUrl).toContain('join?link=');
      expect(shareableLinksRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.MEMBER,
          isActive: true,
          currentUses: 0,
        }),
      );
    });

    it('should create shareable link with custom expiration and max uses', async () => {
      const dto = {
        role: UserRole.MEMBER,
        expiresInDays: 30,
        maxUses: 10,
        description: 'Limited invite',
      };
      const mockLink = {
        _id: new Types.ObjectId(),
        token: 'xyz789token',
        role: UserRole.MEMBER,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        maxUses: 10,
        currentUses: 0,
        isActive: true,
      };

      jest
        .spyOn(shareableLinksRepository, 'create')
        .mockResolvedValue(mockLink as any);

      const result = await service.createShareableLink(
        dto,
        mockTenantId,
        mockUserId,
      );

      expect(result.maxUses).toBe(10);
      expect(shareableLinksRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          maxUses: 10,
          description: 'Limited invite',
        }),
      );
    });

    it('should reject CLIENT role for shareable links', async () => {
      const dto = { role: UserRole.CLIENT };

      await expect(
        service.createShareableLink(dto, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptShareableLink', () => {
    it('should successfully accept shareable link', async () => {
      const dto = {
        token: 'abc123token',
        email: 'newuser@test.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Smith',
      };
      const mockLink = {
        _id: new Types.ObjectId(),
        token: 'abc123token',
        tenantId: new Types.ObjectId(mockTenantId),
        role: UserRole.MEMBER,
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxUses: null,
        currentUses: 0,
      };
      const mockUser = {
        _id: new Types.ObjectId(),
        email: 'newuser@test.com',
        role: UserRole.MEMBER,
      };

      jest
        .spyOn(shareableLinksRepository, 'findByToken')
        .mockResolvedValue(mockLink as any);
      jest.spyOn(usersRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(usersRepository, 'findByEmailGlobal').mockResolvedValue(null);
      jest.spyOn(usersRepository, 'create').mockResolvedValue(mockUser as any);
      jest
        .spyOn(shareableLinksRepository, 'incrementUses')
        .mockResolvedValue(mockLink as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockEmailService.sendWelcomeEmail.mockResolvedValue(null);

      const result = await service.acceptShareableLink(dto);

      expect(result.message).toContain('Successfully joined');
      expect(result.userId).toBeDefined();
      expect(usersRepository.create).toHaveBeenCalled();
      expect(shareableLinksRepository.incrementUses).toHaveBeenCalled();
      expect(emailService.sendWelcomeEmail).toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      const dto = {
        token: 'invalid',
        email: 'test@test.com',
        password: 'pass',
        firstName: 'A',
        lastName: 'B',
      };

      mockShareableLinksRepository.findByToken.mockResolvedValue(null);

      await expect(service.acceptShareableLink(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject inactive link', async () => {
      const dto = {
        token: 'abc123',
        email: 'test@test.com',
        password: 'pass',
        firstName: 'A',
        lastName: 'B',
      };
      const mockLink = {
        isActive: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      mockShareableLinksRepository.findByToken.mockResolvedValue(
        mockLink as any,
      );

      await expect(service.acceptShareableLink(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject expired link', async () => {
      const dto = {
        token: 'abc123',
        email: 'test@test.com',
        password: 'pass',
        firstName: 'A',
        lastName: 'B',
      };
      const mockLink = {
        isActive: true,
        expiresAt: new Date(Date.now() - 1000),
      };

      mockShareableLinksRepository.findByToken.mockResolvedValue(
        mockLink as any,
      );

      await expect(service.acceptShareableLink(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject link at max usage', async () => {
      const dto = {
        token: 'abc123',
        email: 'test@test.com',
        password: 'pass',
        firstName: 'A',
        lastName: 'B',
      };
      const mockLink = {
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxUses: 10,
        currentUses: 10,
      };

      mockShareableLinksRepository.findByToken.mockResolvedValue(
        mockLink as any,
      );

      await expect(service.acceptShareableLink(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject duplicate email in tenant', async () => {
      const dto = {
        token: 'abc123',
        email: 'existing@test.com',
        password: 'pass',
        firstName: 'A',
        lastName: 'B',
      };
      const mockLink = {
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxUses: null,
        currentUses: 0,
        tenantId: new Types.ObjectId(mockTenantId),
      };

      mockShareableLinksRepository.findByToken.mockResolvedValue(
        mockLink as any,
      );
      mockUsersRepository.findOne.mockResolvedValue({
        email: 'existing@test.com',
      } as any);

      await expect(service.acceptShareableLink(dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('listShareableLinks', () => {
    it('should list all shareable links for tenant', async () => {
      const mockLinks = [
        { _id: '1', role: UserRole.MEMBER },
        { _id: '2', role: UserRole.ADMIN },
      ];

      mockShareableLinksRepository.findByTenant.mockResolvedValue(
        mockLinks as any,
      );

      const result = await service.listShareableLinks(mockTenantId);

      expect(result).toEqual(mockLinks);
      expect(shareableLinksRepository.findByTenant).toHaveBeenCalledWith(
        mockTenantId,
      );
    });
  });

  describe('deactivateShareableLink', () => {
    it('should deactivate shareable link', async () => {
      const linkId = 'link123';
      const mockLink = {
        _id: linkId,
        tenantId: new Types.ObjectId(mockTenantId),
        isActive: true,
      };

      mockShareableLinksRepository.findById.mockResolvedValue(mockLink as any);
      mockShareableLinksRepository.update.mockResolvedValue({
        ...mockLink,
        isActive: false,
      } as any);

      const result = await service.deactivateShareableLink(
        linkId,
        mockTenantId,
      );

      expect(result.message).toContain('deactivated successfully');
      expect(shareableLinksRepository.update).toHaveBeenCalledWith(linkId, {
        isActive: false,
      });
    });

    it('should throw error if link not found', async () => {
      const linkId = 'nonexistent';

      mockShareableLinksRepository.findById.mockResolvedValue(null);

      await expect(
        service.deactivateShareableLink(linkId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if link belongs to different tenant', async () => {
      const linkId = 'link123';
      const differentTenantId = new Types.ObjectId().toString();
      const mockLink = {
        _id: linkId,
        tenantId: new Types.ObjectId(differentTenantId),
      };

      mockShareableLinksRepository.findById.mockResolvedValue(mockLink as any);

      await expect(
        service.deactivateShareableLink(linkId, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
