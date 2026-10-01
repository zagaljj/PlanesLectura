import {
  ReadingPlan,
  PlanDay,
  PlanReading,
  PlanSubscription,
  StudyArticle,
} from '../entities';
import {
  PlanRepository,
  SubscriptionRepository,
  ArticleRepository,
} from '../repositories';

export interface ReadingWithProgress {
  reading: PlanReading;
  isCompleted: boolean;
}

export interface ActivePlanToday {
  subscription: PlanSubscription;
  plan: ReadingPlan;
  day: PlanDay;
  readings: ReadingWithProgress[];
  articles: StudyArticle[];
}

export interface GetActivePlansOptions {
  date?: Date;
  useCalendarDate?: boolean;
}

/**
 * Calculates day number (1-365) from a calendar date.
 * Maps Feb 29 deterministically to Feb 28 (day 59) to prevent leap year drift.
 */
export function calculateCalendarDayNumber(date: Date = new Date()): number {
  const month = date.getMonth() + 1; // 1-12
  let dayOfMonth = date.getDate(); // 1-31

  // Handle leap year drift: Feb 29 maps deterministically to Feb 28 (day 59)
  if (month === 2 && dayOfMonth > 28) {
    dayOfMonth = 28;
  }

  const daysBeforeMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  return daysBeforeMonth[month - 1] + dayOfMonth;
}

export class GetActivePlansWithTodayReadings {
  constructor(
    private readonly planRepo: PlanRepository,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly articleRepo: ArticleRepository
  ) {}

  async execute(options?: GetActivePlansOptions): Promise<ActivePlanToday[]> {
    const activeSubs = await this.subscriptionRepo.getActiveSubscriptions();
    if (!activeSubs || activeSubs.length === 0) {
      return [];
    }

    const targetDate = options?.date ?? new Date();
    const results: ActivePlanToday[] = [];

    for (const subscription of activeSubs) {
      const plan = await this.planRepo.getPlanById(subscription.planId);
      if (!plan) {
        continue;
      }

      // Determine day number: calendar mapping for annual plans, progression for others
      let dayNumber: number;
      const shouldUseCalendar =
        options?.useCalendarDate !== undefined
          ? options.useCalendarDate
          : plan.archetype === 'annual';

      if (shouldUseCalendar) {
        dayNumber = calculateCalendarDayNumber(targetDate);
      } else {
        dayNumber = subscription.currentDayNumber;
      }

      // Ensure dayNumber is within plan range
      if (dayNumber > plan.totalDays) {
        dayNumber = plan.totalDays;
      }

      const dayWithReadings = await this.planRepo.getDayWithReadings(plan.id, dayNumber);
      if (!dayWithReadings) {
        continue;
      }

      const { day, readings } = dayWithReadings;

      // Load progress flags for this subscription
      const completedReadingIds = new Set(
        await this.subscriptionRepo.getCompletedReadingIds(subscription.id)
      );

      const readingsWithProgress: ReadingWithProgress[] = readings.map(reading => ({
        reading,
        isCompleted: completedReadingIds.has(reading.id),
      }));

      // Resolve study articles: curated tier (explicit titles) -> contextual tier (by bookId)
      let articles: StudyArticle[] = [];
      if (day.explicitArticleTitles && day.explicitArticleTitles.length > 0) {
        articles = await this.articleRepo.getArticlesByTitles([...day.explicitArticleTitles]);
      }

      if (articles.length === 0 && readings.length > 0) {
        const uniqueBookIds = Array.from(new Set(readings.map(r => r.bookId)));
        const bookArticlesNested = await Promise.all(
          uniqueBookIds.map(bookId => this.articleRepo.getArticlesByBook(bookId))
        );
        const seenIds = new Set<string>();
        for (const list of bookArticlesNested) {
          for (const article of list) {
            if (!seenIds.has(article.id)) {
              seenIds.add(article.id);
              articles.push(article);
            }
          }
        }
      }

      results.push({
        subscription,
        plan,
        day,
        readings: readingsWithProgress,
        articles,
      });
    }

    return results;
  }
}
