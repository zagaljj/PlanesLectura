import { ISQLiteDatabase } from '../sqlite/DatabaseManager';
import {
  PlanRepository,
  PlanDayWithReadings,
} from '../../domain/repositories/PlanRepository';
import {
  ReadingPlan,
  PlanArchetype,
  PlanDay,
  PlanReading,
} from '../../domain/entities';

export class SQLitePlanRepository implements PlanRepository {
  constructor(private readonly db: ISQLiteDatabase) {}

  private mapPlan(row: any): ReadingPlan {
    return new ReadingPlan({
      id: row.id,
      title: row.title,
      description: row.description,
      archetype: row.archetype as PlanArchetype,
      totalDays: row.total_days,
      isFeatured: Boolean(row.is_featured),
    });
  }

  private mapDay(row: any): PlanDay {
    let reflectionQuestions: string[] | undefined;
    if (row.reflection_questions) {
      try {
        reflectionQuestions = JSON.parse(row.reflection_questions);
      } catch {
        reflectionQuestions = undefined;
      }
    }

    let explicitArticleTitles: string[] | undefined;
    if (row.explicit_article_titles) {
      try {
        explicitArticleTitles = JSON.parse(row.explicit_article_titles);
      } catch {
        explicitArticleTitles = undefined;
      }
    }

    return new PlanDay({
      id: row.id,
      planId: row.plan_id,
      dayNumber: row.day_number,
      title: row.title ?? undefined,
      month: row.month ?? undefined,
      dayOfMonth: row.day_of_month ?? undefined,
      devotionalNotes: row.devotional_notes ?? undefined,
      reflectionQuestions,
      explicitArticleTitles,
    });
  }

  private mapReading(row: any): PlanReading {
    return new PlanReading({
      id: row.id,
      dayId: row.day_id,
      orderIndex: row.order_index,
      bookId: row.book_id,
      bookName: row.book_name,
      startChapter: row.start_chapter,
      startVerse: row.start_verse ?? undefined,
      endChapter: row.end_chapter,
      endVerse: row.end_verse ?? undefined,
      citationLabel: row.citation_label,
    });
  }

  async getAllPlans(): Promise<ReadingPlan[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT id, title, description, archetype, total_days, is_featured
       FROM reading_plans
       ORDER BY is_featured DESC, title ASC`
    );
    return rows.map(r => this.mapPlan(r));
  }

  async getPlanById(id: string): Promise<ReadingPlan | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT id, title, description, archetype, total_days, is_featured
       FROM reading_plans
       WHERE id = ?`,
      id
    );
    return row ? this.mapPlan(row) : null;
  }

  async getPlansByArchetype(archetype: PlanArchetype): Promise<ReadingPlan[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT id, title, description, archetype, total_days, is_featured
       FROM reading_plans
       WHERE archetype = ?
       ORDER BY is_featured DESC, title ASC`,
      archetype
    );
    return rows.map(r => this.mapPlan(r));
  }

  async getDaysForPlan(planId: string): Promise<PlanDay[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT id, plan_id, day_number, title, month, day_of_month, devotional_notes, reflection_questions, explicit_article_titles
       FROM plan_days
       WHERE plan_id = ?
       ORDER BY day_number ASC`,
      planId
    );
    return rows.map(r => this.mapDay(r));
  }

  async getDayByPlanAndNumber(planId: string, dayNumber: number): Promise<PlanDay | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT id, plan_id, day_number, title, month, day_of_month, devotional_notes, reflection_questions, explicit_article_titles
       FROM plan_days
       WHERE plan_id = ? AND day_number = ?`,
      planId,
      dayNumber
    );
    return row ? this.mapDay(row) : null;
  }

  async getReadingsForDay(dayId: string): Promise<PlanReading[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT id, day_id, order_index, book_id, book_name, start_chapter, start_verse, end_chapter, end_verse, citation_label
       FROM plan_readings
       WHERE day_id = ?
       ORDER BY order_index ASC`,
      dayId
    );
    return rows.map(r => this.mapReading(r));
  }

  async getDaysWithReadingsForPlan(planId: string): Promise<PlanDayWithReadings[]> {
    const days = await this.getDaysForPlan(planId);
    if (days.length === 0) {
      return [];
    }

    const readingsRows = await this.db.getAllAsync<any>(
      `SELECT r.* FROM plan_readings r
       INNER JOIN plan_days d ON r.day_id = d.id
       WHERE d.plan_id = ?
       ORDER BY d.day_number ASC, r.order_index ASC`,
      planId
    );

    const readingsByDayId = new Map<string, PlanReading[]>();
    for (const row of readingsRows) {
      const reading = this.mapReading(row);
      let list = readingsByDayId.get(reading.dayId);
      if (!list) {
        list = [];
        readingsByDayId.set(reading.dayId, list);
      }
      list.push(reading);
    }

    return days.map(day => ({
      day,
      readings: readingsByDayId.get(day.id) ?? [],
    }));
  }

  async getDayWithReadings(planId: string, dayNumber: number): Promise<PlanDayWithReadings | null> {
    const day = await this.getDayByPlanAndNumber(planId, dayNumber);
    if (!day) {
      return null;
    }
    const readings = await this.getReadingsForDay(day.id);
    return { day, readings };
  }
}
