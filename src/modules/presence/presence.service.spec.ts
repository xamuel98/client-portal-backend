import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PresenceService } from './presence.service';
import { User } from '../users/schemas/user.schema';
import { PresenceStatus } from './dto/presence.dto';

describe('PresenceService', () => {
  let service: PresenceService;
  let userModel: any;

  const mockUserId = new Types.ObjectId().toString();
  const mockTenantId = new Types.ObjectId().toString();

  const mockUser = {
    _id: new Types.ObjectId(mockUserId),
    tenantId: new Types.ObjectId(mockTenantId),
    presence: {
      status: PresenceStatus.ONLINE,
      lastSeen: new Date(),
      lastHeartbeat: new Date(),
      activeConnections: 1,
    },
  };

  beforeEach(async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenceService,
        {
          provide: getModelToken(User.name),
          useValue: {
            findById: jest.fn().mockReturnValue(mockQuery),
            findByIdAndUpdate: jest.fn().mockReturnValue(mockQuery),
            find: jest.fn().mockReturnValue(mockQuery),
            updateMany: jest.fn().mockReturnValue(mockQuery),
          },
        },
      ],
    }).compile();

    service = module.get<PresenceService>(PresenceService);
    userModel = module.get(getModelToken(User.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setUserOnline', () => {
    it('should update user status and increment active connections', async () => {
      userModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      userModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      await service.setUserOnline(mockUserId);

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          $inc: { 'presence.activeConnections': 1 },
        }),
      );
    });
  });

  describe('setUserOffline', () => {
    it('should decrement connections and keep online if connections > 0', async () => {
      const userWithMultipleConns = {
        ...mockUser,
        presence: { ...mockUser.presence, activeConnections: 2 },
      };
      userModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userWithMultipleConns),
      });
      userModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userWithMultipleConns),
      });

      // For the updatePresenceCache call inside setUserOffline
      userModel.findById
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(userWithMultipleConns),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          lean: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(userWithMultipleConns),
        });

      await service.setUserOffline(mockUserId);

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          $set: { 'presence.activeConnections': 1 },
        }),
      );
    });

    it('should set status to offline if connection count reaches 0', async () => {
      const userWithOneConn = {
        ...mockUser,
        presence: { ...mockUser.presence, activeConnections: 1 },
      };
      userModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userWithOneConn),
      });
      userModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userWithOneConn),
      });

      // For updatePresenceCache
      userModel.findById
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(userWithOneConn),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          lean: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(userWithOneConn),
        });

      await service.setUserOffline(mockUserId);

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          $set: expect.objectContaining({
            'presence.status': PresenceStatus.OFFLINE,
            'presence.activeConnections': 0,
          }),
        }),
      );
    });
  });

  describe('updateHeartbeat', () => {
    it('should update heartbeat and seen timestamps', async () => {
      userModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      userModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      await service.updateHeartbeat(mockUserId);

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          $set: expect.objectContaining({
            'presence.status': PresenceStatus.ONLINE,
          }),
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('should update status and custom status', async () => {
      const dto = { status: PresenceStatus.BUSY, customStatus: 'In a meeting' };
      userModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      userModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          presence: { ...mockUser.presence, ...dto },
        }),
      });

      const result = await service.updateStatus(mockUserId, dto);

      expect(result.status).toBe(PresenceStatus.BUSY);
      expect(result.customStatus).toBe('In a meeting');
    });
  });

  describe('getUserPresence', () => {
    it('should return presence from DB if not in cache', async () => {
      userModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.getUserPresence(mockUserId);

      expect(result?.userId).toBe(mockUserId);
    });

    it('should return presence from cache if available', async () => {
      userModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      await service.getUserPresence(mockUserId);

      userModel.findById.mockClear();

      const result = await service.getUserPresence(mockUserId);

      expect(userModel.findById).not.toHaveBeenCalled();
      expect(result?.userId).toBe(mockUserId);
    });
  });

  describe('getTenantPresence', () => {
    it('should return presence for all active users in a tenant', async () => {
      const users = [mockUser];
      userModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(users),
      });

      const result = await service.getTenantPresence(mockTenantId);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(mockUserId);
    });
  });

  describe('detectAwayUsers', () => {
    it('should call updateMany to set users to away', async () => {
      userModel.updateMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      await service.detectAwayUsers();

      expect(userModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          'presence.status': PresenceStatus.ONLINE,
        }),
        expect.objectContaining({
          $set: { 'presence.status': PresenceStatus.AWAY },
        }),
      );
    });
  });

  describe('cleanupStaleConnections', () => {
    it('should call updateMany to set stale users to offline', async () => {
      userModel.updateMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      await service.cleanupStaleConnections();

      expect(userModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          'presence.activeConnections': { $gt: 0 },
        }),
        expect.objectContaining({
          $set: {
            'presence.status': PresenceStatus.OFFLINE,
            'presence.activeConnections': 0,
          },
        }),
      );
    });
  });
});
