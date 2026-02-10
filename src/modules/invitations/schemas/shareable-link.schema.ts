import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '../../../common/constants/roles.constant';

export type ShareableLinkDocument = ShareableLink & Document;

@Schema({ timestamps: true })
export class ShareableLink {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true, enum: UserRole })
  role: UserRole;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ required: true, unique: true })
  token: string; // Unique token for the shareable link

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: null })
  maxUses?: number; // null = unlimited

  @Prop({ default: 0 })
  currentUses: number;

  @Prop()
  description?: string; // Optional description for internal tracking
}

export const ShareableLinkSchema = SchemaFactory.createForClass(ShareableLink);

// Indexes
ShareableLinkSchema.index({ tenantId: 1, isActive: 1 });
ShareableLinkSchema.index({ token: 1 }, { unique: true });
ShareableLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
