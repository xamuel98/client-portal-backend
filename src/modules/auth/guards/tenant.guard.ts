import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantsRepository } from '../../tenants/repositories/tenants.repository';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly tenantsRepository: TenantsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenantId) {
      throw new UnauthorizedException('Tenant context missing');
    }

    const tenant = await this.tenantsRepository.findById(user.tenantId);
    if (!tenant) {
      throw new UnauthorizedException('Tenant not found');
    }

    if (!tenant.isActive) {
      throw new UnauthorizedException('Tenant is inactive');
    }

    // Attach tenant to request for convenience
    request.tenant = tenant;
    return true;
  }
}
