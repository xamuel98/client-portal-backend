export enum NotificationType {
  // Task notifications
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  TASK_UPDATED = 'task_updated',
  TASK_COMMENT = 'task_comment',

  // Message notifications
  MESSAGE_RECEIVED = 'message_received',

  // Invoice notifications
  INVOICE_SENT = 'invoice_sent',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_OVERDUE = 'invoice_overdue',

  // Project notifications
  PROJECT_CREATED = 'project_created',
  PROJECT_UPDATED = 'project_updated',
  PROJECT_COMPLETED = 'project_completed',

  // Invitation notifications
  INVITATION_RECEIVED = 'invitation_received',
  INVITATION_ACCEPTED = 'invitation_accepted',

  // File notifications
  FILE_UPLOADED = 'file_uploaded',
  FILE_SHARED = 'file_shared',

  // System notifications
  SYSTEM_ALERT = 'system_alert',
  ACCOUNT_UPDATED = 'account_updated',
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  PUSH = 'push', // Future implementation
}
