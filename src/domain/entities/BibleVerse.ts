export interface BibleVerseProps {
  bookId: string;
  chapter: number;
  verse: number;
  text: string;
}

export class BibleVerse {
  readonly bookId: string;
  readonly chapter: number;
  readonly verse: number;
  readonly text: string;

  constructor(props: BibleVerseProps) {
    if (!props.bookId || props.bookId.trim() === '') {
      throw new Error('BibleVerse bookId cannot be empty');
    }
    if (!Number.isInteger(props.chapter) || props.chapter < 1) {
      throw new Error('BibleVerse chapter must be an integer >= 1');
    }
    if (!Number.isInteger(props.verse) || props.verse < 1) {
      throw new Error('BibleVerse verse must be an integer >= 1');
    }
    if (!props.text || props.text.trim() === '') {
      throw new Error('BibleVerse text cannot be empty');
    }

    this.bookId = props.bookId.trim();
    this.chapter = props.chapter;
    this.verse = props.verse;
    this.text = props.text.trim();

    Object.freeze(this);
  }
}
