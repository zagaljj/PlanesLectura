import { AnnualPlanParser } from '../../src/data/parsers/AnnualPlanParser';
import { ThematicPlanParser } from '../../src/data/parsers/ThematicPlanParser';
import { MonthlyPlanParser } from '../../src/data/parsers/MonthlyPlanParser';

describe('PDF Ingestion Parsers', () => {
  it('should parse 365 days with up to 4 daily readings for M\'Cheyne plan', async () => {
    const parser = new AnnualPlanParser();
    const result = await parser.parseFile('Programa_avanzado_de_lectura_de_la_biblia.pdf');
    expect(result.days).toHaveLength(365);
    expect(result.days[0].readings.length).toBeGreaterThanOrEqual(1);
    expect(result.plan.archetype).toBe('annual');
    expect(result.plan.totalDays).toBe(365);
  });

  it('should parse 365 days for Chronological plan with multi-reading fidelity', async () => {
    const parser = new AnnualPlanParser();
    const result = await parser.parseFile('Programa_cronologico_de_la_biblia.pdf');
    expect(result.days).toHaveLength(365);
    expect(result.days[0].readings.length).toBeGreaterThanOrEqual(1);
    expect(result.plan.archetype).toBe('annual');
    expect(result.plan.totalDays).toBe(365);

    // Verify Day 121 (May 1) preserves all readings (2 Samuel 5:1-10 and 1 Crónicas 11-12)
    const day121 = result.days[120];
    expect(day121.dayNumber).toBe(121);
    expect(day121.month).toBe(5);
    expect(day121.dayOfMonth).toBe(1);
    expect(day121.readings).toHaveLength(2);
    expect(day121.readings[0].bookId).toBe('2SA');
    expect(day121.readings[0].citationLabel).toBe('2 Samuel 5:1-10');
    expect(day121.readings[1].bookId).toBe('1CH');
    expect(day121.readings[1].citationLabel).toBe('1 Crónicas 11-12');

    // Verify Day 262 (September 19) preserves unbulleted secondary reading (Esdras 4-6 and Salmo 137)
    const day262 = result.days[261];
    expect(day262.dayNumber).toBe(262);
    expect(day262.month).toBe(9);
    expect(day262.dayOfMonth).toBe(19);
    expect(day262.readings).toHaveLength(2);
    expect(day262.readings[0].bookId).toBe('EZR');
    expect(day262.readings[0].citationLabel).toBe('Esdras 4-6');
    expect(day262.readings[1].bookId).toBe('PSA');
    expect(day262.readings[1].citationLabel).toBe('Salmo 137');

    // Verify zero readings fell back to GEN when citation was not Genesis
    const invalidGenFallbacks = result.days.flatMap(d =>
      d.readings.filter(
        r => r.bookId === 'GEN' && !/génesis|genesis/i.test(r.citationLabel)
      )
    );
    expect(invalidGenFallbacks).toHaveLength(0);

    // Verify multi-reading days are present
    const multiReadingDays = result.days.filter(d => d.readings.length > 1);
    expect(multiReadingDays.length).toBeGreaterThanOrEqual(60);
  });

  it('should parse 30 days for UED Monthly Challenge plan', async () => {
    const parser = new MonthlyPlanParser();
    const result = await parser.parseFile('UED_Septiembre_2026.pdf');
    expect(result.days).toHaveLength(30);
    expect(result.days[0].readings.length).toBeGreaterThanOrEqual(1);
    expect(result.plan.archetype).toBe('monthly');
    expect(result.plan.totalDays).toBe(30);
  });

  it('should parse thematic plans and extract questions and resources', async () => {
    const parser = new ThematicPlanParser();
    const result = await parser.parseFile('VEV_PLT_Hechos-2-Pentecostes.pdf');
    expect(result.days.length).toBeGreaterThan(0);
    expect(result.days.some(d => (d.reflectionQuestions?.length ?? 0) > 0)).toBe(true);
    expect(result.days.some(d => (d.explicitArticleTitles?.length ?? 0) > 0)).toBe(true);
    expect(result.plan.archetype).toBe('thematic');
  });

  it('should parse Passover thematic plan and extract reflection and articles', async () => {
    const parser = new ThematicPlanParser();
    const result = await parser.parseFile('VEV_PLT_Preparacion-para-la-Pascua.pdf');
    expect(result.days).toHaveLength(6);
    expect(result.days.some(d => (d.reflectionQuestions?.length ?? 0) > 0)).toBe(true);
    expect(result.days.some(d => (d.explicitArticleTitles?.length ?? 0) > 0)).toBe(true);
    expect(result.plan.archetype).toBe('thematic');
  });

  it('should generate output that successfully instantiates domain entities', async () => {
    const parser = new ThematicPlanParser();
    const result = await parser.parseFile('VEV_PLT_Hechos-2-Pentecostes.pdf');
    const { ReadingPlan } = await import('../../src/domain/entities/ReadingPlan');
    const { PlanDay } = await import('../../src/domain/entities/PlanDay');
    const { PlanReading } = await import('../../src/domain/entities/PlanReading');

    const domainPlan = new ReadingPlan(result.plan);
    expect(domainPlan.id).toBe('pentecost');

    for (const day of result.days) {
      const domainDay = new PlanDay(day);
      expect(domainDay.id).toBe(day.id);
      for (const reading of day.readings) {
        const domainReading = new PlanReading(reading);
        expect(domainReading.id).toBe(reading.id);
      }
    }
  });
});
