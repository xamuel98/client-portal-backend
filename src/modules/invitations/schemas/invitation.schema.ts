import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { InvitationStatus } from '../../../common/constants/invitation-status.constant';
import { UserRole } from '../../../common/constants/roles.constant';

export type InvitationDocument = Invitation & Document;

@Schema({ timestamps: true })
export class Invitation {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ type: String, required: true, enum: UserRole })
  role: UserRole;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  invitedBy: Types.ObjectId;

  @Prop({ required: true })
  token: string; // Hashed token

  @Prop({
    type: String,
    required: true,
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
    index: true,
  })
  status: InvitationStatus;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  acceptedAt?: Date;

  @Prop({ type: [Types.ObjectId], ref: 'Project', default: [] })
  projectIds?: Types.ObjectId[]; // For client invitations - restrict access to specific projects
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);

// Compound indexes
InvitationSchema.index({ tenantId: 1, email: 1, status: 1 });
InvitationSchema.index({ token: 1 }, { unique: true, sparse: true });
InvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-cleanup
