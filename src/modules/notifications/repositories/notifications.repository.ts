import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import {
  Notification,
  NotificationDocument,
} from '../schemas/notification.schema';

@Injectable()
export class NotificationsRepository extends BaseRepository<NotificationDocument> {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {
    super(notificationModel);
  }

  async findByUser(
    userId: string,
    tenantId: string,
    limit: number = 50,
  ): Promise<NotificationDocument[]> {
    return this.notificationModel
      .find({
        userId: new Types.ObjectId(userId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async findUnread(
    userId: string,
    tenantId: string,
  ): Promise<NotificationDocument[]> {
    return this.notificationModel
      .find({
        userId: new Types.ObjectId(userId),
        tenantId: new Types.ObjectId(tenantId),
        read: false,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getUnreadCount(userId: string, tenantId: string): Promise<number> {
    return this.notificationModel
      .countDocuments({
        userId: new Types.ObjectId(userId),
        tenantId: new Types.ObjectId(tenantId),
        read: false,
      })
      .exec();
  }

  async markAsRead(id: string): Promise<NotificationDocument | null> {
    return this.notificationModel
      .findByIdAndUpdate(id, { read: true, readAt: new Date() }, { new: true })
      .exec();
  }

  async markAllAsRead(
    userId: string,
    tenantId: string,
  ): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel
      .updateMany(
        {
          userId: new Types.ObjectId(userId),
          tenantId: new Types.ObjectId(tenantId),
          read: false,
        },
        { read: true, readAt: new Date() },
      )
      .exec();

    return { modifiedCount: result.modifiedCount };
  }
}
