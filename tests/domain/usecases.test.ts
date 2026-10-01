import { ReadingPlan, PlanDay, PlanReading, PlanSubscription, StudyArticle, BibleVerse } from '../../src/domain/entities';
import {
  PlanRepository,
  PlanDayWithReadings,
  SubscriptionRepository,
  SubscriptionProgress,
  BibleRepository,
  VerseRangeQuery,
  ArticleRepository,
} from '../../src/domain/repositories';
import { GetActivePlansWithTodayReadings } from '../../src/domain/usecases/GetActivePlansWithTodayReadings';
import { ToggleReadingProgress } from '../../src/domain/usecases/ToggleReadingProgress';
import { GetPassageVerses } from '../../src/domain/usecases/GetPassageVerses';
import { GetPlanCatalog } from '../../src/domain/usecases/GetPlanCatalog';
import { SubscribeToPlan } from '../../src/domain/usecases/SubscribeToPlan';
import { DatabaseManager, ISQLiteDatabase } from '../../src/data/sqlite/DatabaseManager';
import { SQLitePlanRepository } from '../../src/data/repositories/SQLitePlanRepository';
import { SQLiteSubscriptionRepository } from '../../src/data/repositories/SQLiteSubscriptionRepository';
import { SQLiteBibleRepository } from '../../src/data/repositories/SQLiteBibleRepository';
import { SQLiteArticleRepository } from '../../src/data/repositories/SQLiteArticleRepository';

describe('Domain Use Cases', () => {
  // In-memory mock repositories for pure domain testing
  class MockPlanRepository implements PlanRepository {
    plans: ReadingPlan[] = [];
    days: PlanDay[] = [];
    readings: PlanReading[] = [];

    async getAllPlans(): Promise<ReadingPlan[]> {
      return [...this.plans];
    }
    async getPlanById(id: string): Promise<ReadingPlan | null> {
      return this.plans.find(p => p.id === id) ?? null;
    }
    async getPlansByArchetype(archetype: any): Promise<ReadingPlan[]> {
      return this.plans.filter(p => p.archetype === archetype);
    }
    async getDaysForPlan(planId: string): Promise<PlanDay[]> {
      return this.days.filter(d => d.planId === planId);
    }
    async getDayByPlanAndNumber(planId: string, dayNumber: number): Promise<PlanDay | null> {
      return this.days.find(d => d.planId === planId && d.dayNumber === dayNumber) ?? null;
    }
    async getReadingsForDay(dayId: string): Promise<PlanReading[]> {
      return this.readings.filter(r => r.dayId === dayId);
    }
    async getDaysWithReadingsForPlan(planId: string): Promise<PlanDayWithReadings[]> {
      const planDays = this.days.filter(d => d.planId === planId);
      return planDays.map(day => ({
        day,
        readings: this.readings.filter(r => r.dayId === day.id),
      }));
    }
    async getDayWithReadings(planId: string, dayNumber: number): Promise<PlanDayWithReadings | null> {
      const day = await this.getDayByPlanAndNumber(planId, dayNumber);
      if (!day) return null;
      const readings = await this.getReadingsForDay(day.id);
      return { day, readings };
    }
  }

  class MockSubscriptionRepository implements SubscriptionRepository {
    subscriptions: PlanSubscription[] = [];
    progressMap: Map<string, Set<string>> = new Map();

    async subscribe(planId: string, startingDayNumber: number = 1): Promise<PlanSubscription> {
      const existing = this.subscriptions.find(s => s.planId === planId);
      if (existing) {
        const updated = existing.withActive(true);
        const idx = this.subscriptions.indexOf(existing);
        this.subscriptions[idx] = updated;
        return updated;
      }
      const newSub = new PlanSubscription({
        id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        planId,
        startedAt: new Date().toISOString(),
        isActive: true,
        currentDayNumber: startingDayNumber,
      });
      this.subscriptions.push(newSub);
      this.progressMap.set(newSub.id, new Set());
      return newSub;
    }

    async unsubscribe(idOrPlanId: string): Promise<void> {
      const sub = this.subscriptions.find(s => s.id === idOrPlanId || s.planId === idOrPlanId);
      if (sub) {
        const idx = this.subscriptions.indexOf(sub);
        this.subscriptions[idx] = sub.withActive(false);
      }
    }

    async getActiveSubscriptions(): Promise<PlanSubscription[]> {
      return this.subscriptions.filter(s => s.isActive);
    }

    async getAllSubscriptions(): Promise<PlanSubscription[]> {
      return [...this.subscriptions];
    }

    async getSubscriptionById(id: string): Promise<PlanSubscription | null> {
      return this.subscriptions.find(s => s.id === id) ?? null;
    }

    async getSubscriptionByPlanId(planId: string): Promise<PlanSubscription | null> {
      return this.subscriptions.find(s => s.planId === planId) ?? null;
    }

    async updateCurrentDay(subscriptionId: string, dayNumber: number): Promise<void> {
      const sub = this.subscriptions.find(s => s.id === subscriptionId);
      if (sub) {
        const idx = this.subscriptions.indexOf(sub);
        this.subscriptions[idx] = sub.withCurrentDayNumber(dayNumber);
      }
    }

    async markReadingComplete(subscriptionId: string, readingId: string): Promise<void> {
      if (!this.progressMap.has(subscriptionId)) {
        this.progressMap.set(subscriptionId, new Set());
      }
      this.progressMap.get(subscriptionId)!.add(readingId);
    }

    async unmarkReading(subscriptionId: string, readingId: string): Promise<void> {
      if (this.progressMap.has(subscriptionId)) {
        this.progressMap.get(subscriptionId)!.delete(readingId);
      }
    }

    async isReadingCompleted(subscriptionId: string, readingId: string): Promise<boolean> {
      return this.progressMap.get(subscriptionId)?.has(readingId) ?? false;
    }

    async getCompletedReadingIds(subscriptionId: string): Promise<string[]> {
      const set = this.progressMap.get(subscriptionId);
      return set ? Array.from(set) : [];
    }

    async getProgressForSubscription(subscriptionId: string): Promise<SubscriptionProgress> {
      const completed = await this.getCompletedReadingIds(subscriptionId);
      const total = 10; // Normalized for mock
      return {
        subscriptionId,
        completedReadingIds: completed,
        totalReadingsCount: total,
        completedReadingsCount: completed.length,
        percentage: Math.round((completed.length / total) * 100),
      };
    }
  }

  class MockBibleRepository implements BibleRepository {
    verses: BibleVerse[] = [];

    async getVersesForRange(
      queryOrBookId: VerseRangeQuery | string,
      startChapter?: number,
      startVerse?: number,
      endChapter?: number,
      endVerse?: number
    ): Promise<BibleVerse[]> {
      let bookId: string;
      let sChap: number;
      let sVerse: number | undefined;
      let eChap: number;
      let eVerse: number | undefined;

      if (typeof queryOrBookId === 'string') {
        bookId = queryOrBookId;
        sChap = startChapter!;
        sVerse = startVerse;
        eChap = endChapter ?? sChap;
        eVerse = endVerse;
      } else {
        bookId = queryOrBookId.bookId;
        sChap = queryOrBookId.startChapter;
        sVerse = queryOrBookId.startVerse;
        eChap = queryOrBookId.endChapter ?? sChap;
        eVerse = queryOrBookId.endVerse;
      }

      return this.verses.filter(v => {
        if (v.bookId !== bookId) return false;
        if (v.chapter < sChap || v.chapter > eChap) return false;
        if (v.chapter === sChap && sVerse !== undefined && v.verse < sVerse) return false;
        if (v.chapter === eChap && eVerse !== undefined && v.verse > eVerse) return false;
        return true;
      });
    }

    async getVerse(bookId: string, chapter: number, verse: number): Promise<BibleVerse | null> {
      return this.verses.find(v => v.bookId === bookId && v.chapter === chapter && v.verse === verse) ?? null;
    }

    async insertVerses(verses: Array<BibleVerse>): Promise<void> {
      this.verses.push(...verses);
    }
  }

  class MockArticleRepository implements ArticleRepository {
    articles: StudyArticle[] = [];

    async getArticlesByBook(bookId: string): Promise<StudyArticle[]> {
      return this.articles.filter(a => a.bookId === bookId);
    }

    async getArticlesByTitles(titles: string[]): Promise<StudyArticle[]> {
      return this.articles.filter(a => titles.includes(a.title));
    }

    async getArticleById(id: string): Promise<StudyArticle | null> {
      return this.articles.find(a => a.id === id) ?? null;
    }

    async getAllArticles(): Promise<StudyArticle[]> {
      return [...this.articles];
    }

    async upsertArticles(articles: Array<StudyArticle>): Promise<void> {
      this.articles.push(...articles);
    }
  }

  let planRepo: MockPlanRepository;
  let subRepo: MockSubscriptionRepository;
  let bibleRepo: MockBibleRepository;
  let articleRepo: MockArticleRepository;

  beforeEach(() => {
    planRepo = new MockPlanRepository();
    subRepo = new MockSubscriptionRepository();
    bibleRepo = new MockBibleRepository();
    articleRepo = new MockArticleRepository();

    // Seed test data
    const planAnnual = new ReadingPlan({
      id: 'chronological',
      title: 'Plan Cronológico',
      description: 'Lee la Biblia cronológicamente en 365 días',
      archetype: 'annual',
      totalDays: 365,
    });
    const planThematic = new ReadingPlan({
      id: 'pentecost',
      title: 'Hechos 2: Pentecostés',
      description: 'Guía temática de 7 días',
      archetype: 'thematic',
      totalDays: 7,
    });
    planRepo.plans = [planAnnual, planThematic];

    // Day 1 for Chronological (Annual: Jan 1)
    const dayChron1 = new PlanDay({
      id: 'day-chron-1',
      planId: 'chronological',
      dayNumber: 1,
      month: 1,
      dayOfMonth: 1,
      title: 'Génesis 1-3',
    });
    // Day 59 for Chronological (Annual: Feb 28 / Feb 29 in leap year)
    const dayChron59 = new PlanDay({
      id: 'day-chron-59',
      planId: 'chronological',
      dayNumber: 59,
      month: 2,
      dayOfMonth: 28,
      title: 'Levítico 1-4',
    });
    // Day 1 for Pentecost (Thematic)
    const dayPent1 = new PlanDay({
      id: 'day-pent-1',
      planId: 'pentecost',
      dayNumber: 1,
      title: 'Día 1: Los discípulos reunidos',
      explicitArticleTitles: ['¿Qué es hablar en lenguas?'],
      reflectionQuestions: ['¿Por qué se reunieron en Pentecostés?'],
    });
    // Day 2 for Pentecost (Thematic)
    const dayPent2 = new PlanDay({
      id: 'day-pent-2',
      planId: 'pentecost',
      dayNumber: 2,
      title: 'Día 2: La venida del Espíritu',
      reflectionQuestions: ['¿Qué significado tiene el viento recio?'],
    });

    planRepo.days = [dayChron1, dayChron59, dayPent1, dayPent2];

    const readingChron1 = new PlanReading({
      id: 'reading-c1',
      dayId: 'day-chron-1',
      orderIndex: 0,
      bookId: 'GEN',
      bookName: 'Génesis',
      startChapter: 1,
      endChapter: 3,
      citationLabel: 'Génesis 1-3',
    });
    const readingPent1 = new PlanReading({
      id: 'reading-p1',
      dayId: 'day-pent-1',
      orderIndex: 0,
      bookId: 'ACT',
      bookName: 'Hechos',
      startChapter: 2,
      startVerse: 1,
      endChapter: 2,
      endVerse: 4,
      citationLabel: 'Hechos 2:1-4',
    });
    const readingPent2 = new PlanReading({
      id: 'reading-p2',
      dayId: 'day-pent-2',
      orderIndex: 0,
      bookId: 'ACT',
      bookName: 'Hechos',
      startChapter: 2,
      startVerse: 5,
      endChapter: 2,
      endVerse: 13,
      citationLabel: 'Hechos 2:5-13',
    });
    planRepo.readings = [readingChron1, readingPent1, readingPent2];

    // Articles
    const artCurated = new StudyArticle({
      id: 'art-curated',
      title: '¿Qué es hablar en lenguas?',
      url: 'https://vidaesperanzayverdad.org/art-curated',
      bookId: 'ACT',
      section: 'Doctrina',
      lastSyncedAt: '2026-10-01T00:00:00Z',
    });
    const artBookLevel = new StudyArticle({
      id: 'art-book',
      title: 'Introducción al libro de Génesis',
      url: 'https://vidaesperanzayverdad.org/art-book',
      bookId: 'GEN',
      section: 'Comentario',
      lastSyncedAt: '2026-10-01T00:00:00Z',
    });
    articleRepo.articles = [artCurated, artBookLevel];

    // Verses
    bibleRepo.verses = [
      new BibleVerse({ bookId: 'GEN', chapter: 1, verse: 1, text: 'En el principio creó Dios los cielos y la tierra.' }),
      new BibleVerse({ bookId: 'GEN', chapter: 1, verse: 2, text: 'Y la tierra estaba desordenada y vacía.' }),
      new BibleVerse({ bookId: 'ACT', chapter: 2, verse: 1, text: 'Cuando llegó el día de Pentecostés...' }),
    ];
  });

  describe('GetActivePlansWithTodayReadings', () => {
    it('should return multiple active plans with current day readings', async () => {
      // Subscribe to both Chronological and Pentecost
      const subChron = await subRepo.subscribe('chronological', 1);
      const subPent = await subRepo.subscribe('pentecost', 1);

      // Mark the reading for subChron as completed
      await subRepo.markReadingComplete(subChron.id, 'reading-c1');

      const useCase = new GetActivePlansWithTodayReadings(planRepo, subRepo, articleRepo);
      // Run with date = Jan 1 (day 1 for annual calendar plan)
      const results = await useCase.execute({ date: new Date(2026, 0, 1) });

      expect(results).toHaveLength(2);

      const chronResult = results.find(r => r.plan.id === 'chronological');
      expect(chronResult).toBeDefined();
      expect(chronResult?.day.dayNumber).toBe(1);
      expect(chronResult?.readings).toHaveLength(1);
      expect(chronResult?.readings[0].reading.id).toBe('reading-c1');
      expect(chronResult?.readings[0].isCompleted).toBe(true);
      // Contextual article matching for Genesis
      expect(chronResult?.articles).toHaveLength(1);
      expect(chronResult?.articles[0].id).toBe('art-book');

      const pentResult = results.find(r => r.plan.id === 'pentecost');
      expect(pentResult).toBeDefined();
      expect(pentResult?.day.dayNumber).toBe(1);
      expect(pentResult?.readings).toHaveLength(1);
      expect(pentResult?.readings[0].reading.id).toBe('reading-p1');
      expect(pentResult?.readings[0].isCompleted).toBe(false);
      // Curated article matching by title
      expect(pentResult?.articles).toHaveLength(1);
      expect(pentResult?.articles[0].title).toBe('¿Qué es hablar en lenguas?');
      expect(pentResult?.day.reflectionQuestions).toContain('¿Por qué se reunieron en Pentecostés?');
    });

    it('should handle leap year drift (Feb 29) deterministically mapping to day 59', async () => {
      await subRepo.subscribe('chronological', 1);
      const useCase = new GetActivePlansWithTodayReadings(planRepo, subRepo, articleRepo);

      // Feb 29 on leap year (2024 or 2028)
      const leapDayDate = new Date(2028, 1, 29); // Feb 29, 2028
      const results = await useCase.execute({ date: leapDayDate });

      expect(results).toHaveLength(1);
      expect(results[0].day.dayNumber).toBe(59);
      expect(results[0].day.month).toBe(2);
      expect(results[0].day.dayOfMonth).toBe(28);
    });

    it('should track thematic plan progression from subscription currentDayNumber', async () => {
      const subPent = await subRepo.subscribe('pentecost', 2); // started on day 2
      const useCase = new GetActivePlansWithTodayReadings(planRepo, subRepo, articleRepo);

      const results = await useCase.execute();
      expect(results).toHaveLength(1);
      expect(results[0].plan.id === 'pentecost').toBe(true);
      expect(results[0].day.dayNumber).toBe(2);
      expect(results[0].readings[0].reading.id).toBe('reading-p2');
    });

    it('should return empty array when there are no active subscriptions', async () => {
      const useCase = new GetActivePlansWithTodayReadings(planRepo, subRepo, articleRepo);
      const results = await useCase.execute();
      expect(results).toEqual([]);
    });
  });

  describe('ToggleReadingProgress', () => {
    it('should toggle reading progress without affecting other subscriptions', async () => {
      const subA = await subRepo.subscribe('chronological');
      const subB = await subRepo.subscribe('pentecost');

      const useCase = new ToggleReadingProgress(subRepo);

      // Initial state: not completed
      expect(await subRepo.isReadingCompleted(subA.id, 'reading-c1')).toBe(false);

      // Toggle ON for subA
      const progressA1 = await useCase.execute(subA.id, 'reading-c1');
      expect(progressA1.isCompleted).toBe(true);
      expect(progressA1.completedReadingIds).toContain('reading-c1');
      expect(await subRepo.isReadingCompleted(subA.id, 'reading-c1')).toBe(true);
      // Progress isolation: subB is NOT affected
      expect(await subRepo.isReadingCompleted(subB.id, 'reading-c1')).toBe(false);

      // Toggle OFF for subA
      const progressA2 = await useCase.execute(subA.id, 'reading-c1');
      expect(progressA2.isCompleted).toBe(false);
      expect(progressA2.completedReadingIds).not.toContain('reading-c1');
      expect(await subRepo.isReadingCompleted(subA.id, 'reading-c1')).toBe(false);
    });
  });

  describe('GetPassageVerses', () => {
    it('should retrieve Bible verses for a scheduled reading', async () => {
      const useCase = new GetPassageVerses(bibleRepo);
      const reading = planRepo.readings.find(r => r.id === 'reading-c1')!;

      const verses = await useCase.execute(reading);
      expect(verses.length).toBeGreaterThan(0);
      expect(verses[0].bookId).toBe('GEN');
      expect(verses[0].text).toContain('En el principio');
    });

    it('should retrieve verses by range query object', async () => {
      const useCase = new GetPassageVerses(bibleRepo);
      const verses = await useCase.execute({
        bookId: 'GEN',
        startChapter: 1,
        startVerse: 1,
        endChapter: 1,
        endVerse: 1,
      });
      expect(verses).toHaveLength(1);
      expect(verses[0].verse).toBe(1);
    });
  });

  describe('GetPlanCatalog', () => {
    it('should list plans grouped by archetype with active subscription status', async () => {
      await subRepo.subscribe('pentecost');
      const useCase = new GetPlanCatalog(planRepo, subRepo);

      const catalog = await useCase.execute();

      expect(catalog.annual).toHaveLength(1);
      expect(catalog.annual[0].plan.id).toBe('chronological');
      expect(catalog.annual[0].isSubscribed).toBe(false);
      expect(catalog.annual[0].subscription).toBeNull();

      expect(catalog.thematic).toHaveLength(1);
      expect(catalog.thematic[0].plan.id).toBe('pentecost');
      expect(catalog.thematic[0].isSubscribed).toBe(true);
      expect(catalog.thematic[0].subscription?.isActive).toBe(true);

      expect(catalog.monthly).toHaveLength(0);
      expect(catalog.all).toHaveLength(2);
    });
  });

  describe('SubscribeToPlan', () => {
    it('should enroll user in a plan with starting day', async () => {
      const useCase = new SubscribeToPlan(subRepo, planRepo);
      const sub = await useCase.subscribe('chronological', 5);

      expect(sub.isActive).toBe(true);
      expect(sub.planId).toBe('chronological');
      expect(sub.currentDayNumber).toBe(5);

      const activeSubs = await subRepo.getActiveSubscriptions();
      expect(activeSubs).toHaveLength(1);
    });

    it('should throw an error when subscribing to a non-existent plan', async () => {
      const useCase = new SubscribeToPlan(subRepo, planRepo);
      await expect(useCase.subscribe('non-existent')).rejects.toThrow('Plan not found: non-existent');
    });

    it('should unenroll user from an active plan', async () => {
      const useCase = new SubscribeToPlan(subRepo, planRepo);
      const sub = await useCase.subscribe('pentecost');
      expect(sub.isActive).toBe(true);

      await useCase.unsubscribe('pentecost');
      const activeSubs = await subRepo.getActiveSubscriptions();
      expect(activeSubs).toHaveLength(0);
    });
  });

  describe('Integration with SQLite Repositories', () => {
    let db: ISQLiteDatabase;
    let sqlPlanRepo: SQLitePlanRepository;
    let sqlSubRepo: SQLiteSubscriptionRepository;
    let sqlBibleRepo: SQLiteBibleRepository;
    let sqlArticleRepo: SQLiteArticleRepository;

    beforeEach(async () => {
      db = await DatabaseManager.createInMemory();
      sqlPlanRepo = new SQLitePlanRepository(db);
      sqlSubRepo = new SQLiteSubscriptionRepository(db);
      sqlBibleRepo = new SQLiteBibleRepository(db);
      sqlArticleRepo = new SQLiteArticleRepository(db);
    });

    afterEach(async () => {
      await db.closeAsync();
    });

    it('should get plan catalog from SQLite seed data with 3 archetypes', async () => {
      const getCatalog = new GetPlanCatalog(sqlPlanRepo, sqlSubRepo);
      const catalog = await getCatalog.execute();

      expect(catalog.all.length).toBe(5);
      expect(catalog.annual.length).toBe(2);
      expect(catalog.monthly.length).toBe(1);
      expect(catalog.thematic.length).toBe(2);
      expect(catalog.all.every(c => !c.isSubscribed)).toBe(true);
    });

    it('should subscribe, get active plan with today readings, and toggle progress in SQLite', async () => {
      const subscribeUseCase = new SubscribeToPlan(sqlSubRepo, sqlPlanRepo);
      const getActiveUseCase = new GetActivePlansWithTodayReadings(sqlPlanRepo, sqlSubRepo, sqlArticleRepo);
      const toggleUseCase = new ToggleReadingProgress(sqlSubRepo);

      // Subscribe to thematic plan (pentecost) starting on day 1
      const sub = await subscribeUseCase.subscribe('pentecost', 1);
      expect(sub.isActive).toBe(true);

      // Retrieve active plans with today's readings
      const activePlans = await getActiveUseCase.execute();
      expect(activePlans).toHaveLength(1);
      expect(activePlans[0].plan.id).toBe('pentecost');
      expect(activePlans[0].day.dayNumber).toBe(1);
      expect(activePlans[0].readings.length).toBeGreaterThan(0);
      expect(activePlans[0].readings[0].isCompleted).toBe(false);

      // Toggle reading complete
      const readingId = activePlans[0].readings[0].reading.id;
      const progress1 = await toggleUseCase.execute(sub.id, readingId);
      expect(progress1.isCompleted).toBe(true);
      expect(progress1.completedReadingsCount).toBe(1);

      // Verify active plans reflects completed reading
      const refreshedPlans = await getActiveUseCase.execute();
      expect(refreshedPlans[0].readings[0].isCompleted).toBe(true);

      // Toggle reading back to uncomplete
      const progress2 = await toggleUseCase.execute(sub.id, readingId);
      expect(progress2.isCompleted).toBe(false);
      expect(progress2.completedReadingsCount).toBe(0);
    });
  });
});

