import Database from 'better-sqlite3';
import { ISQLiteDatabase, SQLiteRunResult } from '../../src/data/sqlite/migrations';

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

export async function openDatabaseAsync(databaseName: string): Promise<ISQLiteDatabase> {
  const target =
    databaseName === ':memory:' || process.env.NODE_ENV === 'test' ? ':memory:' : databaseName;
  const rawDb = new Database(target);
  return new BetterSqliteDatabaseAdapter(rawDb);
}
