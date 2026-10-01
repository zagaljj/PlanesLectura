import { PlanArchetype } from '../../domain/entities/ReadingPlan';

export interface ParsedReading {
  id: string;
  dayId: string;
  orderIndex: number;
  bookId: string;
  bookName: string;
  startChapter: number;
  startVerse?: number;
  endChapter: number;
  endVerse?: number;
  citationLabel: string;
}

export interface ParsedDay {
  id: string;
  planId: string;
  dayNumber: number;
  title?: string;
  month?: number;
  dayOfMonth?: number;
  devotionalNotes?: string;
  reflectionQuestions?: string[];
  explicitArticleTitles?: string[];
  readings: ParsedReading[];
}

export interface ParsedPlan {
  id: string;
  title: string;
  description: string;
  archetype: PlanArchetype;
  totalDays: number;
  isFeatured?: boolean;
}

export interface ParsedPlanResult {
  plan: ParsedPlan;
  days: ParsedDay[];
}
