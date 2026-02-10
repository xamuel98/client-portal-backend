import { IsOptional, IsDate, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class DateRangeDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}

export enum RevenuePeriod {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export class RevenueAnalyticsQueryDto extends DateRangeDto {
  @IsEnum(RevenuePeriod)
  @IsOptional()
  period?: RevenuePeriod = RevenuePeriod.MONTHLY;
}

export class ProjectAnalyticsQueryDto extends DateRangeDto {
  @IsOptional()
  status?: string;
}
