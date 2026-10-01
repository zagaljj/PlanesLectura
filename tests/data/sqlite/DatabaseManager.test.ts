import { DatabaseManager } from '../../../src/data/sqlite/DatabaseManager';

describe('DatabaseManager', () => {
  it('should create all required tables on initialization', async () => {
    const db = await DatabaseManager.createInMemory();
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    const tableNames = tables.map((t: { name: string }) => t.name);

    expect(tableNames).toContain('reading_plans');
    expect(tableNames).toContain('plan_days');
    expect(tableNames).toContain('plan_readings');
    expect(tableNames).toContain('user_plan_subscriptions');
    expect(tableNames).toContain('user_reading_progress');
    expect(tableNames).toContain('bible_verses');
    expect(tableNames).toContain('study_articles');
  });

  it('should enable foreign keys and set user_version', async () => {
    const db = await DatabaseManager.createInMemory();

    const fkResult = await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
    expect(fkResult?.foreign_keys).toBe(1);

    const versionResult = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(versionResult?.user_version).toBeGreaterThanOrEqual(1);
  });

  it('should seed all 5 plans from JSON assets', async () => {
    const db = await DatabaseManager.createInMemory();

    const plans = await db.getAllAsync<{ id: string; archetype: string; total_days: number }>(
      'SELECT id, archetype, total_days FROM reading_plans ORDER BY id'
    );
    expect(plans).toHaveLength(5);

    const planIds = plans.map((p: { id: string }) => p.id);
    expect(planIds).toContain('chronological');
    expect(planIds).toContain('mccheyne');
    expect(planIds).toContain('passover');
    expect(planIds).toContain('pentecost');
    expect(planIds).toContain('ued-september-2026');

    const totalDays = await db.getFirstAsync<{ count: number }>(
      'SELECT count(*) as count FROM plan_days'
    );
    expect(totalDays?.count).toBe(773);

    const totalReadings = await db.getFirstAsync<{ count: number }>(
      'SELECT count(*) as count FROM plan_readings'
    );
    expect(totalReadings?.count).toBe(1946);
  });

  it('should correctly store and serialize thematic plan metadata', async () => {
    const db = await DatabaseManager.createInMemory();

    const pentecostDay1 = await db.getFirstAsync<{
      id: string;
      title: string;
      devotional_notes: string;
      reflection_questions: string;
      explicit_article_titles: string;
    }>("SELECT * FROM plan_days WHERE id = 'pentecost-day-1'");

    expect(pentecostDay1).not.toBeNull();
    expect(pentecostDay1?.title).toContain('Día 1');
    expect(pentecostDay1?.devotional_notes).toBe('Los discípulos se reúnen en la fiesta de Pentecostés');

    const questions = JSON.parse(pentecostDay1!.reflection_questions);
    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBe(4);

    const articles = JSON.parse(pentecostDay1!.explicit_article_titles);
    expect(Array.isArray(articles)).toBe(true);
    expect(articles).toContain('¿Qué es hablar en lenguas?');
  });

  it('should be idempotent and not duplicate data if re-seeded', async () => {
    const db = await DatabaseManager.createInMemory();

    // Re-run seeding
    await DatabaseManager.seed(db);

    const planCount = await db.getFirstAsync<{ count: number }>(
      'SELECT count(*) as count FROM reading_plans'
    );
    expect(planCount?.count).toBe(5);

    const dayCount = await db.getFirstAsync<{ count: number }>(
      'SELECT count(*) as count FROM plan_days'
    );
    expect(dayCount?.count).toBe(773);
  });

  it('should enforce cascade deletion when a plan is deleted', async () => {
    const db = await DatabaseManager.createInMemory();

    // Delete the passover plan
    await db.runAsync("DELETE FROM reading_plans WHERE id = 'passover'");

    const orphanedDays = await db.getAllAsync(
      "SELECT * FROM plan_days WHERE plan_id = 'passover'"
    );
    expect(orphanedDays).toHaveLength(0);

    const orphanedReadings = await db.getAllAsync(
      "SELECT * FROM plan_readings WHERE day_id LIKE 'passover-%'"
    );
    expect(orphanedReadings).toHaveLength(0);
  });

  it('should enforce cascade deletion for user subscriptions and reading progress', async () => {
    const db = await DatabaseManager.createInMemory();

    // Insert a subscription
    await db.runAsync(
      "INSERT INTO user_plan_subscriptions (id, plan_id, started_at, is_active, current_day_number) VALUES (?, ?, ?, ?, ?)",
      'sub-test-1',
      'chronological',
      '2026-10-01T00:00:00Z',
      1,
      1
    );

    // Insert reading progress
    await db.runAsync(
      "INSERT INTO user_reading_progress (id, subscription_id, reading_id, is_completed) VALUES (?, ?, ?, ?)",
      'prog-test-1',
      'sub-test-1',
      'chronological-day-1-reading-0',
      1
    );

    const progressBefore = await db.getAllAsync(
      "SELECT * FROM user_reading_progress WHERE subscription_id = 'sub-test-1'"
    );
    expect(progressBefore).toHaveLength(1);

    // Delete subscription -> should cascade to progress
    await db.runAsync("DELETE FROM user_plan_subscriptions WHERE id = 'sub-test-1'");

    const progressAfter = await db.getAllAsync(
      "SELECT * FROM user_reading_progress WHERE subscription_id = 'sub-test-1'"
    );
    expect(progressAfter).toHaveLength(0);
  });

  it('should rollback transaction on failure and commit on success', async () => {
    const db = await DatabaseManager.createInMemory();

    // Successful transaction
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "INSERT INTO user_plan_subscriptions (id, plan_id, started_at, is_active, current_day_number) VALUES (?, ?, ?, ?, ?)",
        'sub-tx-success',
        'pentecost',
        '2026-10-01T00:00:00Z',
        1,
        1
      );
    });

    const successSub = await db.getFirstAsync(
      "SELECT * FROM user_plan_subscriptions WHERE id = 'sub-tx-success'"
    );
    expect(successSub).not.toBeNull();

    // Failing transaction
    await expect(
      db.withTransactionAsync(async () => {
        await db.runAsync(
          "INSERT INTO user_plan_subscriptions (id, plan_id, started_at, is_active, current_day_number) VALUES (?, ?, ?, ?, ?)",
          'sub-tx-fail',
          'pentecost',
          '2026-10-01T00:00:00Z',
          1,
          1
        );
        throw new Error('Forced transaction failure');
      })
    ).rejects.toThrow('Forced transaction failure');

    const failedSub = await db.getFirstAsync(
      "SELECT * FROM user_plan_subscriptions WHERE id = 'sub-tx-fail'"
    );
    expect(failedSub).toBeNull();
  });

  it('should support singleton getDatabase and resetInstance', async () => {
    await DatabaseManager.resetInstance();

    const db1 = await DatabaseManager.getDatabase(':memory:');
    const db2 = await DatabaseManager.getDatabase(':memory:');
    expect(db1).toBe(db2);

    await DatabaseManager.resetInstance();
    const db3 = await DatabaseManager.getDatabase(':memory:');
    expect(db3).not.toBe(db1);

    await DatabaseManager.resetInstance();
  });
});

