import { Request } from 'express';
import { UserDocument } from '../../modules/users/schemas/user.schema';
import { TenantDocument } from '../../modules/tenants/schemas/tenant.schema';

export interface RequestWithUser extends Request {
  user: UserDocument;
  tenant?: TenantDocument;
}
