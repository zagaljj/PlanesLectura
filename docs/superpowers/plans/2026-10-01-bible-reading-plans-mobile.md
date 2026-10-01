# Bible Reading Plans Mobile App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline-first React Native (Expo + SQLite) mobile app that supports multiple concurrent Bible reading plans across 3 archetypes (annual calendar, monthly challenges, thematic study guides), featuring offline Scripture reading, progress tracking, and background study article discovery from *Vida, Esperanza y Verdad*.

**Architecture:** Clean Architecture with Domain (pure entities and use cases), Data (Expo SQLite repositories, PDF ETL ingestion scripts, background sitemap sync), and Presentation (Expo Router tabs, in-app browser).

**Tech Stack:** React Native, Expo SDK, TypeScript, Expo SQLite (`expo-sqlite`), Expo WebBrowser (`expo-web-browser`), Jest, React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-01-bible-reading-plans-mobile-design.md`

## Global Constraints

- **Language Contract:** All source code, tests, documentation, identifiers, and comments MUST be written in English.
- **Offline First:** All reading plan schedules, questions, and core biblical passages must be stored in local SQLite; zero network requests allowed for the core reader experience.
- **No Remote Auth:** 100% local-on-device state persistence without requiring authentication or user accounts.
- **Multi-Plan Support:** Database schema and domain logic must strictly support multiple concurrent plan subscriptions (`user_plan_subscriptions`).
- **Resilient Article Sync:** Background article synchronization must use Stale-While-Revalidate and never throw unhandled network exceptions or block the UI thread.
- **Conventional Commits:** Every task step ending with commit must use conventional commits without AI attribution.

## Review Focus

1. **Leap Year Drift (Feb 29):** Calendar plans with 365 days must map deterministically without skipping days or misaligning calendar month dates in leap years.
2. **Compound Multi-Reading Days:** Days with up to 4 readings (e.g. Robert Murray M'Cheyne plan) must maintain discrete reading records and preserve individual completion checkboxes.
3. **Thematic Questions & Curated Articles:** Devotional guides with reflection questions and explicit article titles must render both cleanly without crashing when null on standard annual plans.
4. **Offline Resilience on Network Failure:** When the device is offline, `SitemapSyncService` must exit gracefully with zero user-facing errors, falling back to local cached articles and deep-link search.
5. **Relational Cascade Deletions:** Unsubscribing or deleting a plan subscription must cleanly cascade and remove associated `user_reading_progress` rows without leaving orphaned records in SQLite.

---

### Task 1: Project Scaffolding & Expo Configuration

**Files:**
- Create: `package.json`
- Create: `app.json`
- Create: `tsconfig.json`
- Create: `jest.config.js`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Consumes: None
- Produces: Project root configuration, dependency graph, and passing test harness.

- [ ] **Step 1: Write smoke test**

```typescript
// tests/smoke.test.ts
describe('Environment Smoke Test', () => {
  it('should execute tests in TypeScript environment', () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/smoke.test.ts`
Expected: FAIL (Jest not installed or configured).

- [ ] **Step 3: Setup project configuration and dependencies**

Install dependencies: `expo`, `react`, `react-native`, `expo-sqlite`, `expo-web-browser`, `expo-router`, `typescript`, `@types/react`, `jest`, `ts-jest`, `@types/jest`.
Configure `tsconfig.json` and `jest.config.js` with TypeScript support.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/smoke.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
DEVELOPER_DIR=/Library/Developer/CommandLineTools git add package.json tsconfig.json jest.config.js app.json tests/smoke.test.ts
DEVELOPER_DIR=/Library/Developer/CommandLineTools git commit -m "chore: scaffold expo project with typescript and jest harness"
```

---

### Task 2: Core Domain Entities & Value Objects

**Files:**
- Create: `src/domain/entities/ReadingPlan.ts`
- Create: `src/domain/entities/PlanDay.ts`
- Create: `src/domain/entities/PlanReading.ts`
- Create: `src/domain/entities/PlanSubscription.ts`
- Create: `src/domain/entities/StudyArticle.ts`
- Create: `src/domain/entities/BibleVerse.ts`
- Test: `tests/domain/entities.test.ts`

**Interfaces:**
- Consumes: None
- Produces:
  - `ReadingPlan`: `{ id: string, title: string, description: string, archetype: 'annual' | 'monthly' | 'thematic', totalDays: number }`
  - `PlanDay`: `{ id: string, planId: string, dayNumber: number, title?: string, month?: number, dayOfMonth?: number, devotionalNotes?: string, reflectionQuestions?: string[], explicitArticleTitles?: string[] }`
  - `PlanReading`: `{ id: string, dayId: string, orderIndex: number, bookId: string, bookName: string, startChapter: number, startVerse?: number, endChapter: number, endVerse?: number, citationLabel: string }`
  - `PlanSubscription`: `{ id: string, planId: string, startedAt: string, isActive: boolean, currentDayNumber: number }`
  - `StudyArticle`: `{ id: string, title: string, url: string, bookId?: string, section: string, lastSyncedAt: string }`
  - `BibleVerse`: `{ bookId: string, chapter: number, verse: number, text: string }`

- [ ] **Step 1: Write failing tests for entity instantiations and validations**

```typescript
// tests/domain/entities.test.ts
import { ReadingPlan } from '../../src/domain/entities/ReadingPlan';
import { PlanDay } from '../../src/domain/entities/PlanDay';

describe('Domain Entities', () => {
  it('should construct a valid ReadingPlan with required archetype', () => {
    const plan = new ReadingPlan({
      id: 'plan-1',
      title: 'Cronológico',
      description: 'Lectura en orden histórico',
      archetype: 'annual',
      totalDays: 365,
    });
    expect(plan.id).toBe('plan-1');
    expect(plan.archetype).toBe('annual');
  });

  it('should support reflection questions and explicit articles on PlanDay', () => {
    const day = new PlanDay({
      id: 'day-1',
      planId: 'pentecost-1',
      dayNumber: 2,
      title: 'Día 2',
      reflectionQuestions: ['¿Por qué se sorprendían?'],
      explicitArticleTitles: ['¿Qué pasa si no puedo hablar en lenguas?'],
    });
    expect(day.reflectionQuestions).toHaveLength(1);
    expect(day.explicitArticleTitles?.[0]).toContain('lenguas');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/domain/entities.test.ts`
Expected: FAIL (Cannot find module).

- [ ] **Step 3: Implement domain entity classes with immutable getters and constructor validation**

Implement files in `src/domain/entities/`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/domain/entities.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
DEVELOPER_DIR=/Library/Developer/CommandLineTools git add src/domain/entities/ tests/domain/entities.test.ts
DEVELOPER_DIR=/Library/Developer/CommandLineTools git commit -m "feat(domain): add core domain entities and value objects"
```

---

### Task 3: PDF Plan Ingestion Pipeline (Parsers & Seed Generation)

**Files:**
- Create: `src/data/parsers/AnnualPlanParser.ts`
- Create: `src/data/parsers/MonthlyPlanParser.ts`
- Create: `src/data/parsers/ThematicPlanParser.ts`
- Create: `scripts/ingest-plans.ts`
- Test: `tests/data/parsers.test.ts`

**Interfaces:**
- Consumes: PDF files (`Programa_cronologico_de_la_biblia.pdf`, `Programa_avanzado_de_lectura_de_la_biblia.pdf`, `UED_Septiembre_2026.pdf`, `VEV_PLT_Hechos-2-Pentecostes.pdf`, `VEV_PLT_Preparacion-para-la-Pascua.pdf`)
- Produces: Normalized seed JSON files in `assets/data/plans/` (`chronological.json`, `mccheyne.json`, `ued.json`, `pentecost.json`, `passover.json`).

- [ ] **Step 1: Write failing parser tests validating output structure**

```typescript
// tests/data/parsers.test.ts
import { AnnualPlanParser } from '../../src/data/parsers/AnnualPlanParser';
import { ThematicPlanParser } from '../../src/data/parsers/ThematicPlanParser';

describe('PDF Ingestion Parsers', () => {
  it('should parse 365 days with up to 4 daily readings for M\'Cheyne plan', async () => {
    const parser = new AnnualPlanParser();
    const result = await parser.parseFile('Programa_avanzado_de_lectura_de_la_biblia.pdf');
    expect(result.days).toHaveLength(365);
    expect(result.days[0].readings.length).toBeGreaterThanOrEqual(1);
  });

  it('should parse thematic plans and extract questions and resources', async () => {
    const parser = new ThematicPlanParser();
    const result = await parser.parseFile('VEV_PLT_Hechos-2-Pentecostes.pdf');
    expect(result.days.length).toBeGreaterThan(0);
    expect(result.days.some(d => (d.reflectionQuestions?.length ?? 0) > 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/data/parsers.test.ts`
Expected: FAIL (Modules not found).

- [ ] **Step 3: Implement parsers and CLI ingestion script**

Implement regex citation extractors (e.g. `/(Génesis|Éxodo|Job|Salmos?|...)\s+(\d+)(?:-(\d+))?/i`), reflection question parser, and asset writer.

- [ ] **Step 4: Run test to verify it passes and execute script**

Run: `npx jest tests/data/parsers.test.ts`
Expected: PASS.
Run: `npx ts-node scripts/ingest-plans.ts` to populate `assets/data/plans/`.

- [ ] **Step 5: Commit**

```bash
DEVELOPER_DIR=/Library/Developer/CommandLineTools git add src/data/parsers/ scripts/ assets/data/ tests/data/parsers.test.ts
DEVELOPER_DIR=/Library/Developer/CommandLineTools git commit -m "feat(data): implement multi-archetype pdf plan ingestion pipeline"
```

---

### Task 4: SQLite Database Migrations & Seeding Engine

**Files:**
- Create: `src/data/sqlite/schema.ts`
- Create: `src/data/sqlite/migrations.ts`
- Create: `src/data/sqlite/DatabaseManager.ts`
- Test: `tests/data/sqlite/DatabaseManager.test.ts`

**Interfaces:**
- Consumes: `assets/data/plans/*.json`
- Produces:
  - `DatabaseManager.getDatabase()`: returns initialized `SQLiteDatabase`.
  - `DatabaseManager.initialize()`: runs schema migrations and initial seed insertion.

- [ ] **Step 1: Write failing database migration and seeding tests**

```typescript
// tests/data/sqlite/DatabaseManager.test.ts
import { DatabaseManager } from '../../../src/data/sqlite/DatabaseManager';

describe('DatabaseManager', () => {
  it('should create all required tables on initialization', async () => {
    const db = await DatabaseManager.createInMemory();
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain('reading_plans');
    expect(tableNames).toContain('plan_days');
    expect(tableNames).toContain('plan_readings');
    expect(tableNames).toContain('user_plan_subscriptions');
    expect(tableNames).toContain('user_reading_progress');
    expect(tableNames).toContain('study_articles');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/data/sqlite/DatabaseManager.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement SQLite schema, migration runner, and seed transaction loader**

Define DDL from spec in `schema.ts`. Implement migration version checker in `migrations.ts`. Implement batch seeding in `DatabaseManager.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/data/sqlite/DatabaseManager.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
DEVELOPER_DIR=/Library/Developer/CommandLineTools git add src/data/sqlite/ tests/data/sqlite/
DEVELOPER_DIR=/Library/Developer/CommandLineTools git commit -m "feat(data): implement sqlite schema migrations and seeding engine"
```

---

### Task 5: SQLite Repositories Implementation

**Files:**
- Create: `src/domain/repositories/PlanRepository.ts`
- Create: `src/domain/repositories/SubscriptionRepository.ts`
- Create: `src/domain/repositories/BibleRepository.ts`
- Create: `src/domain/repositories/ArticleRepository.ts`
- Create: `src/data/repositories/SQLitePlanRepository.ts`
- Create: `src/data/repositories/SQLiteSubscriptionRepository.ts`
- Create: `src/data/repositories/SQLiteBibleRepository.ts`
- Create: `src/data/repositories/SQLiteArticleRepository.ts`
- Test: `tests/data/repositories/SQLiteRepositories.test.ts`

**Interfaces:**
- Consumes: `DatabaseManager`
- Produces: Concrete repository implementations fulfilling domain interfaces.

- [ ] **Step 1: Write failing repository integration tests**

```typescript
// tests/data/repositories/SQLiteRepositories.test.ts
import { SQLitePlanRepository } from '../../../src/data/repositories/SQLitePlanRepository';
import { SQLiteSubscriptionRepository } from '../../../src/data/repositories/SQLiteSubscriptionRepository';
import { DatabaseManager } from '../../../src/data/sqlite/DatabaseManager';

describe('SQLite Repositories', () => {
  it('should query plans by archetype and manage user subscriptions', async () => {
    const db = await DatabaseManager.createInMemory();
    const planRepo = new SQLitePlanRepository(db);
    const subRepo = new SQLiteSubscriptionRepository(db);

    const plans = await planRepo.getAllPlans();
    expect(plans.length).toBeGreaterThan(0);

    const sub = await subRepo.subscribe(plans[0].id);
    expect(sub.isActive).toBe(true);

    const activeSubs = await subRepo.getActiveSubscriptions();
    expect(activeSubs).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/data/repositories/SQLiteRepositories.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement repository classes**

Write SQL query builders and entity mapping in `src/data/repositories/`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/data/repositories/SQLiteRepositories.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
DEVELOPER_DIR=/Library/Developer/CommandLineTools git add src/domain/repositories/ src/data/repositories/ tests/data/repositories/
DEVELOPER_DIR=/Library/Developer/CommandLineTools git commit -m "feat(data): implement sqlite repositories for plans, subscriptions, and articles"
```

---

### Task 6: Domain Use Cases Implementation

**Files:**
- Create: `src/domain/usecases/GetActivePlansWithTodayReadings.ts`
- Create: `src/domain/usecases/ToggleReadingProgress.ts`
- Create: `src/domain/usecases/GetPassageVerses.ts`
- Create: `src/domain/usecases/GetPlanCatalog.ts`
- Create: `src/domain/usecases/SubscribeToPlan.ts`
- Test: `tests/domain/usecases.test.ts`

**Interfaces:**
- Consumes: Domain repositories
- Produces: Clean, pure business use cases.

- [ ] **Step 1: Write failing tests for multi-plan progress and retrieval use cases**

```typescript
// tests/domain/usecases.test.ts
import { GetActivePlansWithTodayReadings } from '../../src/domain/usecases/GetActivePlansWithTodayReadings';
import { ToggleReadingProgress } from '../../src/domain/usecases/ToggleReadingProgress';

describe('Domain Use Cases', () => {
  it('should return multiple active plans with current day readings', async () => {
    // Mock repositories & verify concurrent active plan returns
  });

  it('should toggle reading progress without affecting other subscriptions', async () => {
    // Verify progress isolation across subscriptions
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/domain/usecases.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement use cases**

Implement application orchestration logic in `src/domain/usecases/`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/domain/usecases.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
DEVELOPER_DIR=/Library/Developer/CommandLineTools git add src/domain/usecases/ tests/domain/usecases.test.ts
DEVELOPER_DIR=/Library/Developer/CommandLineTools git commit -m "feat(domain): implement core application use cases"
```

---

### Task 7: Background Article Sync Service (Sitemap & Stale-While-Revalidate)

**Files:**
- Create: `src/data/sync/SitemapParser.ts`
- Create: `src/data/sync/SitemapSyncService.ts`
- Test: `tests/data/sync/SitemapSync.test.ts`

**Interfaces:**
- Consumes: Network HTTP request to `https://vidaesperanzayverdad.org/sitemap.xml`
- Produces: `SitemapSyncService.syncDelta()`: Promise<number> (count of new articles inserted).

- [ ] **Step 1: Write failing sitemap parser tests with XML fixture**

```typescript
// tests/data/sync/SitemapSync.test.ts
import { SitemapParser } from '../../../src/data/sync/SitemapParser';

describe('SitemapSync', () => {
  it('should extract bible articles and map book slugs cleanly', () => {
    const xml = `<urlset><url><loc>https://vidaesperanzayverdad.org/biblia/santa-biblia/antiguo-testamento/los-escritos/el-libro-de-salmos/salmos-imprecatorios/</loc></url></urlset>`;
    const articles = SitemapParser.parse(xml);
    expect(articles).toHaveLength(1);
    expect(articles[0].bookId).toBe('PSA');
    expect(articles[0].title).toContain('Salmos imprecatorios');
  });

  it('should handle network errors silently without throwing', async () => {
    // Test offline resilience
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/data/sync/SitemapSync.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `SitemapParser` and `SitemapSyncService`**

Implement XML parsing regex/DOMParser, title capitalization, and `INSERT OR IGNORE` SQLite upserts.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/data/sync/SitemapSync.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
DEVELOPER_DIR=/Library/Developer/CommandLineTools git add src/data/sync/ tests/data/sync/
DEVELOPER_DIR=/Library/Developer/CommandLineTools git commit -m "feat(data): implement background sitemap sync service"
```

---

### Task 8: Presentation Components & Design System

**Files:**
- Create: `src/presentation/theme/colors.ts`
- Create: `src/presentation/theme/typography.ts`
- Create: `src/presentation/components/ReadingCard.tsx`
- Create: `src/presentation/components/ArticleCard.tsx`
- Create: `src/presentation/components/PlanProgressBadge.tsx`
- Create: `src/presentation/components/ReflectionQuestionBlock.tsx`
- Test: `tests/presentation/components/ReadingCard.test.tsx`

**Interfaces:**
- Consumes: Domain entities
- Produces: Reusable UI widgets.

- [ ] **Step 1: Write failing component test for ReadingCard**

```typescript
// tests/presentation/components/ReadingCard.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ReadingCard } from '../../../src/presentation/components/ReadingCard';

describe('ReadingCard Component', () => {
  it('should render citation label and toggle completion callback', () => {
    const onToggle = jest.fn();
    const { getByText, getByTestId } = render(
      <ReadingCard
        citationLabel="Génesis 1-3"
        isCompleted={false}
        onToggle={onToggle}
        onReadPress={jest.fn()}
      />
    );
    expect(getByText('Génesis 1-3')).toBeTruthy();
    fireEvent.press(getByTestId('checkbox'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/presentation/components/ReadingCard.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement theme tokens and UI components**

Implement theme tokens and components in `src/presentation/components/`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/presentation/components/ReadingCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
DEVELOPER_DIR=/Library/Developer/CommandLineTools git add src/presentation/ tests/presentation/
DEVELOPER_DIR=/Library/Developer/CommandLineTools git commit -m "feat(ui): add design system tokens and presentation components"
```

---

### Task 9: Screens & Navigation (Expo Router)

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/today.tsx`
- Create: `app/(tabs)/plans.tsx`
- Create: `app/(tabs)/reader.tsx`
- Create: `app/(tabs)/settings.tsx`
- Test: `tests/presentation/screens/TodayScreen.test.tsx`

**Interfaces:**
- Consumes: Domain use cases, presentation components, `expo-web-browser`.
- Produces: Complete navigable mobile application.

- [ ] **Step 1: Write failing screen test for TodayScreen**

```typescript
// tests/presentation/screens/TodayScreen.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import TodayScreen from '../../../app/(tabs)/today';

describe('TodayScreen', () => {
  it('should render active plan switchers and reading list', async () => {
    // Render TodayScreen with mock use case
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/presentation/screens/TodayScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement Expo Router screens and navigation tabs**

Implement `app/` routes according to specification.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/presentation/screens/TodayScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
DEVELOPER_DIR=/Library/Developer/CommandLineTools git add app/ tests/presentation/screens/
DEVELOPER_DIR=/Library/Developer/CommandLineTools git commit -m "feat(ui): implement expo router tabs and full screen navigation"
```
