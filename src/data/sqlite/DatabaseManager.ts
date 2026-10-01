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
  private static initPromise: Promise<ISQLiteDatabase> | null = null;

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
   * Uses an in-flight promise mutex to prevent concurrent initialization collisions.
   * Includes automatic self-healing recovery if the database file is locked by an orphaned process.
   */
  static async initialize(databaseName: string = 'planes_lectura_v2.db'): Promise<ISQLiteDatabase> {
    if (DatabaseManager.instance) {
      return DatabaseManager.instance;
    }

    if (DatabaseManager.initPromise) {
      return DatabaseManager.initPromise;
    }

    DatabaseManager.initPromise = (async () => {
      try {
        return await DatabaseManager.openAndSetupDatabase(databaseName);
      } catch (error: any) {
        // Self-healing: if database is locked or corrupted by an orphaned native process, delete and recreate cleanly
        const isLockError =
          error?.message &&
          (error.message.includes('locked') ||
            error.message.includes('busy') ||
            error.message.includes('finalizedAsync') ||
            error.message.includes('execAsync'));

        if (isLockError && databaseName !== ':memory:') {
          console.warn(
            `[DatabaseManager] Database "${databaseName}" encountered lock error (${error.message}). Attempting cleanup and fresh re-initialization...`
          );
          try {
            if (typeof (SQLite as any).deleteDatabaseAsync === 'function') {
              await (SQLite as any).deleteDatabaseAsync(databaseName);
            }
            return await DatabaseManager.openAndSetupDatabase(databaseName);
          } catch (retryError) {
            console.error('[DatabaseManager] Failed to recover locked database:', retryError);
          }
        }

        DatabaseManager.initPromise = null;
        throw error;
      }
    })();

    return DatabaseManager.initPromise;
  }

  /**
   * Opens the SQLite database file and configures busy timeouts, WAL journal, schema migrations, and seeds.
   */
  private static async openAndSetupDatabase(databaseName: string): Promise<ISQLiteDatabase> {
    const db = (await SQLite.openDatabaseAsync(databaseName)) as unknown as ISQLiteDatabase;

    if (databaseName !== ':memory:') {
      // 1. Set busy_timeout first so SQLite waits up to 10s for any transient locks instead of failing immediately
      try {
        await db.execAsync('PRAGMA busy_timeout = 10000;');
      } catch (e) {
        console.warn('[DatabaseManager] Could not set busy_timeout:', e);
      }

      // 2. Enable Write-Ahead Logging (WAL) for concurrent read/write support
      try {
        await db.execAsync('PRAGMA journal_mode = WAL;');
      } catch (e) {
        console.warn('[DatabaseManager] WAL mode not supported or locked, continuing:', e);
      }
    }

    await db.execAsync('PRAGMA foreign_keys = ON;');

    await runMigrations(db);
    await DatabaseManager.seed(db);

    try {
      await DatabaseManager.seedBible(db);
    } catch (bibleErr) {
      console.warn('[DatabaseManager] Non-fatal warning during bible seeding:', bibleErr);
    }

    DatabaseManager.instance = db;
    return db;
  }

  /**
   * Seeds all 31,104 verses of Reina-Valera 1960 into the bible_verses table using batch inserts.
   * Skips execution if verses already exist in the database.
   */
  static async seedBible(
    db: ISQLiteDatabase,
    bibleData?: Record<string, string[][]>
  ): Promise<void> {
    const existing = await db.getFirstAsync<{ count: number }>(
      'SELECT count(*) as count FROM bible_verses'
    );
    if (existing && existing.count >= 31100) {
      return;
    }

    const data: Record<string, string[][]> =
      bibleData || require('../../../assets/data/bible/rvr1960.json');

    const BATCH_SIZE = 200;
    const rows: Array<[string, number, number, string]> = [];

    for (const [bookId, chapters] of Object.entries(data)) {
      for (let chIdx = 0; chIdx < chapters.length; chIdx++) {
        const chapterNum = chIdx + 1;
        const verses = chapters[chIdx];
        if (!verses) continue;
        for (let vIdx = 0; vIdx < verses.length; vIdx++) {
          rows.push([bookId, chapterNum, vIdx + 1, verses[vIdx]]);
        }
      }
    }

    await db.withTransactionAsync(async () => {
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const placeholders = batch.map(() => '(?, ?, ?, ?)').join(', ');
        const values: any[] = [];
        for (const row of batch) {
          values.push(row[0], row[1], row[2], row[3]);
        }
        await db.runAsync(
          `INSERT OR IGNORE INTO bible_verses (book_id, chapter, verse, verse_text) VALUES ${placeholders}`,
          ...values
        );
      }
    });
  }

  /**
   * Returns the initialized database singleton.
   */
  static async getDatabase(databaseName: string = 'planes_lectura_v2.db'): Promise<ISQLiteDatabase> {
    if (DatabaseManager.instance) {
      return DatabaseManager.instance;
    }
    return DatabaseManager.initialize(databaseName);
  }

  /**
   * Resets the singleton instance (primarily for test teardown).
   */
  static async resetInstance(): Promise<void> {
    if (DatabaseManager.instance) {
      await DatabaseManager.instance.closeAsync();
      DatabaseManager.instance = null;
    }
    DatabaseManager.initPromise = null;
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
