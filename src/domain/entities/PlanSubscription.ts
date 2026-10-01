export interface PlanSubscriptionProps {
  id: string;
  planId: string;
  startedAt: string;
  isActive: boolean;
  currentDayNumber: number;
}

export class PlanSubscription {
  readonly id: string;
  readonly planId: string;
  readonly startedAt: string;
  readonly isActive: boolean;
  readonly currentDayNumber: number;

  constructor(props: PlanSubscriptionProps) {
    if (!props.id || props.id.trim() === '') {
      throw new Error('PlanSubscription id cannot be empty');
    }
    if (!props.planId || props.planId.trim() === '') {
      throw new Error('PlanSubscription planId cannot be empty');
    }
    if (!props.startedAt || props.startedAt.trim() === '') {
      throw new Error('PlanSubscription startedAt cannot be empty');
    }
    if (typeof props.isActive !== 'boolean') {
      throw new Error('PlanSubscription isActive must be a boolean');
    }
    if (!Number.isInteger(props.currentDayNumber) || props.currentDayNumber < 1) {
      throw new Error('PlanSubscription currentDayNumber must be an integer >= 1');
    }

    this.id = props.id.trim();
    this.planId = props.planId.trim();
    this.startedAt = props.startedAt.trim();
    this.isActive = props.isActive;
    this.currentDayNumber = props.currentDayNumber;

    Object.freeze(this);
  }

  withCurrentDayNumber(dayNumber: number): PlanSubscription {
    return new PlanSubscription({
      id: this.id,
      planId: this.planId,
      startedAt: this.startedAt,
      isActive: this.isActive,
      currentDayNumber: dayNumber,
    });
  }

  withActive(isActive: boolean): PlanSubscription {
    return new PlanSubscription({
      id: this.id,
      planId: this.planId,
      startedAt: this.startedAt,
      isActive,
      currentDayNumber: this.currentDayNumber,
    });
  }
}
