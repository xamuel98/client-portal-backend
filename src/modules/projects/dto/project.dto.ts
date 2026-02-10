import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDate,
  IsNumber,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus } from '../../../common/constants/status.constant';

export class CreateProjectDto {
  /**
   * The name of the project
   * @example "New Website Launch"
   */
  @IsNotEmpty()
  @IsString()
  name: string;

  /**
   * A brief description of the project
   * @example "Marketing campaign for the new product launch"
   */
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * The name of the client
   * @example "Acme Corp"
   */
  @IsOptional()
  @IsString()
  clientName?: string;

  /**
   * Project start date
   * @example "2024-01-01T00:00:00Z"
   */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  /**
   * Project end date
   * @example "2024-06-01T00:00:00Z"
   */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  /**
   * Total project budget
   * @example 5000
   */
  @IsOptional()
  @IsNumber()
  budget?: number;

  /**
   * Project tags
   * @example ["marketing", "internal"]
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
