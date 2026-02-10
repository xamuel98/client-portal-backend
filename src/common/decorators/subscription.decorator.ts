import { SetMetadata } from '@nestjs/common';
import { SubscriptionPlan } from '../constants/subscription-plans.constant';

export const SUBSCRIPTION_KEY = 'subscription_plan';
export const RequiresSubscription = (plan: SubscriptionPlan) =>
  SetMetadata(SUBSCRIPTION_KEY, plan);
