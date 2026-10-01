import { ReadingPlan, PlanArchetype, PlanDay, PlanReading } from '../entities';

export interface PlanDayWithReadings {
  day: PlanDay;
  readings: PlanReading[];
}

export interface PlanRepository {
  getAllPlans(): Promise<ReadingPlan[]>;
  getPlanById(id: string): Promise<ReadingPlan | null>;
  getPlansByArchetype(archetype: PlanArchetype): Promise<ReadingPlan[]>;
  getDaysForPlan(planId: string): Promise<PlanDay[]>;
  getDayByPlanAndNumber(planId: string, dayNumber: number): Promise<PlanDay | null>;
  getReadingsForDay(dayId: string): Promise<PlanReading[]>;
  getDaysWithReadingsForPlan(planId: string): Promise<PlanDayWithReadings[]>;
  getDayWithReadings(planId: string, dayNumber: number): Promise<PlanDayWithReadings | null>;
}
