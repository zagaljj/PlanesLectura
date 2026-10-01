export interface PlanDayProps {
  id: string;
  planId: string;
  dayNumber: number;
  title?: string;
  month?: number;
  dayOfMonth?: number;
  devotionalNotes?: string;
  reflectionQuestions?: string[];
  explicitArticleTitles?: string[];
}

export class PlanDay {
  readonly id: string;
  readonly planId: string;
  readonly dayNumber: number;
  readonly title?: string;
  readonly month?: number;
  readonly dayOfMonth?: number;
  readonly devotionalNotes?: string;
  readonly reflectionQuestions?: readonly string[];
  readonly explicitArticleTitles?: readonly string[];

  constructor(props: PlanDayProps) {
    if (!props.id || props.id.trim() === '') {
      throw new Error('PlanDay id cannot be empty');
    }
    if (!props.planId || props.planId.trim() === '') {
      throw new Error('PlanDay planId cannot be empty');
    }
    if (!Number.isInteger(props.dayNumber) || props.dayNumber < 1) {
      throw new Error('PlanDay dayNumber must be an integer >= 1');
    }
    if (props.month !== undefined && (!Number.isInteger(props.month) || props.month < 1 || props.month > 12)) {
      throw new Error('PlanDay month must be between 1 and 12');
    }
    if (props.dayOfMonth !== undefined && (!Number.isInteger(props.dayOfMonth) || props.dayOfMonth < 1 || props.dayOfMonth > 31)) {
      throw new Error('PlanDay dayOfMonth must be between 1 and 31');
    }

    this.id = props.id.trim();
    this.planId = props.planId.trim();
    this.dayNumber = props.dayNumber;
    this.title = props.title;
    this.month = props.month;
    this.dayOfMonth = props.dayOfMonth;
    this.devotionalNotes = props.devotionalNotes;
    this.reflectionQuestions = props.reflectionQuestions
      ? Object.freeze([...props.reflectionQuestions])
      : undefined;
    this.explicitArticleTitles = props.explicitArticleTitles
      ? Object.freeze([...props.explicitArticleTitles])
      : undefined;

    Object.freeze(this);
  }
}
