export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum ApprovalEntityType {
  INVOICE = 'invoice',
  PROJECT_DELIVERABLE = 'project_deliverable',
  FILE = 'file',
  TASK = 'task',
}
