import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { ConfigService } from '@nestjs/config';
import {
  CreateMemberInvitationDto,
  CreateClientInvitationDto,
  AcceptInvitationDto,
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
});
