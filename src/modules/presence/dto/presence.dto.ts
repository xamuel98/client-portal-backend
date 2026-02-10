import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PresenceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  BUSY = 'busy',
}

export class UpdatePresenceStatusDto {
  @ApiProperty({
    type: String,
    enum: PresenceStatus,
    description: 'User presence status',
    example: PresenceStatus.BUSY,
  })
  @IsEnum(PresenceStatus)
  status: PresenceStatus;

  @ApiPropertyOptional({
    description: 'Custom status message',
    example: 'In a meeting',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customStatus?: string;
}

export class PresenceResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  userId: string;

  @ApiProperty({
    type: String,
    enum: PresenceStatus,
    example: PresenceStatus.ONLINE,
  })
  status: PresenceStatus;

  @ApiPropertyOptional({ example: '2026-02-10T23:45:00.000Z' })
  lastSeen?: Date;

  @ApiPropertyOptional({ example: 'In a meeting' })
  customStatus?: string;

  @ApiProperty({ example: 2 })
  activeConnections: number;
}

export class BulkPresenceResponseDto {
  @ApiProperty({ type: [PresenceResponseDto] })
  presences: PresenceResponseDto[];
}
