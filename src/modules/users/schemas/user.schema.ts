import 'reflect-metadata';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '../../../common/constants/roles.constant';
import { Tenant } from '../../../modules/tenants/schemas/tenant.schema';

export type UserDocument = User & Document;

@Schema({ _id: false })
export class UserProfile {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  avatar?: string;

  @Prop()
  phone?: string;

  @Prop()
  timezone?: string;

  @Prop()
  language?: string;

  @Prop()
  bio?: string;
}

const UserProfileSchema = SchemaFactory.createForClass(UserProfile);

@Schema({ _id: false })
export class UserRefreshToken {
  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  userAgent?: string;
}

const UserRefreshTokenSchema = SchemaFactory.createForClass(UserRefreshToken);

@Schema({ _id: false })
export class UserNotificationPreferences {
  @Prop({ default: true })
  email: boolean;

  @Prop({ default: true })
  push: boolean;

  @Prop({ default: 'daily' })
  digest: 'daily' | 'weekly' | 'never';
}

const UserNotificationPreferencesSchema = SchemaFactory.createForClass(
  UserNotificationPreferences,
);

@Schema({ _id: false })
export class UserPreferences {
  @Prop({ type: UserNotificationPreferencesSchema, default: {} })
  notifications: UserNotificationPreferences;

  @Prop({ default: 'auto' })
  theme: 'light' | 'dark' | 'auto';
}

const UserPreferencesSchema = SchemaFactory.createForClass(UserPreferences);

@Schema({ _id: false })
export class UserPresence {
  @Prop({
    type: String,
    enum: ['online', 'offline', 'away', 'busy'],
    default: 'offline',
  })
  status: 'online' | 'offline' | 'away' | 'busy';

  @Prop()
  lastSeen?: Date;

  @Prop()
  lastHeartbeat?: Date;

  @Prop({ default: 0 })
  activeConnections: number;

  @Prop()
  customStatus?: string;
}

const UserPresenceSchema = SchemaFactory.createForClass(UserPresence);

@Schema({ timestamps: true })
export class User {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true, index: true }) // Unique compound index with tenantId is handled below
  email: string;

  @Prop({ required: false })
  passwordHash?: string;

  @Prop({ sparse: true, index: true, unique: true })
  googleId?: string;

  @Prop({ type: UserProfileSchema, required: true })
  profile: UserProfile;

  @Prop({ type: String, required: true, enum: UserRole, index: true })
  role: UserRole;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  lastLoginAt?: Date;

  @Prop({ sparse: true, index: true })
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  @Prop({ type: [UserRefreshTokenSchema], default: [] })
  refreshTokens: UserRefreshToken[];

  @Prop({ type: UserPreferencesSchema, default: {} })
  preferences: UserPreferences;

  @Prop({ type: UserPresenceSchema, default: {} })
  presence: UserPresence;

  @Prop({ type: Map, of: String }) // Simplified metadata map
  metadata?: Map<string, any>;

  @Prop()
  deletedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Compound indexes
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, role: 1 });
UserSchema.index({ 'refreshTokens.token': 1 }, { sparse: true });
