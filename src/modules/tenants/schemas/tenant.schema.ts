import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../../common/constants/subscription-plans.constant';

export type TenantDocument = Tenant & Document;

@Schema({ _id: false })
export class BrandColors {
  @Prop({ default: '#0070f3' })
  primary: string;

  @Prop({ default: '#666666' })
  secondary: string;
}

const BrandColorsSchema = SchemaFactory.createForClass(BrandColors);

@Schema({ _id: false })
export class Subscription {
  @Prop({
    type: String,
    required: true,
    enum: SubscriptionPlan,
    default: SubscriptionPlan.TRIAL,
  })
  plan: SubscriptionPlan;

  @Prop({
    type: String,
    required: true,
    enum: SubscriptionStatus,
    default: SubscriptionStatus.TRIAL,
  })
  status: SubscriptionStatus;

  @Prop()
  trialEndsAt?: Date;

  @Prop()
  stripeCustomerId?: string;

  @Prop()
  stripeSubscriptionId?: string;

  @Prop()
  currentPeriodEnd?: Date;
}

const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

@Schema({ _id: false })
export class TenantSettingsFeatures {
  @Prop({ default: false })
  whiteLabeling: boolean;

  @Prop({ default: false })
  customDomain: boolean;

  @Prop({ default: false })
  apiAccess: boolean;

  @Prop({ default: false })
  advancedAnalytics: boolean;
}

const TenantSettingsFeaturesSchema = SchemaFactory.createForClass(
  TenantSettingsFeatures,
);

@Schema({ _id: false })
export class TenantSettings {
  @Prop({ default: 'UTC' })
  timezone: string;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ default: 'en-US' })
  locale: string;

  @Prop({ default: 'YYYY-MM-DD' })
  dateFormat: string;

  @Prop({ default: 'INV-' })
  invoicePrefix: string;

  @Prop({ type: TenantSettingsFeaturesSchema, default: {} })
  features: TenantSettingsFeatures;
}

const TenantSettingsSchema = SchemaFactory.createForClass(TenantSettings);

@Schema({ _id: false })
export class TenantUsage {
  @Prop({ default: 0 })
  storageUsed: number;

  @Prop({ default: 0 })
  usersCount: number;

  @Prop({ default: 0 })
  projectsCount: number;
}

const TenantUsageSchema = SchemaFactory.createForClass(TenantUsage);

@Schema({ _id: false })
export class TenantLimits {
  @Prop({ default: 5 })
  maxUsers: number;

  @Prop({ default: 10 })
  maxProjects: number;

  @Prop({ default: 1073741824 }) // 1GB
  maxStorage: number;
}

const TenantLimitsSchema = SchemaFactory.createForClass(TenantLimits);

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ unique: true, sparse: true })
  domain?: string;

  @Prop()
  logo?: string;

  @Prop({ type: BrandColorsSchema, default: {} })
  brandColors: BrandColors;

  @Prop({ type: SubscriptionSchema, default: {} })
  subscription: Subscription;

  @Prop({ type: TenantSettingsSchema, default: {} })
  settings: TenantSettings;

  @Prop({ type: TenantUsageSchema, default: {} })
  usage: TenantUsage;

  @Prop({ type: TenantLimitsSchema, default: {} })
  limits: TenantLimits;

  @Prop({ default: true })
  isActive: boolean;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

TenantSchema.index({ 'subscription.status': 1 });
