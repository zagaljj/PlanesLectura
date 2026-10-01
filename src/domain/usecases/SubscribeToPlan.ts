import { PlanSubscription } from '../entities';
import { PlanRepository, SubscriptionRepository } from '../repositories';

export interface SubscribeToPlanInput {
  planId: string;
  action?: 'subscribe' | 'unsubscribe';
  startingDayNumber?: number;
}

export class SubscribeToPlan {
  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly planRepo?: PlanRepository
  ) {}

  async subscribe(planId: string, startingDayNumber: number = 1): Promise<PlanSubscription> {
    if (!planId || planId.trim() === '') {
      throw new Error('planId cannot be empty');
    }

    if (this.planRepo) {
      const plan = await this.planRepo.getPlanById(planId);
      if (!plan) {
        throw new Error(`Plan not found: ${planId}`);
      }
    }

    return this.subscriptionRepo.subscribe(planId, startingDayNumber);
  }

  async unsubscribe(planIdOrSubscriptionId: string): Promise<void> {
    if (!planIdOrSubscriptionId || planIdOrSubscriptionId.trim() === '') {
      throw new Error('planId or subscriptionId cannot be empty');
    }

    await this.subscriptionRepo.unsubscribe(planIdOrSubscriptionId);
  }

  async execute(input: SubscribeToPlanInput): Promise<PlanSubscription | null> {
    const action = input.action ?? 'subscribe';
    if (action === 'unsubscribe') {
      await this.unsubscribe(input.planId);
      return null;
    }

    return this.subscribe(input.planId, input.startingDayNumber ?? 1);
  }
}
