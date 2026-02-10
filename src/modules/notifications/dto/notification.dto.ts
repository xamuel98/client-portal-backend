import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import {
  NotificationType,
  NotificationChannel,
} from '../../../common/constants/notification-type.constant';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({
    enum: NotificationType,
    example: NotificationType.TASK_ASSIGNED,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ example: 'New Task Assigned' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'You have been assigned to a new task: Project X' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ example: { taskId: '123' }, required: false })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    enum: NotificationChannel,
    isArray: true,
    example: [NotificationChannel.IN_APP],
    required: false,
  })
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  @IsOptional()
  channels?: NotificationChannel[] = [NotificationChannel.IN_APP];
}

export class QueryNotificationsDto {
  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  unreadOnly?: boolean;

  @ApiProperty({ enum: NotificationType, required: false })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiProperty({ example: 50, required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
