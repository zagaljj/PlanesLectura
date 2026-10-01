export type PlanArchetype = 'annual' | 'monthly' | 'thematic';

export interface ReadingPlanProps {
  id: string;
  title: string;
  description: string;
  archetype: PlanArchetype;
  totalDays: number;
  isFeatured?: boolean;
}

export class ReadingPlan {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly archetype: PlanArchetype;
  readonly totalDays: number;
  readonly isFeatured: boolean;

  constructor(props: ReadingPlanProps) {
    if (!props.id || props.id.trim() === '') {
      throw new Error('ReadingPlan id cannot be empty');
    }
    if (!props.title || props.title.trim() === '') {
      throw new Error('ReadingPlan title cannot be empty');
    }
    if (!['annual', 'monthly', 'thematic'].includes(props.archetype)) {
      throw new Error(`Invalid archetype: ${props.archetype}. Must be 'annual', 'monthly', or 'thematic'`);
    }
    if (!Number.isInteger(props.totalDays) || props.totalDays <= 0) {
      throw new Error('ReadingPlan totalDays must be a positive integer');
    }

    this.id = props.id.trim();
    this.title = props.title.trim();
    this.description = props.description ?? '';
    this.archetype = props.archetype;
    this.totalDays = props.totalDays;
    this.isFeatured = Boolean(props.isFeatured);

    Object.freeze(this);
  }
}
