# Bible Reading Plans Mobile App — Architectural Design Specification

## 1. Overview & Business Intent

The goal of this project is to build an offline-first mobile application in React Native (using Expo and SQLite) that guides users through structured daily Bible reading plans, accompanied by contextual study articles from *Vida, Esperanza y Verdad* (`vidaesperanzayverdad.org`).

Following inspection of the primary reading material, the application supports **multiple concurrent active plans** across **three distinct plan archetypes**:
1. **Annual Calendar Plans (365 days):** Sequential or distributed reading tracks, ranging from 1 to 4 distinct daily readings (e.g. *Chronological Plan* and *Robert Murray M'Cheyne Advanced Plan*).
2. **Monthly Thematic Challenges (30 days):** Single-verse daily meditation tracks focused on spiritual themes (e.g. *UED - Una Escritura Diaria*).
3. **Thematic Study Guides (Short-duration, 3–14 days):** Topic-specific devocionals containing day titles, focused scripture passages, **reflection questions**, and **explicitly curated study article recommendations** (e.g. *Hechos 2 - Pentecostés*, *Preparación para la Pascua*).

### Success Criteria
- **Multi-Plan Concurrency:** Users can follow an annual reading plan while concurrently participating in a seasonal 7-day study guide, with isolated progress tracking per plan.
- **Zero-Latency Offline Reading:** All biblical texts, plan schedules, questions, and baseline article indexes reside in local SQLite; zero network requests are needed to read passages or mark completion.
- **Zero Onboarding Friction:** 100% local-on-device persistence; no authentication or cloud accounts required for the MVP.
- **Stale-While-Revalidate Article Freshness:** Pre-seeded study articles index with silent background sitemap synchronization when online, plus a live search deep-link fallback.
- **Clean Architecture:** Domain logic is completely decoupled from UI components and the SQLite database engine, allowing effortless addition of a web admin management panel in future phases.

---

## 2. System Architecture & Boundaries

The application follows Clean Architecture principles with three isolated layers:

```
+-------------------------------------------------------------------------------+
|                              Presentation Layer                               |
|   (Expo Router / Screens: Today Dashboard, Plans Catalog, Reader, Settings)   |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                                 Domain Layer                                  |
|        (Entities, Value Objects, Use Cases, Repository Contracts)             |
+-------------------------------------------------------------------------------+
                                        ^
                                        |
+-------------------------------------------------------------------------------+
|                                  Data Layer                                   |
|   (Expo SQLite Repositories, PDF Ingestion Engine, SitemapSyncService)        |
+-------------------------------------------------------------------------------+
```

### 2.1 Domain Layer
- **Entities & Value Objects:**
  - `ReadingPlan`: Represents a plan (`id`, `title`, `description`, `archetype`: `'annual' | 'monthly' | 'thematic'`, `total_days`, `is_active`).
  - `PlanSubscription`: User's enrollment in a plan (`id`, `plan_id`, `started_at`, `is_active`, `current_day_number`).
  - `PlanDay`: A single day within a plan (`id`, `plan_id`, `day_number`, `title`, `month`, `day_of_month`, `devotional_notes`, `reflection_questions`, `explicit_articles`).
  - `PlanReading`: A single scriptural segment assigned to a day (`order_index`, `book_id`, `book_name`, `start_chapter`, `start_verse`, `end_chapter`, `end_verse`, `citation_label`).
  - `BibleVerse`: Canonical verse record (`book_id`, `chapter`, `verse`, `verse_text`).
  - `StudyArticle`: Canonical article metadata (`id`, `title`, `url`, `book_id`, `section`, `last_synced_at`).
- **Use Cases:**
  - `GetActivePlansWithTodayReadingsUseCase`: Returns all subscribed plans with today's reading tasks and reflection materials.
  - `ToggleReadingProgressUseCase`: Toggles completion status for a specific passage or full day within a specific subscription.
  - `GetPassageVersesUseCase`: Retrieves full verse text from SQLite for scheduled chapter ranges.
  - `GetPlanCatalogUseCase`: Lists all available plans (annual, monthly, thematic) with enrollment status.
  - `SubscribeToPlanUseCase` / `UnsubscribeFromPlanUseCase`: Enrolls or archives a plan for the user.
  - `SyncArticlesDeltaUseCase`: Downloads and ingests deltas from `vidaesperanzayverdad.org/sitemap.xml`.

### 2.2 Data Layer
- **SQLite Engine (`expo-sqlite`):** Native relational database managing all tables with migration versioning.
- **Repositories:**
  - `SQLiteBibleRepository` implementing `BibleRepository`.
  - `SQLitePlanRepository` implementing `PlanRepository`.
  - `SQLiteSubscriptionRepository` implementing `SubscriptionRepository`.
  - `SQLiteArticleRepository` implementing `ArticleRepository`.
- **Services:**
  - `PDFPlanIngestionService`: Development ETL pipeline parsing the 5 PDF files into structured seed datasets (`assets/data/plans/`).
  - `SitemapSyncService`: Non-blocking background worker updating the article index when connected to the internet.

### 2.3 Presentation Layer
- **Stack & Routing:** Expo Router (`app/` directory) with bottom tab navigation:
  - `/(tabs)/today`: Active plan switcher / stacked cards showing today's assignments for each active plan, reflection questions (for thematic plans), and related study articles.
  - `/(tabs)/plans`: Catalog of all plans grouped by archetype (Annual, Monthly Challenges, Thematic Studies). Displays progress badges and "Start Plan" / "Pause Plan" actions.
  - `/(tabs)/reader`: Distraction-free typography reader for assigned chapters, supporting multi-chapter continuous scrolling and font size controls.
  - `/(tabs)/settings`: Offline storage statistics, manual article sync trigger, and app credits.
- **In-App Article Browser:** `expo-web-browser` opening articles in Safari View Controller (iOS) and Chrome Custom Tabs (Android).

---

## 3. SQLite Database Schema

Migrations use `PRAGMA user_version`.

```sql
-- 1. Reading Plans Catalog
CREATE TABLE IF NOT EXISTS reading_plans (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    archetype TEXT NOT NULL CHECK(archetype IN ('annual', 'monthly', 'thematic')),
    total_days INTEGER NOT NULL,
    is_featured INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Plan Subscriptions (Enables multiple concurrent plans)
CREATE TABLE IF NOT EXISTS user_plan_subscriptions (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER NOT NULL DEFAULT 1,
    current_day_number INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(plan_id) REFERENCES reading_plans(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_subs_active ON user_plan_subscriptions(is_active);

-- 3. Plan Days
CREATE TABLE IF NOT EXISTS plan_days (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    day_number INTEGER NOT NULL,          -- 1 to total_days
    title TEXT NULL,                      -- e.g. 'DÍA 2: El don de hablar en lenguas'
    month INTEGER NULL,                   -- 1 to 12 (for calendar-bound plans)
    day_of_month INTEGER NULL,            -- 1 to 31 (for calendar-bound plans)
    devotional_notes TEXT NULL,           -- Background explanation / context
    reflection_questions TEXT NULL,       -- JSON array of strings
    explicit_article_titles TEXT NULL,    -- JSON array of specific article titles listed in PDF
    FOREIGN KEY(plan_id) REFERENCES reading_plans(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_plan_days_lookup ON plan_days(plan_id, day_number);

-- 4. Plan Readings (Supports 1 to 4 passages per day, e.g. M'Cheyne plan)
CREATE TABLE IF NOT EXISTS plan_readings (
    id TEXT PRIMARY KEY,
    day_id TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0, -- 0..3 for multiple daily readings
    book_id TEXT NOT NULL,                -- Standard ID ('GEN', 'LUK', 'JOB', etc.)
    book_name TEXT NOT NULL,              -- 'Génesis', 'Lucas', 'Job', etc.
    start_chapter INTEGER NOT NULL,
    start_verse INTEGER NULL,
    end_chapter INTEGER NOT NULL,
    end_verse INTEGER NULL,
    citation_label TEXT NOT NULL,         -- 'Éxodo 12:22-51', 'Marcos 4'
    FOREIGN KEY(day_id) REFERENCES plan_days(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_readings_day ON plan_readings(day_id, order_index);

-- 5. User Reading Progress (Tracked per subscription and reading)
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

-- 6. Bible Verses (Offline text)
CREATE TABLE IF NOT EXISTS bible_verses (
    book_id TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    verse_text TEXT NOT NULL,
    PRIMARY KEY(book_id, chapter, verse)
);
CREATE INDEX IF NOT EXISTS idx_bible_lookup ON bible_verses(book_id, chapter);

-- 7. Study Articles (Cached from VidaEsperanzayVerdad.org)
CREATE TABLE IF NOT EXISTS study_articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    book_id TEXT NULL,
    section TEXT NOT NULL,
    last_synced_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_study_articles_book ON study_articles(book_id);
```

---

## 4. Ingestion Pipeline & Synchronization

### 4.1 Multi-PDF Extraction Strategy
A TypeScript CLI tool in `scripts/ingest-plans.ts` processes each archetype:
1. **Calendar Annual:** `Programa_cronologico_de_la_biblia.pdf` (1–2 readings/day) and `Programa_avanzado_de_lectura_de_la_biblia.pdf` (4 readings/day across OT/NT/Psalms).
2. **Monthly Challenge:** `UED_Septiembre_2026.pdf` (30 days single verse theme).
3. **Thematic Guides:** `VEV_PLT_Hechos-2-Pentecostes.pdf` and `VEV_PLT_Preparacion-para-la-Pascua.pdf` (extracts day titles, numbered reflection questions, and explicitly listed article titles).
- Output: Standardized JSON seeds in `assets/data/plans/*.json`.

### 4.2 Article Matching Logic
For a given day's readings, the application resolves articles via two tiers:
1. **Curated Tier:** If the plan contains `explicit_article_titles` (thematic plans), match against `study_articles.title`.
2. **Contextual Tier:** Queries `study_articles` where `book_id` matches the day's scheduled reading books.
3. **Live Fallback:** If zero articles match offline, provides a direct in-app search deep-link: `https://vidaesperanzayverdad.org/search/?q={BookName}+{Chapter}`.

---

## 5. Screen Hierarchy & Experience

### 5.1 "Today" Screen (`/(tabs)/today`)
- Shows a header with active plan selector tabs (e.g. `[ Cronológico (Día 45) ]` | `[ Pascua (Día 3) ]`).
- **Assigned Readings:** Checkbox items for each passage (e.g. up to 4 cards for M'Cheyne). Tapping a passage opens the Bible Reader.
- **Thematic Devotional & Reflection (When active):** Displays the day's reflection questions with collapsible study notes.
- **Related Study Articles:** Horizontal card list of articles with title and thumbnail placeholder. Tapping opens `WebBrowser`.

### 5.2 "Plans Catalog" Screen (`/(tabs)/plans`)
- Categorized view:
  - *Planes Anuales:* Cronológico, Robert Murray M'Cheyne.
  - *Desafíos Mensuales:* Una Escritura Diaria (UED).
  - *Guías Temáticas:* Hechos 2 (Pentecostés), Preparación para la Pascua.
- Each plan card shows duration, description, current progress if subscribed, and an action button (*Continuar*, *Empezar Plan*, *Pausar*).

### 5.3 "Bible Reader" Screen (`/(tabs)/reader`)
- Clean serif/sans reader view displaying verses for the selected reading.
- Continuous multi-chapter scrolling with chapter dividers.
- Font scaling slider (A- / A+) and dark/light theme support.
- Floating "Marcar como leído" button.

---

## 6. Testing Strategy

1. **Unit Tests (Jest):**
   - Plan parsers: verify 100% extraction accuracy across all 5 PDF archetypes without missing days or malformed scripture references.
   - Subscription use cases: verify concurrent subscription state, independent day tracking, and progress calculations.
   - Sitemap parser: verify slug extraction and biblical book keyword tagging.
2. **Integration Tests:**
   - In-memory SQLite repository tests verifying schema migrations, multi-reading inserts, and relational progress cascade deletions.
3. **Component Tests (React Native Testing Library):**
   - Active plan switcher tabs on Today screen.
   - Checkbox toggle and progress bar updates.
