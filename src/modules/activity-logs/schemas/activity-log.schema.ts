import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  ActivityAction,
  ActivityEntity,
} from '../../../common/constants/activity-action.constant';

export type ActivityLogDocument = ActivityLog & Document;

@Schema({ timestamps: true })
export class ActivityLog {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ActivityAction, index: true })
  action: ActivityAction;

  @Prop({ type: String, required: true, enum: ActivityEntity, index: true })
  entity: ActivityEntity;

  @Prop({ type: Types.ObjectId })
  entityId?: Types.ObjectId;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: Date, default: Date.now, index: true })
  timestamp: Date;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

// Compound indexes
ActivityLogSchema.index({ tenantId: 1, timestamp: -1 });
ActivityLogSchema.index({ tenantId: 1, userId: 1, timestamp: -1 });
ActivityLogSchema.index({ tenantId: 1, entity: 1, entityId: 1 });
