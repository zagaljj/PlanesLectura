import { DatabaseManager, ISQLiteDatabase } from '../../../src/data/sqlite/DatabaseManager';
import { SQLitePlanRepository } from '../../../src/data/repositories/SQLitePlanRepository';
import { SQLiteSubscriptionRepository } from '../../../src/data/repositories/SQLiteSubscriptionRepository';
import { SQLiteBibleRepository } from '../../../src/data/repositories/SQLiteBibleRepository';
import { SQLiteArticleRepository } from '../../../src/data/repositories/SQLiteArticleRepository';
import { BibleVerse } from '../../../src/domain/entities/BibleVerse';
import { StudyArticle } from '../../../src/domain/entities/StudyArticle';

describe('SQLite Repositories Integration Tests', () => {
  let db: ISQLiteDatabase;
  let planRepo: SQLitePlanRepository;
  let subRepo: SQLiteSubscriptionRepository;
  let bibleRepo: SQLiteBibleRepository;
  let articleRepo: SQLiteArticleRepository;

  beforeEach(async () => {
    db = await DatabaseManager.createInMemory();
    planRepo = new SQLitePlanRepository(db);
    subRepo = new SQLiteSubscriptionRepository(db);
    bibleRepo = new SQLiteBibleRepository(db);
    articleRepo = new SQLiteArticleRepository(db);
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  describe('SQLitePlanRepository', () => {
    it('should query all plans from seed data', async () => {
      const plans = await planRepo.getAllPlans();
      expect(plans.length).toBe(5);
      const planIds = plans.map(p => p.id);
      expect(planIds).toContain('chronological');
      expect(planIds).toContain('mccheyne');
      expect(planIds).toContain('ued-september-2026');
      expect(planIds).toContain('pentecost');
      expect(planIds).toContain('passover');
    });

    it('should find plan by id', async () => {
      const plan = await planRepo.getPlanById('chronological');
      expect(plan).not.toBeNull();
      expect(plan?.id).toBe('chronological');
      expect(plan?.archetype).toBe('annual');
      expect(plan?.totalDays).toBe(365);

      const nonExistent = await planRepo.getPlanById('non-existent');
      expect(nonExistent).toBeNull();
    });

    it('should filter plans by archetype', async () => {
      const annualPlans = await planRepo.getPlansByArchetype('annual');
      expect(annualPlans.length).toBe(2);
      expect(annualPlans.every(p => p.archetype === 'annual')).toBe(true);

      const thematicPlans = await planRepo.getPlansByArchetype('thematic');
      expect(thematicPlans.length).toBe(2);

      const monthlyPlans = await planRepo.getPlansByArchetype('monthly');
      expect(monthlyPlans.length).toBe(1);
    });

    it('should get days and readings for a plan', async () => {
      const days = await planRepo.getDaysForPlan('pentecost');
      expect(days.length).toBeGreaterThan(0);
      expect(days[0].dayNumber).toBe(1);

      // Verify deserialized reflection questions and explicit articles if present
      const dayWithQuestions = days.find(d => (d.reflectionQuestions?.length ?? 0) > 0);
      expect(dayWithQuestions).toBeDefined();
      expect(Array.isArray(dayWithQuestions?.reflectionQuestions)).toBe(true);

      const day1 = await planRepo.getDayByPlanAndNumber('pentecost', 1);
      expect(day1).not.toBeNull();
      expect(day1?.dayNumber).toBe(1);

      const readings = await planRepo.getReadingsForDay(day1!.id);
      expect(readings.length).toBeGreaterThan(0);
      expect(readings[0].dayId).toBe(day1!.id);
      expect(readings[0].citationLabel).toBeDefined();
    });

    it('should get days with readings for a plan in batch', async () => {
      const daysWithReadings = await planRepo.getDaysWithReadingsForPlan('ued-september-2026');
      expect(daysWithReadings.length).toBe(30);
      expect(daysWithReadings[0].day.dayNumber).toBe(1);
      expect(daysWithReadings[0].readings.length).toBe(1);
    });

    it('should get a single day with its readings', async () => {
      const dayWithReadings = await planRepo.getDayWithReadings('chronological', 1);
      expect(dayWithReadings).not.toBeNull();
      expect(dayWithReadings?.day.dayNumber).toBe(1);
      expect(dayWithReadings?.readings.length).toBeGreaterThan(0);

      const missing = await planRepo.getDayWithReadings('chronological', 999);
      expect(missing).toBeNull();
    });
  });

  describe('SQLiteSubscriptionRepository', () => {
    it('should query plans by archetype and manage user subscriptions', async () => {
      const plans = await planRepo.getAllPlans();
      expect(plans.length).toBeGreaterThan(0);

      const sub = await subRepo.subscribe(plans[0].id);
      expect(sub.isActive).toBe(true);
      expect(sub.planId).toBe(plans[0].id);

      const activeSubs = await subRepo.getActiveSubscriptions();
      expect(activeSubs).toHaveLength(1);
      expect(activeSubs[0].id).toBe(sub.id);
    });

    it('should reactivate an inactive subscription when subscribing again', async () => {
      const sub = await subRepo.subscribe('chronological');
      expect(sub.isActive).toBe(true);

      await subRepo.unsubscribe(sub.id);
      const activeAfterUnsub = await subRepo.getActiveSubscriptions();
      expect(activeAfterUnsub).toHaveLength(0);

      const resub = await subRepo.subscribe('chronological');
      expect(resub.isActive).toBe(true);
      expect(resub.id).toBe(sub.id);

      const activeAfterResub = await subRepo.getActiveSubscriptions();
      expect(activeAfterResub).toHaveLength(1);
    });

    it('should update current day number for subscription', async () => {
      const sub = await subRepo.subscribe('chronological');
      expect(sub.currentDayNumber).toBe(1);

      await subRepo.updateCurrentDay(sub.id, 5);
      const updated = await subRepo.getSubscriptionById(sub.id);
      expect(updated?.currentDayNumber).toBe(5);
    });

    it('should mark, unmark reading, and track progress accurately', async () => {
      const sub = await subRepo.subscribe('ued-september-2026');
      const daysWithReadings = await planRepo.getDaysWithReadingsForPlan('ued-september-2026');
      const reading1 = daysWithReadings[0].readings[0];
      const reading2 = daysWithReadings[1].readings[0];

      // Initial progress: 0 completed
      let progress = await subRepo.getProgressForSubscription(sub.id);
      expect(progress.completedReadingsCount).toBe(0);
      expect(progress.totalReadingsCount).toBe(30);
      expect(progress.percentage).toBe(0);
      expect(await subRepo.isReadingCompleted(sub.id, reading1.id)).toBe(false);

      // Mark reading 1 complete
      await subRepo.markReadingComplete(sub.id, reading1.id);
      expect(await subRepo.isReadingCompleted(sub.id, reading1.id)).toBe(true);

      progress = await subRepo.getProgressForSubscription(sub.id);
      expect(progress.completedReadingsCount).toBe(1);
      expect(progress.completedReadingIds).toContain(reading1.id);

      // Mark reading 2 complete
      await subRepo.markReadingComplete(sub.id, reading2.id);
      progress = await subRepo.getProgressForSubscription(sub.id);
      expect(progress.completedReadingsCount).toBe(2);

      // Unmark reading 1
      await subRepo.unmarkReading(sub.id, reading1.id);
      expect(await subRepo.isReadingCompleted(sub.id, reading1.id)).toBe(false);

      progress = await subRepo.getProgressForSubscription(sub.id);
      expect(progress.completedReadingsCount).toBe(1);
      expect(progress.completedReadingIds).not.toContain(reading1.id);
      expect(progress.completedReadingIds).toContain(reading2.id);
    });

    it('should isolate progress between different subscriptions', async () => {
      const subA = await subRepo.subscribe('ued-september-2026');
      const subB = await subRepo.subscribe('chronological');

      const uedDays = await planRepo.getDaysWithReadingsForPlan('ued-september-2026');
      const reading = uedDays[0].readings[0];

      await subRepo.markReadingComplete(subA.id, reading.id);

      expect(await subRepo.isReadingCompleted(subA.id, reading.id)).toBe(true);
      expect(await subRepo.isReadingCompleted(subB.id, reading.id)).toBe(false);

      const progressA = await subRepo.getProgressForSubscription(subA.id);
      const progressB = await subRepo.getProgressForSubscription(subB.id);

      expect(progressA.completedReadingsCount).toBe(1);
      expect(progressB.completedReadingsCount).toBe(0);
    });
  });

  describe('SQLiteBibleRepository', () => {
    it('should insert verses and query ranges accurately', async () => {
      const verses = [
        new BibleVerse({ bookId: 'GEN', chapter: 1, verse: 1, text: 'En el principio creó Dios los cielos y la tierra.' }),
        new BibleVerse({ bookId: 'GEN', chapter: 1, verse: 2, text: 'Y la tierra estaba desordenada y vacía...' }),
        new BibleVerse({ bookId: 'GEN', chapter: 1, verse: 3, text: 'Y dijo Dios: Sea la luz; y fue la luz.' }),
        new BibleVerse({ bookId: 'GEN', chapter: 1, verse: 4, text: 'Y vio Dios que la luz era buena...' }),
        new BibleVerse({ bookId: 'GEN', chapter: 2, verse: 1, text: 'Fueron, pues, acabados los cielos y la tierra...' }),
        new BibleVerse({ bookId: 'EXO', chapter: 1, verse: 1, text: 'Estos son los nombres de los hijos de Israel...' }),
      ];

      await bibleRepo.insertVerses(verses);

      // Query single chapter verse range
      const range1 = await bibleRepo.getVersesForRange({
        bookId: 'GEN',
        startChapter: 1,
        startVerse: 2,
        endChapter: 1,
        endVerse: 3,
      });
      expect(range1).toHaveLength(2);
      expect(range1[0].verse).toBe(2);
      expect(range1[1].verse).toBe(3);

      // Query full chapter
      const fullChapter = await bibleRepo.getVersesForRange({
        bookId: 'GEN',
        startChapter: 1,
      });
      expect(fullChapter).toHaveLength(4);

      // Query multi-chapter range
      const multiChapter = await bibleRepo.getVersesForRange({
        bookId: 'GEN',
        startChapter: 1,
        startVerse: 3,
        endChapter: 2,
        endVerse: 1,
      });
      expect(multiChapter).toHaveLength(3); // Gen 1:3, 1:4, 2:1
      expect(multiChapter.map(v => `${v.chapter}:${v.verse}`)).toEqual(['1:3', '1:4', '2:1']);

      // Positional parameter overload check
      const positional = await bibleRepo.getVersesForRange('GEN', 1, 1, 1, 2);
      expect(positional).toHaveLength(2);
    });

    it('should get single verse by coordinates', async () => {
      await bibleRepo.insertVerses([
        new BibleVerse({ bookId: 'PSA', chapter: 23, verse: 1, text: 'Jehová es mi pastor; nada me faltará.' }),
      ]);

      const verse = await bibleRepo.getVerse('PSA', 23, 1);
      expect(verse).not.toBeNull();
      expect(verse?.text).toBe('Jehová es mi pastor; nada me faltará.');

      const missing = await bibleRepo.getVerse('PSA', 23, 99);
      expect(missing).toBeNull();
    });
  });

  describe('SQLiteArticleRepository', () => {
    it('should upsert articles and query by book or titles', async () => {
      const articles = [
        new StudyArticle({
          id: 'art-1',
          title: 'El don de hablar en lenguas',
          url: 'https://vidaesperanzayverdad.org/art-1',
          bookId: 'ACT',
          section: 'Doctrina',
          lastSyncedAt: '2026-10-01T00:00:00Z',
        }),
        new StudyArticle({
          id: 'art-2',
          title: '¿Qué es el Pentecostés?',
          url: 'https://vidaesperanzayverdad.org/art-2',
          bookId: 'ACT',
          section: 'Fiestas',
          lastSyncedAt: '2026-10-01T00:00:00Z',
        }),
        new StudyArticle({
          id: 'art-3',
          title: 'El significado de la Pascua',
          url: 'https://vidaesperanzayverdad.org/art-3',
          bookId: 'EXO',
          section: 'Fiestas',
          lastSyncedAt: '2026-10-01T00:00:00Z',
        }),
      ];

      await articleRepo.upsertArticles(articles);

      // Query by book
      const actArticles = await articleRepo.getArticlesByBook('ACT');
      expect(actArticles).toHaveLength(2);
      expect(actArticles.map(a => a.id).sort()).toEqual(['art-1', 'art-2']);

      const exoArticles = await articleRepo.getArticlesByBook('EXO');
      expect(exoArticles).toHaveLength(1);
      expect(exoArticles[0].id).toBe('art-3');

      // Query by titles (curated tier matching)
      const matchedArticles = await articleRepo.getArticlesByTitles([
        'El don de hablar en lenguas',
        'El significado de la Pascua',
      ]);
      expect(matchedArticles).toHaveLength(2);
      expect(matchedArticles.map(a => a.id).sort()).toEqual(['art-1', 'art-3']);

      // Empty title list should return empty array
      const emptyMatch = await articleRepo.getArticlesByTitles([]);
      expect(emptyMatch).toEqual([]);

      // Upsert update existing article by URL
      const updatedArticle = new StudyArticle({
        id: 'art-1-updated',
        title: 'El don de hablar en lenguas (Actualizado)',
        url: 'https://vidaesperanzayverdad.org/art-1',
        bookId: 'ACT',
        section: 'Doctrina Avanzada',
        lastSyncedAt: '2026-10-02T00:00:00Z',
      });
      await articleRepo.upsertArticles([updatedArticle]);

      const refreshed = await articleRepo.getArticlesByTitles(['El don de hablar en lenguas (Actualizado)']);
      expect(refreshed).toHaveLength(1);
      expect(refreshed[0].title).toBe('El don de hablar en lenguas (Actualizado)');
      expect(refreshed[0].section).toBe('Doctrina Avanzada');
    });
  });
});
