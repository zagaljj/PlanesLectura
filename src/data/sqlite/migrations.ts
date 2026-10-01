import { INITIAL_SCHEMA_STATEMENTS } from './schema';

export interface SQLiteRunResult {
  lastInsertRowId: number;
  changes: number;
}

export interface ISQLiteDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: any[]): Promise<SQLiteRunResult>;
  getFirstAsync<T>(source: string, ...params: any[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: any[]): Promise<T[]>;
  withTransactionAsync<T = void>(task: () => Promise<T>): Promise<T>;
  closeAsync(): Promise<void>;
}

export interface Migration {
  version: number;
  description: string;
  up: (db: ISQLiteDatabase) => Promise<void>;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description:
      'Initial schema: reading_plans, user_plan_subscriptions, plan_days, plan_readings, user_reading_progress, bible_verses, study_articles',
    up: async (db: ISQLiteDatabase) => {
      for (const statement of INITIAL_SCHEMA_STATEMENTS) {
        await db.execAsync(statement);
      }
    },
  },
];

export async function getCurrentUserVersion(db: ISQLiteDatabase): Promise<number> {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return result?.user_version ?? 0;
}

export async function runMigrations(db: ISQLiteDatabase): Promise<void> {
  // Ensure foreign keys are enabled before migrations
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const currentVersion = await getCurrentUserVersion(db);

  const pendingMigrations = MIGRATIONS.filter((m) => m.version > currentVersion).sort(
    (a, b) => a.version - b.version
  );

  for (const migration of pendingMigrations) {
    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.execAsync(`PRAGMA user_version = ${migration.version};`);
    });
  }
}
