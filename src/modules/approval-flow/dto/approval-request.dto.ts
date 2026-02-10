import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsMongoId,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  ApprovalStatus,
  ApprovalEntityType,
} from '../../../common/constants/approval-status.constant';

export class CreateApprovalRequestDto {
  /**
   * The ID of the user who will approve the request
   * @example "65b2f1e4c8a2b34d5e6f7a8c"
   */
  @IsNotEmpty()
  @IsMongoId()
  approverId: string;

  /**
   * The type of entity being approved
   * @example "invoice"
   */
  @IsNotEmpty()
  @IsEnum(ApprovalEntityType)
  entityType: ApprovalEntityType;

  /**
   * The ID of the entity being approved
   * @example "65b2f1e4c8a2b34d5e6f7a8b"
   */
  @IsNotEmpty()
  @IsMongoId()
  entityId: string;

  /**
   * Optional initial comments
   * @example "Please review this invoice for the website launch."
   */
  @IsOptional()
  @IsString()
  comments?: string;
}

export class UpdateApprovalStatusDto {
  /**
   * The new status of the approval request
   * @example "approved"
   */
  @IsNotEmpty()
  @IsEnum([ApprovalStatus.APPROVED, ApprovalStatus.REJECTED])
  status: ApprovalStatus;

  /**
   * Reason for rejection (required if status is rejected)
   * @example "Budget exceeded."
   */
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  /**
   * Additional comments
   * @example "Looks good, proceed."
   */
  @IsOptional()
  @IsString()
  comments?: string;
}
