# Bible Reading Plans Mobile App — Architectural Design Specification

## 1. Overview & Business Intent

The goal of this project is to build an offline-first mobile application in React Native (using Expo and SQLite) that guides users through structured daily Bible reading plans, accompanied by contextual study articles from *Vida, Esperanza y Verdad* (`vidaesperanzayverdad.org`).

The initial release focuses on the **1-Year Chronological Bible Reading Plan**, sourced from the Church of God, a Worldwide Association (`Programa_cronologico_de_la_biblia.pdf`). The app provides instant local passage reading, tracking of daily reading progress, and non-blocking background discovery of relevant study articles.

### Success Criteria
- **Zero-Latency Offline Reading:** All biblical texts and plan schedules are stored in local SQLite; zero network requests are needed to read or mark progress.
- **Zero Onboarding Friction:** No authentication, user account, or server registration required for the MVP.
- **Dynamic Content Freshness:** Study articles are synchronized in the background from the live `vidaesperanzayverdad.org/sitemap.xml` using the Stale-While-Revalidate pattern, with a direct search fallback.
- **Clean Architecture:** Domain logic is isolated from UI components and the SQLite storage engine, enabling straightforward addition of a remote admin panel in future phases.

---

## 2. System Architecture & Boundaries

The application follows Clean Architecture principles, divided into three isolated layers:

```
+-------------------------------------------------------------------+
|                        Presentation Layer                         |
|     (Expo Router / Screens: Today, Plan Calendar, Reader, Config)  |
+-------------------------------------------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                           Domain Layer                            |
|        (Entities, Value Objects, Use Cases, Repository Contracts) |
+-------------------------------------------------------------------+
                                  ^
                                  |
+-------------------------------------------------------------------+
|                            Data Layer                             |
|  (Expo SQLite Repositories, PDF Plan Ingestion, SitemapSyncService)|
+-------------------------------------------------------------------+
```

### 2.1 Domain Layer
- **Entities & Value Objects:**
  - `ReadingPlan`: Represents a curated plan (ID, title, description, total days, active status).
  - `PlanDay`: A single day (1..365, month, day of month, completion timestamp).
  - `PlanReading`: A single scriptural segment assigned to a day (book, start chapter, start verse, end chapter, end verse, human citation label).
  - `BibleVerse`: Individual canonical verse (book ID, chapter, verse, text).
  - `StudyArticle`: Canonical article metadata from *Vida, Esperanza y Verdad* (ID, title, URL, associated book tag, last synced date).
- **Use Cases:**
  - `GetTodayReadingUseCase`: Retrieves the scheduled reading for today's calendar date or current plan progression.
  - `ToggleReadingProgressUseCase`: Marks a day or specific passage as completed/uncompleted and updates timestamps.
  - `GetPassageVersesUseCase`: Queries SQLite for the full verse text for the day's readings.
  - `GetArticlesForPassageUseCase`: Queries cached study articles associated with the active reading's biblical book.
  - `SyncArticlesDeltaUseCase`: Downloads and parses latest entries from `vidaesperanzayverdad.org/sitemap.xml`.

### 2.2 Data Layer
- **SQLite Engine (`expo-sqlite`):** Native embedded relational database handling verses, plan schedule, progress, and article catalog.
- **Repositories:**
  - `SQLiteBibleRepository` implementing `BibleRepository`.
  - `SQLitePlanRepository` implementing `PlanRepository`.
  - `SQLiteArticleRepository` implementing `ArticleRepository`.
- **Services:**
  - `PDFPlanIngestionService`: Node/TS build-time tool extracting daily citations from `Programa_cronologico_de_la_biblia.pdf` into `chronological_plan_seed.json`.
  - `SitemapSyncService`: Client-side background worker fetching remote XML sitemaps, extracting `/biblia/` URLs, mapping book slugs, and upserting into SQLite.

### 2.3 Presentation Layer
- **Stack & Routing:** Expo Router (`app/` directory) with a bottom navigation bar:
  - `/(tabs)/today`: The central dashboard displaying today's date, assigned reading block(s), completion toggle, and related study article cards.
  - `/(tabs)/calendar`: Year overview (12 months / 365 days) displaying progress indicators, completed days, and jump-to-date capability.
  - `/(tabs)/reader`: Focused typography screen rendering the biblical text for selected chapters, supporting font size adjustment and seamless multi-passage scrolling.
  - `/(tabs)/settings`: Application information, cache management, and a manual "Sync Study Articles Now" button.
- **External Web Reader:** Uses `expo-web-browser` to display selected articles inside in-app Safari View Controller (iOS) and Chrome Custom Tabs (Android).

---

## 3. SQLite Database Schema

The database uses SQLite versioning (`PRAGMA user_version`) with migrations executed during bootstrap.

```sql
-- 1. Reading Plans
CREATE TABLE IF NOT EXISTS reading_plans (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    total_days INTEGER NOT NULL DEFAULT 365,
    is_active INTEGER NOT NULL DEFAULT 1
);

-- 2. Plan Days
CREATE TABLE IF NOT EXISTS plan_days (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    day_number INTEGER NOT NULL,          -- 1 to 365
    month INTEGER NOT NULL,               -- 1 to 12
    day_of_month INTEGER NOT NULL,        -- 1 to 31
    is_completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT NULL,
    FOREIGN KEY(plan_id) REFERENCES reading_plans(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_plan_days_lookup ON plan_days(plan_id, month, day_of_month);
CREATE INDEX IF NOT EXISTS idx_plan_days_number ON plan_days(plan_id, day_number);

-- 3. Plan Readings (Handles single and compound daily readings)
CREATE TABLE IF NOT EXISTS plan_readings (
    id TEXT PRIMARY KEY,
    day_id TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    book_id TEXT NOT NULL,                -- e.g. 'GEN', 'JOB', 'NUM', 'PSA'
    book_name TEXT NOT NULL,              -- e.g. 'Génesis', 'Job', 'Salmos'
    start_chapter INTEGER NOT NULL,
    start_verse INTEGER NULL,
    end_chapter INTEGER NOT NULL,
    end_verse INTEGER NULL,
    citation_label TEXT NOT NULL,         -- e.g. 'Génesis 1-3', 'Salmo 90'
    is_completed INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(day_id) REFERENCES plan_days(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_plan_readings_day ON plan_readings(day_id);

-- 4. Bible Verses (Offline text)
CREATE TABLE IF NOT EXISTS bible_verses (
    book_id TEXT NOT NULL,                -- Standard 3-letter abbreviation
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    verse_text TEXT NOT NULL,
    PRIMARY KEY(book_id, chapter, verse)
);
CREATE INDEX IF NOT EXISTS idx_bible_lookup ON bible_verses(book_id, chapter);

-- 5. Study Articles (Cached from VidaEsperanzayVerdad.org)
CREATE TABLE IF NOT EXISTS study_articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    book_id TEXT NULL,                    -- Mapped biblical book ID (if book/verse specific)
    section TEXT NOT NULL,                -- 'santa-biblia', 'versiculos-para-meditar', etc.
    last_synced_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_study_articles_book ON study_articles(book_id);
```

---

## 4. Data Flow & Synchronization Pipelines

### 4.1 Build-Time Ingestion (PDF to Seed JSON)
1. Extractor script runs via Node.js/TypeScript using `pdf-parse`/`pypdf`.
2. Processes 12 pages of `Programa_cronologico_de_la_biblia.pdf`.
3. Validates that every day (1..365) has:
   - Normalized month and day number.
   - Standardized biblical book identifiers (e.g. mapping "Job", "Génesis", "Salmo" to canonical names and IDs).
   - Chapter numbers and range boundaries.
4. Generates bundled asset: `assets/data/chronological_plan_seed.json`.

### 4.2 Application Bootstrap & Seeding
1. App launches: checks `PRAGMA user_version`.
2. Runs DDL migrations.
3. If `reading_plans` is empty, executes a single SQLite transaction inserting the seed plan and 365 daily schedules.
4. Pre-populates the bundled initial articles catalog from `assets/data/articles_seed.json`.

### 4.3 Stale-While-Revalidate Article Sync
1. On application launch or foreground resume with active network:
   - Fetches `https://vidaesperanzayverdad.org/sitemap.xml`.
   - Parses `<loc>` entries under `https://vidaesperanzayverdad.org/biblia/`.
   - Derives clean titles from URL slugs (e.g., `/el-libro-de-salmos/salmos-imprecatorios-.../` -> "Salmos imprecatorios: ¿Qué podemos aprender de las oraciones de venganza?").
   - Maps biblical book keywords to `book_id`.
   - Performs batch `INSERT OR IGNORE INTO study_articles` in SQLite.
2. If network request times out or fails (offline mode), the sync worker exits silently without throwing UI errors.
3. If zero articles exist for a rare book or during offline periods, the UI renders a direct fallback button:
   - Link: `https://vidaesperanzayverdad.org/search/?q={BookName}+{Chapter}`.

---

## 5. Screen Hierarchy & User Experience

### 5.1 "Today" Screen (`/(tabs)/today`)
- **Header:** Displays today's date (e.g. "Jueves, 1 de Octubre") and Day number of the plan.
- **Reading Cards:** Cards for each scheduled passage.
  - Checkbox toggle for completion.
  - "Read Passage" button navigating directly to the Reader screen focused on that chapter range.
- **Related Study Articles:**
  - Horizontal carousel or clean vertical card list showing articles matching today's biblical book(s).
  - Tapping an article opens `WebBrowser.openBrowserAsync(url)`.
  - Fallback button: "Buscar más artículos sobre este pasaje en Vida, Esperanza y Verdad".

### 5.2 "Calendar / Plan Overview" Screen (`/(tabs)/calendar`)
- **Yearly Progress Bar:** Shows total percentage of days completed (e.g., `45 / 365 (12%)`).
- **Month Grid/List:** Collapsible sections for all 12 months.
- **Day Item:** Shows day number, citation summary, and a checkmark badge. Tapping any past or future day loads that specific day's readings in detail.

### 5.3 "Bible Reader" Screen (`/(tabs)/reader`)
- **Clean Typography:** Serif/Sans-serif switchable reader font with adjustable size and comfortable line-height.
- **Continuous Scroll:** For multi-chapter readings (e.g. Genesis 1-3), renders chapters seamlessly with clear section markers.
- **Header Controls:** Chapter navigation buttons (`Prev`, `Next`) and back navigation to the Today screen.
- **Footer Action:** Floating "Mark as Read" confirmation button.

---

## 6. Edge Cases & Resilience

- **Leap Year (February 29):** The chronological plan specifies 365 calendar days. For leap years, February 29 retains the day 59 status or functions as a buffer day, preventing calendar drift.
- **Compound Daily Readings:** Days with split readings across Old/New Testament or disparate books (e.g. March 1: Numbers 14-15 and Psalm 90) maintain separate records in `plan_readings` sharing the same `day_id`.
- **Database Corruption Prevention:** All state mutations (marking reading completion, inserting sync deltas) use atomic SQLite transactions (`BEGIN TRANSACTION ... COMMIT`).
- **Offline Integrity:** The app functions 100% autonomously without network access. Network calls are strictly additive.

---

## 7. Testing Strategy

Following Test-Driven Development (TDD):
1. **Unit Tests (Jest):**
   - `PDFPlanParser`: Validates 365 days extraction, absence of null readings, and accurate chapter ranges against golden fixtures.
   - `SitemapParser`: Tests URL filtering, book slug resolution, and title generation.
   - `PlanProgressUseCase`: Verifies day toggle logic, completion percentage calculations, and streak tracking.
2. **Integration Tests:**
   - In-memory SQLite repository tests validating schema migrations, verse range queries, and article delta upserts.
3. **Component Tests (React Native Testing Library):**
   - `TodayScreen`: Verifies reading card rendering, checkbox interaction, and article list display.
   - `BibleReader`: Verifies chapter text rendering and font scaling controls.
