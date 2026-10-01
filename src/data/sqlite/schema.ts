export const TABLES = {
  READING_PLANS: 'reading_plans',
  USER_PLAN_SUBSCRIPTIONS: 'user_plan_subscriptions',
  PLAN_DAYS: 'plan_days',
  PLAN_READINGS: 'plan_readings',
  USER_READING_PROGRESS: 'user_reading_progress',
  BIBLE_VERSES: 'bible_verses',
  STUDY_ARTICLES: 'study_articles',
} as const;

export const CREATE_READING_PLANS_TABLE = `
CREATE TABLE IF NOT EXISTS reading_plans (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    archetype TEXT NOT NULL CHECK(archetype IN ('annual', 'monthly', 'thematic')),
    total_days INTEGER NOT NULL,
    is_featured INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

export const CREATE_USER_PLAN_SUBSCRIPTIONS_TABLE = `
CREATE TABLE IF NOT EXISTS user_plan_subscriptions (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER NOT NULL DEFAULT 1,
    current_day_number INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(plan_id) REFERENCES reading_plans(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_subs_active ON user_plan_subscriptions(is_active);
`;

export const CREATE_PLAN_DAYS_TABLE = `
CREATE TABLE IF NOT EXISTS plan_days (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    day_number INTEGER NOT NULL,
    title TEXT NULL,
    month INTEGER NULL,
    day_of_month INTEGER NULL,
    devotional_notes TEXT NULL,
    reflection_questions TEXT NULL,
    explicit_article_titles TEXT NULL,
    FOREIGN KEY(plan_id) REFERENCES reading_plans(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_plan_days_lookup ON plan_days(plan_id, day_number);
`;

export const CREATE_PLAN_READINGS_TABLE = `
CREATE TABLE IF NOT EXISTS plan_readings (
    id TEXT PRIMARY KEY,
    day_id TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    book_id TEXT NOT NULL,
    book_name TEXT NOT NULL,
    start_chapter INTEGER NOT NULL,
    start_verse INTEGER NULL,
    end_chapter INTEGER NOT NULL,
    end_verse INTEGER NULL,
    citation_label TEXT NOT NULL,
    FOREIGN KEY(day_id) REFERENCES plan_days(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_readings_day ON plan_readings(day_id, order_index);
`;

export const CREATE_USER_READING_PROGRESS_TABLE = `
CREATE TABLE IF NOT EXISTS user_reading_progress (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL,
    reading_id TEXT NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 1,
    completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(subscription_id) REFERENCES user_plan_subscriptions(id) ON DELETE CASCADE,
    FOREIGN KEY(reading_id) REFERENCES plan_readings(id) ON DELETE CASCADE,
    UNIQUE(subscription_id, reading_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_sub ON user_reading_progress(subscription_id);
`;

export const CREATE_BIBLE_VERSES_TABLE = `
CREATE TABLE IF NOT EXISTS bible_verses (
    book_id TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    verse_text TEXT NOT NULL,
    PRIMARY KEY(book_id, chapter, verse)
);
CREATE INDEX IF NOT EXISTS idx_bible_lookup ON bible_verses(book_id, chapter);
`;

export const CREATE_STUDY_ARTICLES_TABLE = `
CREATE TABLE IF NOT EXISTS study_articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    book_id TEXT NULL,
    section TEXT NOT NULL,
    last_synced_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_study_articles_book ON study_articles(book_id);
`;

export const INITIAL_SCHEMA_STATEMENTS = [
  CREATE_READING_PLANS_TABLE,
  CREATE_USER_PLAN_SUBSCRIPTIONS_TABLE,
  CREATE_PLAN_DAYS_TABLE,
  CREATE_PLAN_READINGS_TABLE,
  CREATE_USER_READING_PROGRESS_TABLE,
  CREATE_BIBLE_VERSES_TABLE,
  CREATE_STUDY_ARTICLES_TABLE,
];
