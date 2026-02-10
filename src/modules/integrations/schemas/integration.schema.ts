import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type IntegrationDocument = Integration & Document;

@Schema({ timestamps: true })
export class Integration {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  service: string; // 'google-calendar', 'google-sheets'

  @Prop({
    type: {
      accessToken: String,
      refreshToken: String,
      expiryDate: Number,
      scope: [String],
    },
    required: true,
  })
  credentials: {
    accessToken: string;
    refreshToken: string;
    expiryDate: number;
    scope: string[];
  };

  @Prop({
    type: String,
    enum: ['active', 'revoked', 'expired'],
    default: 'active',
  })
  status: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const IntegrationSchema = SchemaFactory.createForClass(Integration);

// Ensure a tenant/user only has one active integration per service
IntegrationSchema.index(
  { tenantId: 1, userId: 1, service: 1 },
  { unique: true },
);
