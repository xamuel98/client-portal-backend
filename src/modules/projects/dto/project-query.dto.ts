import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ProjectStatus } from '../../../common/constants/status.constant';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { ApiProperty } from '@nestjs/swagger';

export class ProjectQueryDto extends PaginationQueryDto {
  @ApiProperty({ enum: ProjectStatus, required: false })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiProperty({ example: 'Acme', required: false })
  @IsOptional()
  @IsString()
  search?: string;
}
