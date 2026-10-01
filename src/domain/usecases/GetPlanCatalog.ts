import { ReadingPlan, PlanSubscription } from '../entities';
import { PlanRepository, SubscriptionRepository } from '../repositories';

export interface PlanCatalogItem {
  plan: ReadingPlan;
  isSubscribed: boolean;
  subscription: PlanSubscription | null;
}

export interface PlanCatalogResult {
  annual: PlanCatalogItem[];
  monthly: PlanCatalogItem[];
  thematic: PlanCatalogItem[];
  all: PlanCatalogItem[];
}

export class GetPlanCatalog {
  constructor(
    private readonly planRepo: PlanRepository,
    private readonly subscriptionRepo: SubscriptionRepository
  ) {}

  async execute(): Promise<PlanCatalogResult> {
    const [allPlans, activeSubs] = await Promise.all([
      this.planRepo.getAllPlans(),
      this.subscriptionRepo.getActiveSubscriptions(),
    ]);

    const activeSubMap = new Map<string, PlanSubscription>(
      activeSubs.map(sub => [sub.planId, sub])
    );

    const catalogItems: PlanCatalogItem[] = allPlans.map(plan => {
      const activeSub = activeSubMap.get(plan.id) ?? null;
      return {
        plan,
        isSubscribed: activeSub !== null && activeSub.isActive,
        subscription: activeSub,
      };
    });

    return {
      annual: catalogItems.filter(item => item.plan.archetype === 'annual'),
      monthly: catalogItems.filter(item => item.plan.archetype === 'monthly'),
      thematic: catalogItems.filter(item => item.plan.archetype === 'thematic'),
      all: catalogItems,
    };
  }
}
