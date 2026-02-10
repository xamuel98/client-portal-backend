import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import {
  ActivityLog,
  ActivityLogDocument,
} from '../schemas/activity-log.schema';
import { ActivityEntity } from '../../../common/constants/activity-action.constant';

@Injectable()
export class ActivityLogsRepository extends BaseRepository<ActivityLogDocument> {
  constructor(
    @InjectModel(ActivityLog.name)
    private activityLogModel: Model<ActivityLogDocument>,
  ) {
    super(activityLogModel);
  }

  async findByTenant(
    tenantId: string,
    limit: number = 50,
  ): Promise<ActivityLogDocument[]> {
    return this.activityLogModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .populate('userId', 'email profile')
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async findByUser(
    userId: string,
    tenantId: string,
    limit: number = 50,
  ): Promise<ActivityLogDocument[]> {
    return this.activityLogModel
      .find({
        userId: new Types.ObjectId(userId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async findByEntity(
    entity: ActivityEntity,
    entityId: string,
    tenantId: string,
  ): Promise<ActivityLogDocument[]> {
    return this.activityLogModel
      .find({
        entity,
        entityId: new Types.ObjectId(entityId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .populate('userId', 'email profile')
      .sort({ timestamp: -1 })
      .exec();
  }

  async getRecentActivity(
    tenantId: string,
    hours: number = 24,
  ): Promise<ActivityLogDocument[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.activityLogModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        timestamp: { $gte: since },
      })
      .populate('userId', 'email profile')
      .sort({ timestamp: -1 })
      .exec();
  }
}
