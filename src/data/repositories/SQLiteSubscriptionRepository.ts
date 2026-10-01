import { ISQLiteDatabase } from '../sqlite/DatabaseManager';
import {
  SubscriptionRepository,
  SubscriptionProgress,
} from '../../domain/repositories/SubscriptionRepository';
import { PlanSubscription } from '../../domain/entities';

function generateId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 9);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${rand}`;
}

export class SQLiteSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly db: ISQLiteDatabase) {}

  private mapSubscription(row: any): PlanSubscription {
    return new PlanSubscription({
      id: row.id,
      planId: row.plan_id,
      startedAt: row.started_at,
      isActive: Boolean(row.is_active),
      currentDayNumber: row.current_day_number,
    });
  }

  async subscribe(planId: string, startingDayNumber: number = 1): Promise<PlanSubscription> {
    const existing = await this.getSubscriptionByPlanId(planId);
    if (existing) {
      if (!existing.isActive) {
        await this.db.runAsync(
          `UPDATE user_plan_subscriptions SET is_active = 1 WHERE id = ?`,
          existing.id
        );
        return existing.withActive(true);
      }
      return existing;
    }

    const id = generateId('sub');
    await this.db.runAsync(
      `INSERT INTO user_plan_subscriptions (id, plan_id, started_at, is_active, current_day_number)
       VALUES (?, ?, CURRENT_TIMESTAMP, 1, ?)`,
      id,
      planId,
      startingDayNumber
    );

    const created = await this.getSubscriptionById(id);
    if (!created) {
      throw new Error(`Failed to create subscription for plan ${planId}`);
    }
    return created;
  }

  async unsubscribe(idOrPlanId: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE user_plan_subscriptions SET is_active = 0 WHERE id = ? OR plan_id = ?`,
      idOrPlanId,
      idOrPlanId
    );
  }

  async getActiveSubscriptions(): Promise<PlanSubscription[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT id, plan_id, started_at, is_active, current_day_number
       FROM user_plan_subscriptions
       WHERE is_active = 1
       ORDER BY started_at DESC`
    );
    return rows.map(r => this.mapSubscription(r));
  }

  async getAllSubscriptions(): Promise<PlanSubscription[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT id, plan_id, started_at, is_active, current_day_number
       FROM user_plan_subscriptions
       ORDER BY started_at DESC`
    );
    return rows.map(r => this.mapSubscription(r));
  }

  async getSubscriptionById(id: string): Promise<PlanSubscription | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT id, plan_id, started_at, is_active, current_day_number
       FROM user_plan_subscriptions
       WHERE id = ?`,
      id
    );
    return row ? this.mapSubscription(row) : null;
  }

  async getSubscriptionByPlanId(planId: string): Promise<PlanSubscription | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT id, plan_id, started_at, is_active, current_day_number
       FROM user_plan_subscriptions
       WHERE plan_id = ?`,
      planId
    );
    return row ? this.mapSubscription(row) : null;
  }

  async updateCurrentDay(subscriptionId: string, dayNumber: number): Promise<void> {
    await this.db.runAsync(
      `UPDATE user_plan_subscriptions SET current_day_number = ? WHERE id = ?`,
      dayNumber,
      subscriptionId
    );
  }

  async markReadingComplete(subscriptionId: string, readingId: string): Promise<void> {
    const id = generateId('prog');
    await this.db.runAsync(
      `INSERT INTO user_reading_progress (id, subscription_id, reading_id, is_completed, completed_at)
       VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
       ON CONFLICT(subscription_id, reading_id)
       DO UPDATE SET is_completed = 1, completed_at = CURRENT_TIMESTAMP`,
      id,
      subscriptionId,
      readingId
    );
  }

  async unmarkReading(subscriptionId: string, readingId: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE user_reading_progress SET is_completed = 0 WHERE subscription_id = ? AND reading_id = ?`,
      subscriptionId,
      readingId
    );
  }

  async isReadingCompleted(subscriptionId: string, readingId: string): Promise<boolean> {
    const row = await this.db.getFirstAsync<{ is_completed: number }>(
      `SELECT is_completed FROM user_reading_progress WHERE subscription_id = ? AND reading_id = ?`,
      subscriptionId,
      readingId
    );
    return row ? Boolean(row.is_completed) : false;
  }

  async getCompletedReadingIds(subscriptionId: string): Promise<string[]> {
    const rows = await this.db.getAllAsync<{ reading_id: string }>(
      `SELECT reading_id FROM user_reading_progress WHERE subscription_id = ? AND is_completed = 1`,
      subscriptionId
    );
    return rows.map(r => r.reading_id);
  }

  async getProgressForSubscription(subscriptionId: string): Promise<SubscriptionProgress> {
    const sub = await this.getSubscriptionById(subscriptionId);
    if (!sub) {
      return {
        subscriptionId,
        completedReadingIds: [],
        totalReadingsCount: 0,
        completedReadingsCount: 0,
        percentage: 0,
      };
    }

    const completedReadingIds = await this.getCompletedReadingIds(subscriptionId);

    const totalRow = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(r.id) as count
       FROM plan_readings r
       INNER JOIN plan_days d ON r.day_id = d.id
       WHERE d.plan_id = ?`,
      sub.planId
    );

    const totalReadingsCount = totalRow?.count ?? 0;
    const completedReadingsCount = completedReadingIds.length;
    const percentage =
      totalReadingsCount > 0
        ? Math.round((completedReadingsCount / totalReadingsCount) * 100)
        : 0;

    return {
      subscriptionId,
      completedReadingIds,
      totalReadingsCount,
      completedReadingsCount,
      percentage,
    };
  }
}
