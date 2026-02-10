import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  NotificationType,
  NotificationChannel,
} from '../../../common/constants/notification-type.constant';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, enum: NotificationType, index: true })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: false, index: true })
  read: boolean;

  @Prop()
  readAt?: Date;

  @Prop({
    type: [String],
    enum: NotificationChannel,
    default: [NotificationChannel.IN_APP],
  })
  channels: NotificationChannel[];
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Compound indexes
NotificationSchema.index({ tenantId: 1, userId: 1, read: 1 });
NotificationSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
