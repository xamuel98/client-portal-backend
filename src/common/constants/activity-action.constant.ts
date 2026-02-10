export enum ActivityAction {
  // Auth actions
  LOGIN = 'login',
  LOGOUT = 'logout',
  REGISTER = 'register',
  PASSWORD_RESET = 'password_reset',

  // CRUD actions
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',

  // Invitation actions
  INVITE = 'invite',
  ACCEPT_INVITE = 'accept_invite',
  REVOKE_INVITE = 'revoke_invite',

  // File actions
  UPLOAD = 'upload',
  DOWNLOAD = 'download',

  // Message actions
  SEND_MESSAGE = 'send_message',

  // Invoice actions
  SEND_INVOICE = 'send_invoice',
  PAY_INVOICE = 'pay_invoice',

  // Project/Task actions
  ASSIGN = 'assign',
  UNASSIGN = 'unassign',
  COMPLETE = 'complete',
  ARCHIVE = 'archive',

  // Approval actions
  APPROVAL_REQUESTED = 'approval_requested',
  APPROVAL_APPROVED = 'approval_approved',
  APPROVAL_REJECTED = 'approval_rejected',
}

export enum ActivityEntity {
  USER = 'user',
  TENANT = 'tenant',
  PROJECT = 'project',
  TASK = 'task',
  FILE = 'file',
  MESSAGE = 'message',
  INVOICE = 'invoice',
  INVITATION = 'invitation',
  APPROVAL_REQUEST = 'approval_request',
}
