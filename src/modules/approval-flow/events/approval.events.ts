import { ApprovalEntityType } from '../../../common/constants/approval-status.constant';
import { Types } from 'mongoose';

export class ApprovalApprovedEvent {
  constructor(
    public readonly requestId: string,
    public readonly tenantId: string,
    public readonly entityType: ApprovalEntityType,
    public readonly entityId: string,
    public readonly approverId: string,
    public readonly comments?: string,
  ) {}
}

export class ApprovalRejectedEvent {
  constructor(
    public readonly requestId: string,
    public readonly tenantId: string,
    public readonly entityType: ApprovalEntityType,
    public readonly entityId: string,
    public readonly approverId: string,
    public readonly reason?: string,
    public readonly comments?: string,
  ) {}
}

export const ApprovalEvents = {
  APPROVED: 'approval.approved',
  REJECTED: 'approval.rejected',
};
