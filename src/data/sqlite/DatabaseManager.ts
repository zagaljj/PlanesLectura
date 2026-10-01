import * as SQLite from 'expo-sqlite';
import { ISQLiteDatabase, SQLiteRunResult, runMigrations } from './migrations';

export type { ISQLiteDatabase, SQLiteRunResult };

export interface RawPlanData {
  plan: {
    id: string;
    title: string;
    description: string;
    archetype: 'annual' | 'monthly' | 'thematic';
    totalDays: number;
    isFeatured?: boolean;
  };
  days: Array<{
    id: string;
    planId: string;
    dayNumber: number;
    title?: string;
    month?: number;
    dayOfMonth?: number;
    devotionalNotes?: string;
    reflectionQuestions?: string[];
    explicitArticleTitles?: string[];
    readings?: Array<{
      id: string;
      dayId: string;
      orderIndex: number;
      bookId: string;
      bookName: string;
      startChapter: number;
      startVerse?: number;
      endChapter: number;
      endVerse?: number;
      citationLabel: string;
    }>;
  }>;
}

// Statically bundle the 5 seed plans
const chronologicalPlan: RawPlanData = require('../../../assets/data/plans/chronological.json');
const mccheynePlan: RawPlanData = require('../../../assets/data/plans/mccheyne.json');
const passoverPlan: RawPlanData = require('../../../assets/data/plans/passover.json');
const pentecostPlan: RawPlanData = require('../../../assets/data/plans/pentecost.json');
const uedPlan: RawPlanData = require('../../../assets/data/plans/ued.json');

export const SEED_PLANS: RawPlanData[] = [
  chronologicalPlan,
  mccheynePlan,
  passoverPlan,
  pentecostPlan,
  uedPlan,
];

export class DatabaseManager {
  private static instance: ISQLiteDatabase | null = null;

  /**
   * Creates an isolated in-memory database with migrations executed and seed data loaded.
   * Perfect for unit and integration testing in Node/Jest.
   */
  static async createInMemory(seedBible: boolean = false): Promise<ISQLiteDatabase> {
    const db = (await SQLite.openDatabaseAsync(':memory:')) as unknown as ISQLiteDatabase;

    await db.execAsync('PRAGMA foreign_keys = ON;');
    await runMigrations(db);
    await DatabaseManager.seed(db);
    if (seedBible) {
      await DatabaseManager.seedBible(db);
    }

    return db;
  }

  /**
   * Initializes the database connection, runs migrations and populates seeds.
   */
  static async initialize(databaseName: string = 'planes_lectura.db'): Promise<ISQLiteDatabase> {
    if (DatabaseManager.instance) {
      return DatabaseManager.instance;
    }

    const db = (await SQLite.openDatabaseAsync(databaseName)) as unknown as ISQLiteDatabase;

    await db.execAsync('PRAGMA foreign_keys = ON;');
    await runMigrations(db);
    await DatabaseManager.seed(db);
    await DatabaseManager.seedBible(db);

    DatabaseManager.instance = db;
    return db;
  }

  /**
   * Seeds all 31,104 verses of Reina-Valera 1960 into the bible_verses table.
   * Skips execution if verses already exist in the database.
   */
  static async seedBible(
    db: ISQLiteDatabase,
    bibleData?: Record<string, string[][]>
  ): Promise<void> {
    const existing = await db.getFirstAsync<{ count: number }>(
      'SELECT count(*) as count FROM bible_verses'
    );
    if (existing && existing.count > 0) {
      return;
    }

    const data: Record<string, string[][]> =
      bibleData || require('../../../assets/data/bible/rvr1960.json');

    await db.withTransactionAsync(async () => {
      for (const [bookId, chapters] of Object.entries(data)) {
        for (let chIdx = 0; chIdx < chapters.length; chIdx++) {
          const chapterNum = chIdx + 1;
          const verses = chapters[chIdx];
          for (let vIdx = 0; vIdx < verses.length; vIdx++) {
            const verseNum = vIdx + 1;
            const text = verses[vIdx];
            await db.runAsync(
              `INSERT OR IGNORE INTO bible_verses (book_id, chapter, verse, verse_text)
               VALUES (?, ?, ?, ?)`,
              bookId,
              chapterNum,
              verseNum,
              text
            );
          }
        }
      }
    });
  }

  /**
   * Returns the initialized database singleton.
   */
  static async getDatabase(databaseName: string = 'planes_lectura.db'): Promise<ISQLiteDatabase> {
    if (!DatabaseManager.instance) {
      await DatabaseManager.initialize(databaseName);
    }
    return DatabaseManager.instance!;
  }

  /**
   * Resets the singleton instance (primarily for test teardown).
   */
  static async resetInstance(): Promise<void> {
    if (DatabaseManager.instance) {
      await DatabaseManager.instance.closeAsync();
      DatabaseManager.instance = null;
    }
  }

  /**
   * Seeds all reading plans, plan days, and plan readings in an atomic transaction.
   * Uses INSERT OR IGNORE for idempotency.
   */
  static async seed(db: ISQLiteDatabase, plans: RawPlanData[] = SEED_PLANS): Promise<void> {
    await db.withTransactionAsync(async () => {
      for (const data of plans) {
        const plan = data.plan;
        await db.runAsync(
          `INSERT OR IGNORE INTO reading_plans (id, title, description, archetype, total_days, is_featured, created_at)
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          plan.id,
          plan.title,
          plan.description,
          plan.archetype,
          plan.totalDays,
          plan.isFeatured ? 1 : 0
        );

        for (const day of data.days) {
          await db.runAsync(
            `INSERT OR IGNORE INTO plan_days (id, plan_id, day_number, title, month, day_of_month, devotional_notes, reflection_questions, explicit_article_titles)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            day.id,
            day.planId,
            day.dayNumber,
            day.title ?? null,
            day.month ?? null,
            day.dayOfMonth ?? null,
            day.devotionalNotes ?? null,
            day.reflectionQuestions ? JSON.stringify(day.reflectionQuestions) : null,
            day.explicitArticleTitles ? JSON.stringify(day.explicitArticleTitles) : null
          );

          if (day.readings) {
            for (const reading of day.readings) {
              await db.runAsync(
                `INSERT OR IGNORE INTO plan_readings (id, day_id, order_index, book_id, book_name, start_chapter, start_verse, end_chapter, end_verse, citation_label)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                reading.id,
                reading.dayId,
                reading.orderIndex,
                reading.bookId,
                reading.bookName,
                reading.startChapter,
                reading.startVerse ?? null,
                reading.endChapter,
                reading.endVerse ?? null,
                reading.citationLabel
              );
            }
          }
        }
      }
    });
  }
}
