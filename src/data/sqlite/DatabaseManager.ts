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

export class BetterSqliteDatabaseAdapter implements ISQLiteDatabase {
  private db: any;
  private statementCache = new Map<string, any>();

  constructor(db: any) {
    this.db = db;
  }

  private getStatement(source: string): any {
    let stmt = this.statementCache.get(source);
    if (!stmt) {
      stmt = this.db.prepare(source);
      this.statementCache.set(source, stmt);
    }
    return stmt;
  }

  private normalizeParams(params: any[]): {
    isNamed: boolean;
    positional: any[];
    named?: Record<string, any>;
  } {
    if (params.length === 0) {
      return { isNamed: false, positional: [] };
    }
    if (params.length === 1) {
      const single = params[0];
      if (Array.isArray(single)) {
        return { isNamed: false, positional: single };
      }
      if (single !== null && typeof single === 'object') {
        return { isNamed: true, positional: [], named: single };
      }
      return { isNamed: false, positional: [single] };
    }
    return { isNamed: false, positional: params };
  }

  async execAsync(source: string): Promise<void> {
    this.db.exec(source);
  }

  async runAsync(source: string, ...params: any[]): Promise<SQLiteRunResult> {
    const norm = this.normalizeParams(params);
    const stmt = this.getStatement(source);
    const info = norm.isNamed ? stmt.run(norm.named) : stmt.run(...norm.positional);
    return {
      lastInsertRowId: Number(info.lastInsertRowid),
      changes: info.changes,
    };
  }

  async getFirstAsync<T>(source: string, ...params: any[]): Promise<T | null> {
    const norm = this.normalizeParams(params);
    const stmt = this.getStatement(source);
    const row = norm.isNamed ? stmt.get(norm.named) : stmt.get(...norm.positional);
    return (row ?? null) as T | null;
  }

  async getAllAsync<T>(source: string, ...params: any[]): Promise<T[]> {
    const norm = this.normalizeParams(params);
    const stmt = this.getStatement(source);
    const rows = norm.isNamed ? stmt.all(norm.named) : stmt.all(...norm.positional);
    return rows as T[];
  }

  async withTransactionAsync<T = void>(task: () => Promise<T>): Promise<T> {
    const isNested = this.db.inTransaction;
    const savepointName = `sp_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

    if (isNested) {
      this.db.exec(`SAVEPOINT ${savepointName}`);
      try {
        const result = await task();
        this.db.exec(`RELEASE SAVEPOINT ${savepointName}`);
        return result;
      } catch (error) {
        this.db.exec(`ROLLBACK TO SAVEPOINT ${savepointName}`);
        throw error;
      }
    } else {
      this.db.exec('BEGIN TRANSACTION');
      try {
        const result = await task();
        this.db.exec('COMMIT');
        return result;
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }
    }
  }

  async closeAsync(): Promise<void> {
    this.statementCache.clear();
    this.db.close();
  }
}

export class DatabaseManager {
  private static instance: ISQLiteDatabase | null = null;

  /**
   * Creates an isolated in-memory database with migrations executed and seed data loaded.
   * Perfect for unit and integration testing in Node/Jest.
   */
  static async createInMemory(): Promise<ISQLiteDatabase> {
    let db: ISQLiteDatabase;

    let expoSQLite: any = null;
    try {
      expoSQLite = require('expo-sqlite');
    } catch {
      // Node/Jest environment
    }

    if (expoSQLite?.openDatabaseAsync) {
      db = await expoSQLite.openDatabaseAsync(':memory:');
    } else {
      const BetterSqlite = require('better-sqlite3');
      const rawDb = new BetterSqlite(':memory:');
      db = new BetterSqliteDatabaseAdapter(rawDb);
    }

    await db.execAsync('PRAGMA foreign_keys = ON;');
    await runMigrations(db);
    await DatabaseManager.seed(db);

    return db;
  }

  /**
   * Initializes the database connection, runs migrations and populates seeds.
   */
  static async initialize(databaseName: string = 'planes_lectura.db'): Promise<ISQLiteDatabase> {
    if (DatabaseManager.instance) {
      return DatabaseManager.instance;
    }

    let db: ISQLiteDatabase;

    let expoSQLite: any = null;
    try {
      expoSQLite = require('expo-sqlite');
    } catch {
      // Node/Jest environment
    }

    if (expoSQLite?.openDatabaseAsync) {
      db = await expoSQLite.openDatabaseAsync(databaseName);
    } else {
      const BetterSqlite = require('better-sqlite3');
      const target =
        process.env.NODE_ENV === 'test' && databaseName === 'planes_lectura.db'
          ? ':memory:'
          : databaseName;
      const rawDb = new BetterSqlite(target);
      db = new BetterSqliteDatabaseAdapter(rawDb);
    }

    await db.execAsync('PRAGMA foreign_keys = ON;');
    await runMigrations(db);
    await DatabaseManager.seed(db);

    DatabaseManager.instance = db;
    return db;
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
