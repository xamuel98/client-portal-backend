import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WebhookSubscriptionDocument = WebhookSubscription & Document;

@Schema({ timestamps: true })
export class WebhookSubscription {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], required: true })
  events: string[];

  @Prop({ required: true })
  secret: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const WebhookSubscriptionSchema =
  SchemaFactory.createForClass(WebhookSubscription);
WebhookSubscriptionSchema.index({ tenantId: 1 });
