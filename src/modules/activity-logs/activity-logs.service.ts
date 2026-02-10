import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ActivityLogsRepository } from './repositories/activity-logs.repository';
import {
  CreateActivityLogDto,
  QueryActivityLogsDto,
} from './dto/activity-log.dto';
import {
  ActivityAction,
  ActivityEntity,
} from '../../common/constants/activity-action.constant';

@Injectable()
export class ActivityLogsService {
  constructor(
    private readonly activityLogsRepository: ActivityLogsRepository,
  ) {}

  async log(
    dto: CreateActivityLogDto,
    tenantId: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.activityLogsRepository.create({
      tenantId: new Types.ObjectId(tenantId),
      userId: userId ? new Types.ObjectId(userId) : undefined,
      action: dto.action,
      entity: dto.entity,
      entityId: dto.entityId ? new Types.ObjectId(dto.entityId) : undefined,
      metadata: dto.metadata,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    } as any);
  }

  async getActivityLogs(tenantId: string, query: QueryActivityLogsDto) {
    if (query.userId) {
      return this.activityLogsRepository.findByUser(
        query.userId,
        tenantId,
        query.limit,
      );
    }

    if (query.entity && query.startDate) {
      // Custom query with date range
      const filter: any = {
        tenantId: new Types.ObjectId(tenantId),
        entity: query.entity,
      };

      if (query.startDate) {
        filter.timestamp = { $gte: new Date(query.startDate) };
      }
      if (query.endDate) {
        filter.timestamp = {
          ...filter.timestamp,
          $lte: new Date(query.endDate),
        };
      }

      return this.activityLogsRepository.find(filter);
    }

    return this.activityLogsRepository.findByTenant(tenantId, query.limit);
  }

  async getUserActivity(userId: string, tenantId: string, limit: number = 50) {
    return this.activityLogsRepository.findByUser(userId, tenantId, limit);
  }

  async getEntityHistory(
    entity: ActivityEntity,
    entityId: string,
    tenantId: string,
  ) {
    return this.activityLogsRepository.findByEntity(entity, entityId, tenantId);
  }

  async getRecentActivity(tenantId: string, hours: number = 24) {
    return this.activityLogsRepository.getRecentActivity(tenantId, hours);
  }
}
