import { PlanSubscription } from '../entities';

export interface SubscriptionProgress {
  subscriptionId: string;
  completedReadingIds: string[];
  totalReadingsCount: number;
  completedReadingsCount: number;
  percentage: number;
}

export interface SubscriptionRepository {
  subscribe(planId: string, startingDayNumber?: number): Promise<PlanSubscription>;
  unsubscribe(idOrPlanId: string): Promise<void>;
  getActiveSubscriptions(): Promise<PlanSubscription[]>;
  getAllSubscriptions(): Promise<PlanSubscription[]>;
  getSubscriptionById(id: string): Promise<PlanSubscription | null>;
  getSubscriptionByPlanId(planId: string): Promise<PlanSubscription | null>;
  updateCurrentDay(subscriptionId: string, dayNumber: number): Promise<void>;
  markReadingComplete(subscriptionId: string, readingId: string): Promise<void>;
  unmarkReading(subscriptionId: string, readingId: string): Promise<void>;
  isReadingCompleted(subscriptionId: string, readingId: string): Promise<boolean>;
  getCompletedReadingIds(subscriptionId: string): Promise<string[]>;
  getProgressForSubscription(subscriptionId: string): Promise<SubscriptionProgress>;
}
