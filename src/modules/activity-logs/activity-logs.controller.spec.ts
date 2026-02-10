import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ActivityLogsController } from './activity-logs.controller';
import { ActivityLogsService } from './activity-logs.service';
import { QueryActivityLogsDto } from './dto/activity-log.dto';
import { Types } from 'mongoose';
import { ActivityEntity } from '../../common/constants/activity-action.constant';
import { TenantsRepository } from '../tenants/repositories/tenants.repository';

describe('ActivityLogsController', () => {
  let controller: ActivityLogsController;
  let service: ActivityLogsService;

  const mockUserId = new Types.ObjectId();
  const mockTenantId = new Types.ObjectId();
  const mockRequest = {
    user: {
      _id: mockUserId,
      tenantId: mockTenantId,
    },
  };

  const mockActivityLogsService = {
    getActivityLogs: jest.fn(),
    getUserActivity: jest.fn(),
    getEntityHistory: jest.fn(),
    getRecentActivity: jest.fn(),
  };

  const mockTenantsRepository = {
    findById: jest.fn().mockResolvedValue({ isActive: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityLogsController],
      providers: [
        {
          provide: ActivityLogsService,
          useValue: mockActivityLogsService,
        },
        {
          provide: TenantsRepository,
          useValue: mockTenantsRepository,
        },
      ],
    }).compile();

    controller = module.get<ActivityLogsController>(ActivityLogsController);
    service = module.get<ActivityLogsService>(ActivityLogsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getActivityLogs', () => {
    it('should call service.getActivityLogs', async () => {
      const query: QueryActivityLogsDto = {};
      mockActivityLogsService.getActivityLogs.mockResolvedValue([]);

      const result = await controller.getActivityLogs(
        query,
        mockRequest as any,
      );

      expect(service.getActivityLogs).toHaveBeenCalledWith(
        mockTenantId.toString(),
        query,
      );
      expect(result).toEqual([]);
    });
  });

  describe('getMyActivity', () => {
    it('should call service.getUserActivity for current user', async () => {
      mockActivityLogsService.getUserActivity.mockResolvedValue([]);

      const result = await controller.getMyActivity(mockRequest as any);

      expect(service.getUserActivity).toHaveBeenCalledWith(
        mockUserId.toString(),
        mockTenantId.toString(),
      );
      expect(result).toEqual([]);
    });
  });

  describe('getUserActivity', () => {
    it('should call service.getUserActivity for specified userId', async () => {
      const targetUserId = 'user123';
      mockActivityLogsService.getUserActivity.mockResolvedValue([]);

      const result = await controller.getUserActivity(
        targetUserId,
        mockRequest as any,
      );

      expect(service.getUserActivity).toHaveBeenCalledWith(
        targetUserId,
        mockTenantId.toString(),
      );
      expect(result).toEqual([]);
    });
  });

  describe('getEntityHistory', () => {
    it('should call service.getEntityHistory', async () => {
      const entity = ActivityEntity.PROJECT;
      const id = 'proj123';
      mockActivityLogsService.getEntityHistory.mockResolvedValue([]);

      const result = await controller.getEntityHistory(
        entity,
        id,
        mockRequest as any,
      );

      expect(service.getEntityHistory).toHaveBeenCalledWith(
        entity,
        id,
        mockTenantId.toString(),
      );
      expect(result).toEqual([]);
    });
  });

  describe('getRecentActivity', () => {
    it('should call service.getRecentActivity', async () => {
      mockActivityLogsService.getRecentActivity.mockResolvedValue([]);

      const result = await controller.getRecentActivity(mockRequest as any);

      expect(service.getRecentActivity).toHaveBeenCalledWith(
        mockTenantId.toString(),
      );
      expect(result).toEqual([]);
    });
  });
});
