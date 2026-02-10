import {
  IsEnum,
  IsOptional,
  IsString,
  IsDate,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ActivityAction,
  ActivityEntity,
} from '../../../common/constants/activity-action.constant';

export class CreateActivityLogDto {
  @IsEnum(ActivityAction)
  action: ActivityAction;

  @IsEnum(ActivityEntity)
  entity: ActivityEntity;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class QueryActivityLogsDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsEnum(ActivityEntity)
  @IsOptional()
  entity?: ActivityEntity;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
