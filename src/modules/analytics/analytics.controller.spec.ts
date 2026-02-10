import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import {
  DateRangeDto,
  RevenueAnalyticsQueryDto,
  ProjectAnalyticsQueryDto,
} from './dto/analytics.dto';
import { Types } from 'mongoose';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: AnalyticsService;

  const mockTenantId = new Types.ObjectId();
  const mockRequest = {
    user: {
      tenantId: mockTenantId,
    },
  };

  const mockAnalyticsService = {
    getDashboardMetrics: jest.fn(),
    getProjectAnalytics: jest.fn(),
    getProjectById: jest.fn(),
    getUserActivityAnalytics: jest.fn(),
    getRevenueAnalytics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDashboardMetrics', () => {
    it('should call service.getDashboardMetrics', async () => {
      mockAnalyticsService.getDashboardMetrics.mockResolvedValue({});
      const result = await controller.getDashboardMetrics(mockRequest as any);
      expect(service.getDashboardMetrics).toHaveBeenCalledWith(
        mockTenantId.toString(),
      );
      expect(result).toEqual({});
    });
  });

  describe('getProjectAnalytics', () => {
    it('should call service.getProjectAnalytics', async () => {
      const query: ProjectAnalyticsQueryDto = {};
      mockAnalyticsService.getProjectAnalytics.mockResolvedValue([]);
      const result = await controller.getProjectAnalytics(
        query,
        mockRequest as any,
      );
      expect(service.getProjectAnalytics).toHaveBeenCalledWith(
        mockTenantId.toString(),
        query,
      );
      expect(result).toEqual([]);
    });
  });

  describe('getRevenueAnalytics', () => {
    it('should call service.getRevenueAnalytics', async () => {
      const query: RevenueAnalyticsQueryDto = {
        startDate: new Date(),
        endDate: new Date(),
      };
      mockAnalyticsService.getRevenueAnalytics.mockResolvedValue([]);
      const result = await controller.getRevenueAnalytics(
        query,
        mockRequest as any,
      );
      expect(service.getRevenueAnalytics).toHaveBeenCalledWith(
        mockTenantId.toString(),
        query,
      );
      expect(result).toEqual([]);
    });
  });
});
