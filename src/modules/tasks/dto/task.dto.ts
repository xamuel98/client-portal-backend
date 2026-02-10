import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDate,
  IsNumber,
  IsMongoId,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TaskStatus,
  TaskPriority,
} from '../../../common/constants/status.constant';

export class CreateTaskDto {
  /**
   * The ID of the project this task belongs to
   * @example "65b2f1e4c8a2b34d5e6f7a8b"
   */
  @IsNotEmpty()
  @IsMongoId()
  projectId: string;

  /**
   * Task title
   * @example "Implement User Authentication"
   */
  @IsNotEmpty()
  @IsString()
  title: string;

  /**
   * Detailed description of the task
   * @example "Set up JWT and passport for the auth module"
   */
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Task priority level
   * @example "high"
   */
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  /**
   * The ID of the user assigned to this task
   * @example "65b2f1e4c8a2b34d5e6f7a8c"
   */
  @IsOptional()
  @IsMongoId()
  assigneeId?: string;

  /**
   * When the task is due
   * @example "2024-02-28T23:59:59Z"
   */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  /**
   * Estimated time in hours
   * @example 8
   */
  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  /**
   * List of tags for the task
   * @example ["feature", "backend"]
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsMongoId()
  assigneeId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @IsOptional()
  @IsNumber()
  actualHours?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
