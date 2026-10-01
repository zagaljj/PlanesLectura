import { BibleVerse, BibleVerseProps } from '../entities';

export interface VerseRangeQuery {
  bookId: string;
  startChapter: number;
  startVerse?: number;
  endChapter?: number;
  endVerse?: number;
}

export interface BibleRepository {
  getVersesForRange(query: VerseRangeQuery): Promise<BibleVerse[]>;
  getVersesForRange(
    bookId: string,
    startChapter: number,
    startVerse?: number,
    endChapter?: number,
    endVerse?: number
  ): Promise<BibleVerse[]>;
  getVerse(bookId: string, chapter: number, verse: number): Promise<BibleVerse | null>;
  insertVerses(verses: Array<BibleVerse | BibleVerseProps>): Promise<void>;
}
