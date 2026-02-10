import { Test, TestingModule } from '@nestjs/testing';
import { PresenceController } from './presence.controller';
import { PresenceService } from './presence.service';
import { PresenceStatus } from './dto/presence.dto';
import { Types } from 'mongoose';

describe('PresenceController', () => {
  let controller: PresenceController;
  let service: PresenceService;

  const mockUserId = new Types.ObjectId().toString();
  const mockTenantId = new Types.ObjectId().toString();

  const mockPresenceResponse = {
    userId: mockUserId,
    status: PresenceStatus.ONLINE,
    activeConnections: 1,
  };

  const mockRequest = {
    user: {
      _id: mockUserId,
      tenantId: mockTenantId,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PresenceController],
      providers: [
        {
          provide: PresenceService,
          useValue: {
            getUserPresence: jest.fn(),
            getTenantPresence: jest.fn(),
            updateStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PresenceController>(PresenceController);
    service = module.get<PresenceService>(PresenceService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyPresence', () => {
    it('should return own presence', async () => {
      jest
        .spyOn(service, 'getUserPresence')
        .mockResolvedValue(mockPresenceResponse);

      const result = await controller.getMyPresence(mockRequest as any);

      expect(result).toEqual(mockPresenceResponse);
      expect(service.getUserPresence).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('getUserPresence', () => {
    it('should return specific user presence', async () => {
      jest
        .spyOn(service, 'getUserPresence')
        .mockResolvedValue(mockPresenceResponse);

      const result = await controller.getUserPresence(mockUserId);

      expect(result).toEqual(mockPresenceResponse);
      expect(service.getUserPresence).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('getTeamPresence', () => {
    it('should return bulk presence for tenant', async () => {
      const bulkResponse = [mockPresenceResponse];
      jest.spyOn(service, 'getTenantPresence').mockResolvedValue(bulkResponse);

      const result = await controller.getTeamPresence(mockRequest as any);

      expect(result).toEqual({ presences: bulkResponse });
      expect(service.getTenantPresence).toHaveBeenCalledWith(mockTenantId);
    });
  });

  describe('updateStatus', () => {
    it('should update and return own status', async () => {
      const dto = { status: PresenceStatus.BUSY, customStatus: 'Working' };
      const updatedPresence = { ...mockPresenceResponse, ...dto };
      jest.spyOn(service, 'updateStatus').mockResolvedValue(updatedPresence);

      const result = await controller.updateStatus(dto, mockRequest as any);

      expect(result).toEqual(updatedPresence);
      expect(service.updateStatus).toHaveBeenCalledWith(mockUserId, dto);
    });
  });
});
