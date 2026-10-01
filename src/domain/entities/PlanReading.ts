export interface PlanReadingProps {
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

export class PlanReading {
  readonly id: string;
  readonly dayId: string;
  readonly orderIndex: number;
  readonly bookId: string;
  readonly bookName: string;
  readonly startChapter: number;
  readonly startVerse?: number;
  readonly endChapter: number;
  readonly endVerse?: number;
  readonly citationLabel: string;

  constructor(props: PlanReadingProps) {
    if (!props.id || props.id.trim() === '') {
      throw new Error('PlanReading id cannot be empty');
    }
    if (!props.dayId || props.dayId.trim() === '') {
      throw new Error('PlanReading dayId cannot be empty');
    }
    if (!Number.isInteger(props.orderIndex) || props.orderIndex < 0) {
      throw new Error('PlanReading orderIndex must be an integer >= 0');
    }
    if (!props.bookId || props.bookId.trim() === '') {
      throw new Error('PlanReading bookId cannot be empty');
    }
    if (!props.bookName || props.bookName.trim() === '') {
      throw new Error('PlanReading bookName cannot be empty');
    }
    if (!Number.isInteger(props.startChapter) || props.startChapter < 1) {
      throw new Error('PlanReading startChapter must be an integer >= 1');
    }
    if (!Number.isInteger(props.endChapter) || props.endChapter < 1) {
      throw new Error('PlanReading endChapter must be an integer >= 1');
    }
    if (props.endChapter < props.startChapter) {
      throw new Error('PlanReading endChapter must be >= startChapter');
    }
    if (props.startVerse !== undefined && (!Number.isInteger(props.startVerse) || props.startVerse < 1)) {
      throw new Error('PlanReading startVerse must be an integer >= 1');
    }
    if (props.endVerse !== undefined && (!Number.isInteger(props.endVerse) || props.endVerse < 1)) {
      throw new Error('PlanReading endVerse must be an integer >= 1');
    }
    if (
      props.startChapter === props.endChapter &&
      props.startVerse !== undefined &&
      props.endVerse !== undefined &&
      props.endVerse < props.startVerse
    ) {
      throw new Error('PlanReading endVerse must be >= startVerse within the same chapter');
    }
    if (!props.citationLabel || props.citationLabel.trim() === '') {
      throw new Error('PlanReading citationLabel cannot be empty');
    }

    this.id = props.id.trim();
    this.dayId = props.dayId.trim();
    this.orderIndex = props.orderIndex;
    this.bookId = props.bookId.trim();
    this.bookName = props.bookName.trim();
    this.startChapter = props.startChapter;
    this.startVerse = props.startVerse;
    this.endChapter = props.endChapter;
    this.endVerse = props.endVerse;
    this.citationLabel = props.citationLabel.trim();

    Object.freeze(this);
  }
}
