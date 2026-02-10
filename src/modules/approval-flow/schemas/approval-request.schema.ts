import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  ApprovalStatus,
  ApprovalEntityType,
} from '../../../common/constants/approval-status.constant';

export type ApprovalRequestDocument = ApprovalRequest & Document;

@Schema({ timestamps: true })
export class ApprovalRequest {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  requestedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  approverId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ApprovalEntityType,
    required: true,
    index: true,
  })
  entityType: ApprovalEntityType;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  entityId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
    index: true,
  })
  status: ApprovalStatus;

  @Prop()
  comments?: string;

  @Prop()
  rejectionReason?: string;

  @Prop()
  approvedAt?: Date;

  @Prop()
  rejectedAt?: Date;
}

export const ApprovalRequestSchema =
  SchemaFactory.createForClass(ApprovalRequest);

ApprovalRequestSchema.index({ entityId: 1, entityType: 1 });
