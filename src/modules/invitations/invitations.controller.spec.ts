import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { ConfigService } from '@nestjs/config';
import {
  CreateMemberInvitationDto,
  CreateClientInvitationDto,
  AcceptInvitationDto,
  BulkMemberInvitationDto,
  CreateShareableLinkDto,
  AcceptShareableLinkDto,
} from './dto/invitation.dto';
import { Types } from 'mongoose';
import { UserRole } from '../../common/constants/roles.constant';

describe('InvitationsController', () => {
  let controller: InvitationsController;
  let service: InvitationsService;

  const mockUserId = new Types.ObjectId();
  const mockTenantId = new Types.ObjectId();
  const mockRequest = {
    user: {
      _id: mockUserId,
      tenantId: mockTenantId,
      profile: { firstName: 'John', lastName: 'Doe' },
    },
    tenant: { name: 'Test Tenant' },
  };

  const mockInvitationsService = {
    inviteMember: jest.fn(),
    inviteClient: jest.fn(),
    acceptInvitation: jest.fn(),
    listInvitations: jest.fn(),
    revokeInvitation: jest.fn(),
    bulkInviteMembers: jest.fn(),
    createShareableLink: jest.fn(),
    listShareableLinks: jest.fn(),
    acceptShareableLink: jest.fn(),
    deactivateShareableLink: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('ClientPortal Pro'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        {
          provide: InvitationsService,
          useValue: mockInvitationsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<InvitationsController>(InvitationsController);
    service = module.get<InvitationsService>(InvitationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('inviteMember', () => {
    it('should call service.inviteMember', async () => {
      const dto: CreateMemberInvitationDto = {
        email: 'test@member.com',
        role: UserRole.MEMBER,
      };
      mockInvitationsService.inviteMember.mockResolvedValue({ id: '1' });

      const result = await controller.inviteMember(dto, mockRequest as any);

      expect(service.inviteMember).toHaveBeenCalledWith(
        dto,
        mockTenantId.toString(),
        mockUserId.toString(),
        'John Doe',
        'Test Tenant',
      );
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('inviteClient', () => {
    it('should call service.inviteClient', async () => {
      const dto: CreateClientInvitationDto = {
        email: 'test@client.com',
        projectIds: [],
      };
      mockInvitationsService.inviteClient.mockResolvedValue({ id: '2' });

      const result = await controller.inviteClient(dto, mockRequest as any);

      expect(service.inviteClient).toHaveBeenCalledWith(
        dto,
        mockTenantId.toString(),
        mockUserId.toString(),
        'John Doe',
        'Test Tenant',
      );
      expect(result).toEqual({ id: '2' });
    });
  });

  describe('acceptInvitation', () => {
    it('should call service.acceptInvitation', async () => {
      const dto: AcceptInvitationDto = {
        token: 'hashed_token',
        password: 'new_password',
        firstName: 'A',
        lastName: 'B',
      };
      mockInvitationsService.acceptInvitation.mockResolvedValue({
        success: true,
      });

      const result = await controller.acceptInvitation(dto);

      expect(service.acceptInvitation).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ success: true });
    });
  });

  describe('listInvitations', () => {
    it('should call service.listInvitations', async () => {
      mockInvitationsService.listInvitations.mockResolvedValue([]);

      const result = await controller.listInvitations(mockRequest as any);

      expect(service.listInvitations).toHaveBeenCalledWith(
        mockTenantId.toString(),
      );
      expect(result).toEqual([]);
    });
  });

  describe('revokeInvitation', () => {
    it('should call service.revokeInvitation', async () => {
      const id = '1';
      mockInvitationsService.revokeInvitation.mockResolvedValue(undefined);

      await controller.revokeInvitation(id, mockRequest as any);

      expect(service.revokeInvitation).toHaveBeenCalledWith(
        id,
        mockTenantId.toString(),
      );
    });
  });

  describe('bulkInviteMembers', () => {
    it('should call service.bulkInviteMembers with correct parameters', async () => {
      const dto: BulkMemberInvitationDto = {
        emails: ['user1@test.com', 'user2@test.com', 'user3@test.com'],
        role: UserRole.MEMBER,
      };
      const mockResponse = {
        message: 'Sent 3 invitations, 0 failed',
        successful: ['user1@test.com', 'user2@test.com', 'user3@test.com'],
        failed: [],
      };
      mockInvitationsService.bulkInviteMembers.mockResolvedValue(mockResponse);

      const result = await controller.bulkInviteMembers(
        dto,
        mockRequest as any,
      );

      expect(service.bulkInviteMembers).toHaveBeenCalledWith(
        dto,
        mockTenantId.toString(),
        mockUserId.toString(),
        'John Doe',
        'Test Tenant',
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle partial failures in bulk invite', async () => {
      const dto: BulkMemberInvitationDto = {
        emails: ['existing@test.com', 'new@test.com'],
        role: UserRole.MEMBER,
      };
      const mockResponse = {
        message: 'Sent 1 invitations, 1 failed',
        successful: ['new@test.com'],
        failed: [
          {
            email: 'existing@test.com',
            reason: 'User already exists in this tenant',
          },
        ],
      };
      mockInvitationsService.bulkInviteMembers.mockResolvedValue(mockResponse);

      const result = await controller.bulkInviteMembers(
        dto,
        mockRequest as any,
      );

      expect(result).toEqual(mockResponse);
      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
    });
  });

  describe('createShareableLink', () => {
    it('should create shareable link with default settings', async () => {
      const dto: CreateShareableLinkDto = {
        role: UserRole.MEMBER,
      };
      const mockResponse = {
        id: 'link123',
        token: 'abc123token',
        inviteUrl: 'https://app.com/join?link=abc123token',
        role: UserRole.MEMBER,
        expiresAt: new Date('2026-02-17'),
        maxUses: null,
        currentUses: 0,
        isActive: true,
      };
      mockInvitationsService.createShareableLink.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.createShareableLink(
        dto,
        mockRequest as any,
      );

      expect(service.createShareableLink).toHaveBeenCalledWith(
        dto,
        mockTenantId.toString(),
        mockUserId.toString(),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should create shareable link with custom expiration and max uses', async () => {
      const dto: CreateShareableLinkDto = {
        role: UserRole.MEMBER,
        expiresInDays: 30,
        maxUses: 10,
        description: 'Limited invite for Q1',
      };
      const mockResponse = {
        id: 'link456',
        token: 'xyz789token',
        inviteUrl: 'https://app.com/join?link=xyz789token',
        role: UserRole.MEMBER,
        expiresAt: new Date('2026-03-12'),
        maxUses: 10,
        currentUses: 0,
        isActive: true,
      };
      mockInvitationsService.createShareableLink.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.createShareableLink(
        dto,
        mockRequest as any,
      );

      expect(result.maxUses).toBe(10);
      expect(result.inviteUrl).toContain('join?link=');
    });
  });

  describe('listShareableLinks', () => {
    it('should list all shareable links for tenant', async () => {
      const mockLinks = [
        {
          _id: 'link1',
          role: UserRole.MEMBER,
          isActive: true,
          currentUses: 5,
          maxUses: 10,
        },
        {
          _id: 'link2',
          role: UserRole.ADMIN,
          isActive: false,
          currentUses: 0,
          maxUses: null,
        },
      ];
      mockInvitationsService.listShareableLinks.mockResolvedValue(mockLinks);

      const result = await controller.listShareableLinks(mockRequest as any);

      expect(service.listShareableLinks).toHaveBeenCalledWith(
        mockTenantId.toString(),
      );
      expect(result).toEqual(mockLinks);
      expect(result).toHaveLength(2);
    });
  });

  describe('acceptShareableLink', () => {
    it('should accept shareable link and create user', async () => {
      const dto: AcceptShareableLinkDto = {
        token: 'abc123token',
        email: 'newuser@test.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1234567890',
      };
      const mockResponse = {
        message: 'Successfully joined the team',
        userId: 'user123',
      };
      mockInvitationsService.acceptShareableLink.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.acceptShareableLink(dto);

      expect(service.acceptShareableLink).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deactivateShareableLink', () => {
    it('should deactivate shareable link', async () => {
      const linkId = 'link123';
      const mockResponse = {
        message: 'Shareable link deactivated successfully',
      };
      mockInvitationsService.deactivateShareableLink.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.deactivateShareableLink(
        linkId,
        mockRequest as any,
      );

      expect(service.deactivateShareableLink).toHaveBeenCalledWith(
        linkId,
        mockTenantId.toString(),
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
