import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto } from './dto/notification.dto';
import { Types } from 'mongoose';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockUserId = new Types.ObjectId();
  const mockTenantId = new Types.ObjectId();
  const mockRequest = {
    user: {
      _id: mockUserId,
      tenantId: mockTenantId,
    },
  };

  const mockNotificationsService = {
    getNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getNotifications', () => {
    it('should return list of notifications', async () => {
      const query: QueryNotificationsDto = { limit: 10 };
      mockNotificationsService.getNotifications.mockResolvedValue([]);

      const result = await controller.getNotifications(
        query,
        mockRequest as any,
      );

      expect(service.getNotifications).toHaveBeenCalledWith(
        mockUserId.toString(),
        mockTenantId.toString(),
        query,
      );
      expect(result).toEqual([]);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockNotificationsService.getUnreadCount.mockResolvedValue({ count: 5 });

      const result = await controller.getUnreadCount(mockRequest as any);

      expect(service.getUnreadCount).toHaveBeenCalledWith(
        mockUserId.toString(),
        mockTenantId.toString(),
      );
      expect(result).toEqual({ count: 5 });
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const id = '1';
      mockNotificationsService.markAsRead.mockResolvedValue(undefined);

      await controller.markAsRead(id, mockRequest as any);

      expect(service.markAsRead).toHaveBeenCalledWith(
        id,
        mockUserId.toString(),
        mockTenantId.toString(),
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockNotificationsService.markAllAsRead.mockResolvedValue(undefined);

      await controller.markAllAsRead(mockRequest as any);

      expect(service.markAllAsRead).toHaveBeenCalledWith(
        mockUserId.toString(),
        mockTenantId.toString(),
      );
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      const id = '1';
      mockNotificationsService.deleteNotification.mockResolvedValue(undefined);

      await controller.deleteNotification(id, mockRequest as any);

      expect(service.deleteNotification).toHaveBeenCalledWith(
        id,
        mockUserId.toString(),
        mockTenantId.toString(),
      );
    });
  });
});
