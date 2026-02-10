import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsBoolean,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../../../common/constants/roles.constant';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  bio?: string;
}

class NotificationPreferencesDto {
  @IsBoolean()
  @IsOptional()
  email?: boolean;

  @IsBoolean()
  @IsOptional()
  push?: boolean;

  @IsEnum(['daily', 'weekly', 'never'])
  @IsOptional()
  digest?: 'daily' | 'weekly' | 'never';
}

export class UpdatePreferencesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notifications?: NotificationPreferencesDto;

  @IsEnum(['light', 'dark', 'auto'])
  @IsOptional()
  theme?: 'light' | 'dark' | 'auto';
}

export class UpdateUserAccessDto {
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}
