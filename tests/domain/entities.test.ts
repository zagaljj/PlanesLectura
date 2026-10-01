import { ReadingPlan, PlanArchetype } from '../../src/domain/entities/ReadingPlan';
import { PlanDay } from '../../src/domain/entities/PlanDay';
import { PlanReading } from '../../src/domain/entities/PlanReading';
import { PlanSubscription } from '../../src/domain/entities/PlanSubscription';
import { StudyArticle } from '../../src/domain/entities/StudyArticle';
import { BibleVerse } from '../../src/domain/entities/BibleVerse';

describe('Domain Entities', () => {
  describe('ReadingPlan', () => {
    it('should construct a valid ReadingPlan with required archetype', () => {
      const plan = new ReadingPlan({
        id: 'plan-1',
        title: 'Cronológico',
        description: 'Lectura en orden histórico',
        archetype: 'annual',
        totalDays: 365,
      });

      expect(plan.id).toBe('plan-1');
      expect(plan.title).toBe('Cronológico');
      expect(plan.description).toBe('Lectura en orden histórico');
      expect(plan.archetype).toBe('annual');
      expect(plan.totalDays).toBe(365);
      expect(plan.isFeatured).toBe(false);
    });

    it('should construct a featured thematic plan', () => {
      const plan = new ReadingPlan({
        id: 'pentecost-plan',
        title: 'Hechos 2: Pentecostés',
        description: 'Estudio temático de Pentecostés',
        archetype: 'thematic',
        totalDays: 7,
        isFeatured: true,
      });

      expect(plan.archetype).toBe('thematic');
      expect(plan.isFeatured).toBe(true);
    });

    it('should throw an error for empty id or title', () => {
      expect(() => {
        new ReadingPlan({
          id: '',
          title: 'Plan',
          description: 'Desc',
          archetype: 'annual',
          totalDays: 365,
        });
      }).toThrow('ReadingPlan id cannot be empty');

      expect(() => {
        new ReadingPlan({
          id: 'plan-1',
          title: '   ',
          description: 'Desc',
          archetype: 'annual',
          totalDays: 365,
        });
      }).toThrow('ReadingPlan title cannot be empty');
    });

    it('should throw an error for invalid archetype', () => {
      expect(() => {
        new ReadingPlan({
          id: 'plan-1',
          title: 'Test',
          description: 'Desc',
          archetype: 'weekly' as unknown as PlanArchetype,
          totalDays: 7,
        });
      }).toThrow("Invalid archetype: weekly. Must be 'annual', 'monthly', or 'thematic'");
    });

    it('should throw an error for invalid totalDays', () => {
      expect(() => {
        new ReadingPlan({
          id: 'plan-1',
          title: 'Test',
          description: 'Desc',
          archetype: 'monthly',
          totalDays: 0,
        });
      }).toThrow('ReadingPlan totalDays must be a positive integer');

      expect(() => {
        new ReadingPlan({
          id: 'plan-1',
          title: 'Test',
          description: 'Desc',
          archetype: 'monthly',
          totalDays: 30.5,
        });
      }).toThrow('ReadingPlan totalDays must be a positive integer');
    });
  });

  describe('PlanDay', () => {
    it('should construct a valid PlanDay with required fields', () => {
      const day = new PlanDay({
        id: 'day-1',
        planId: 'plan-1',
        dayNumber: 1,
      });

      expect(day.id).toBe('day-1');
      expect(day.planId).toBe('plan-1');
      expect(day.dayNumber).toBe(1);
      expect(day.title).toBeUndefined();
      expect(day.reflectionQuestions).toBeUndefined();
      expect(day.explicitArticleTitles).toBeUndefined();
    });

    it('should support reflection questions and explicit articles on PlanDay', () => {
      const day = new PlanDay({
        id: 'day-2',
        planId: 'pentecost-1',
        dayNumber: 2,
        title: 'Día 2',
        month: 5,
        dayOfMonth: 15,
        devotionalNotes: 'Notas devocionales para el día.',
        reflectionQuestions: ['¿Por qué se sorprendían?'],
        explicitArticleTitles: ['¿Qué pasa si no puedo hablar en lenguas?'],
      });

      expect(day.reflectionQuestions).toHaveLength(1);
      expect(day.reflectionQuestions?.[0]).toBe('¿Por qué se sorprendían?');
      expect(day.explicitArticleTitles?.[0]).toContain('lenguas');
      expect(day.month).toBe(5);
      expect(day.dayOfMonth).toBe(15);
      expect(day.devotionalNotes).toBe('Notas devocionales para el día.');
    });

    it('should validate dayNumber, month, and dayOfMonth', () => {
      expect(() => {
        new PlanDay({
          id: 'day-1',
          planId: 'plan-1',
          dayNumber: 0,
        });
      }).toThrow('PlanDay dayNumber must be an integer >= 1');

      expect(() => {
        new PlanDay({
          id: 'day-1',
          planId: 'plan-1',
          dayNumber: 1,
          month: 13,
        });
      }).toThrow('PlanDay month must be between 1 and 12');

      expect(() => {
        new PlanDay({
          id: 'day-1',
          planId: 'plan-1',
          dayNumber: 1,
          dayOfMonth: 32,
        });
      }).toThrow('PlanDay dayOfMonth must be between 1 and 31');
    });

    it('should protect reflectionQuestions and explicitArticleTitles from external mutation', () => {
      const questions = ['Q1'];
      const articles = ['A1'];
      const day = new PlanDay({
        id: 'day-1',
        planId: 'plan-1',
        dayNumber: 1,
        reflectionQuestions: questions,
        explicitArticleTitles: articles,
      });

      questions.push('Q2');
      articles.push('A2');

      expect(day.reflectionQuestions).toEqual(['Q1']);
      expect(day.explicitArticleTitles).toEqual(['A1']);
    });
  });

  describe('PlanReading', () => {
    it('should construct a valid PlanReading', () => {
      const reading = new PlanReading({
        id: 'reading-1',
        dayId: 'day-1',
        orderIndex: 0,
        bookId: 'GEN',
        bookName: 'Génesis',
        startChapter: 1,
        startVerse: 1,
        endChapter: 2,
        endVerse: 25,
        citationLabel: 'Génesis 1:1-2:25',
      });

      expect(reading.id).toBe('reading-1');
      expect(reading.dayId).toBe('day-1');
      expect(reading.orderIndex).toBe(0);
      expect(reading.bookId).toBe('GEN');
      expect(reading.bookName).toBe('Génesis');
      expect(reading.startChapter).toBe(1);
      expect(reading.startVerse).toBe(1);
      expect(reading.endChapter).toBe(2);
      expect(reading.endVerse).toBe(25);
      expect(reading.citationLabel).toBe('Génesis 1:1-2:25');
    });

    it('should throw an error for invalid chapter range', () => {
      expect(() => {
        new PlanReading({
          id: 'reading-1',
          dayId: 'day-1',
          orderIndex: 0,
          bookId: 'GEN',
          bookName: 'Génesis',
          startChapter: 5,
          endChapter: 3,
          citationLabel: 'Génesis 5-3',
        });
      }).toThrow('PlanReading endChapter must be >= startChapter');
    });

    it('should throw an error for invalid verse range within same chapter', () => {
      expect(() => {
        new PlanReading({
          id: 'reading-1',
          dayId: 'day-1',
          orderIndex: 0,
          bookId: 'GEN',
          bookName: 'Génesis',
          startChapter: 1,
          startVerse: 20,
          endChapter: 1,
          endVerse: 10,
          citationLabel: 'Génesis 1:20-10',
        });
      }).toThrow('PlanReading endVerse must be >= startVerse within the same chapter');
    });

    it('should throw an error for negative orderIndex or chapters < 1', () => {
      expect(() => {
        new PlanReading({
          id: 'reading-1',
          dayId: 'day-1',
          orderIndex: -1,
          bookId: 'GEN',
          bookName: 'Génesis',
          startChapter: 1,
          endChapter: 1,
          citationLabel: 'Génesis 1',
        });
      }).toThrow('PlanReading orderIndex must be an integer >= 0');

      expect(() => {
        new PlanReading({
          id: 'reading-1',
          dayId: 'day-1',
          orderIndex: 0,
          bookId: 'GEN',
          bookName: 'Génesis',
          startChapter: 0,
          endChapter: 1,
          citationLabel: 'Génesis 0-1',
        });
      }).toThrow('PlanReading startChapter must be an integer >= 1');
    });
  });

  describe('PlanSubscription', () => {
    it('should construct a valid PlanSubscription', () => {
      const sub = new PlanSubscription({
        id: 'sub-1',
        planId: 'plan-1',
        startedAt: '2026-10-01T12:00:00Z',
        isActive: true,
        currentDayNumber: 1,
      });

      expect(sub.id).toBe('sub-1');
      expect(sub.planId).toBe('plan-1');
      expect(sub.startedAt).toBe('2026-10-01T12:00:00Z');
      expect(sub.isActive).toBe(true);
      expect(sub.currentDayNumber).toBe(1);
    });

    it('should validate currentDayNumber >= 1', () => {
      expect(() => {
        new PlanSubscription({
          id: 'sub-1',
          planId: 'plan-1',
          startedAt: '2026-10-01T12:00:00Z',
          isActive: true,
          currentDayNumber: 0,
        });
      }).toThrow('PlanSubscription currentDayNumber must be an integer >= 1');
    });

    it('should produce updated copies immutably', () => {
      const sub = new PlanSubscription({
        id: 'sub-1',
        planId: 'plan-1',
        startedAt: '2026-10-01T12:00:00Z',
        isActive: true,
        currentDayNumber: 5,
      });

      const nextDaySub = sub.withCurrentDayNumber(6);
      expect(nextDaySub.currentDayNumber).toBe(6);
      expect(sub.currentDayNumber).toBe(5);

      const pausedSub = sub.withActive(false);
      expect(pausedSub.isActive).toBe(false);
      expect(sub.isActive).toBe(true);
    });
  });

  describe('StudyArticle', () => {
    it('should construct a valid StudyArticle', () => {
      const article = new StudyArticle({
        id: 'article-1',
        title: 'El significado de Pentecostés',
        url: 'https://vidaesperanzayverdad.org/fiestas-biblicas/pentecostes/',
        bookId: 'ACT',
        section: 'Fiestas Bíblicas',
        lastSyncedAt: '2026-10-01T12:00:00Z',
      });

      expect(article.id).toBe('article-1');
      expect(article.title).toBe('El significado de Pentecostés');
      expect(article.url).toBe('https://vidaesperanzayverdad.org/fiestas-biblicas/pentecostes/');
      expect(article.bookId).toBe('ACT');
      expect(article.section).toBe('Fiestas Bíblicas');
      expect(article.lastSyncedAt).toBe('2026-10-01T12:00:00Z');
    });

    it('should throw an error for empty required fields', () => {
      expect(() => {
        new StudyArticle({
          id: '',
          title: 'Title',
          url: 'https://example.com',
          section: 'Section',
          lastSyncedAt: '2026-10-01T12:00:00Z',
        });
      }).toThrow('StudyArticle id cannot be empty');

      expect(() => {
        new StudyArticle({
          id: 'art-1',
          title: 'Title',
          url: '',
          section: 'Section',
          lastSyncedAt: '2026-10-01T12:00:00Z',
        });
      }).toThrow('StudyArticle url cannot be empty');
    });
  });

  describe('BibleVerse', () => {
    it('should construct a valid BibleVerse', () => {
      const verse = new BibleVerse({
        bookId: 'GEN',
        chapter: 1,
        verse: 1,
        text: 'En el principio creó Dios los cielos y la tierra.',
      });

      expect(verse.bookId).toBe('GEN');
      expect(verse.chapter).toBe(1);
      expect(verse.verse).toBe(1);
      expect(verse.text).toBe('En el principio creó Dios los cielos y la tierra.');
    });

    it('should validate chapter, verse, and bookId', () => {
      expect(() => {
        new BibleVerse({
          bookId: '',
          chapter: 1,
          verse: 1,
          text: 'Texto',
        });
      }).toThrow('BibleVerse bookId cannot be empty');

      expect(() => {
        new BibleVerse({
          bookId: 'GEN',
          chapter: 0,
          verse: 1,
          text: 'Texto',
        });
      }).toThrow('BibleVerse chapter must be an integer >= 1');

      expect(() => {
        new BibleVerse({
          bookId: 'GEN',
          chapter: 1,
          verse: 0,
          text: 'Texto',
        });
      }).toThrow('BibleVerse verse must be an integer >= 1');

      expect(() => {
        new BibleVerse({
          bookId: 'GEN',
          chapter: 1,
          verse: 1,
          text: '   ',
        });
      }).toThrow('BibleVerse text cannot be empty');
    });
  });
});
