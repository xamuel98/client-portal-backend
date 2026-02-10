import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SUBSCRIPTION_KEY } from '../decorators/subscription.decorator';
import { SubscriptionPlan } from '../constants/subscription-plans.constant';
import { TenantsService } from '../../modules/tenants/tenants.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tenantsService: TenantsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.getAllAndOverride<SubscriptionPlan>(
      SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPlan) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.tenantId) {
      return false;
    }

    const tenant = await this.tenantsService.findOne(user.tenantId.toString());

    if (!tenant) {
      return false;
    }

    const planHierarchy: Record<SubscriptionPlan, number> = {
      [SubscriptionPlan.TRIAL]: 0,
      [SubscriptionPlan.STARTER]: 1,
      [SubscriptionPlan.PROFESSIONAL]: 2,
      [SubscriptionPlan.ENTERPRISE]: 3,
    };

    const currentPlanWeight = planHierarchy[tenant.subscription.plan];
    const requiredPlanWeight = planHierarchy[requiredPlan];

    if (currentPlanWeight < requiredPlanWeight) {
      throw new ForbiddenException(
        `This feature requires a ${requiredPlan} subscription plan.`,
      );
    }

    return true;
  }
}
