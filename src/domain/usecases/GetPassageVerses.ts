import { BibleVerse, PlanReading } from '../entities';
import { BibleRepository, VerseRangeQuery } from '../repositories';

export class GetPassageVerses {
  constructor(private readonly bibleRepo: BibleRepository) {}

  async execute(
    readingOrQueryOrBook: PlanReading | VerseRangeQuery | string,
    startChapter?: number,
    startVerse?: number,
    endChapter?: number,
    endVerse?: number
  ): Promise<BibleVerse[]> {
    if (typeof readingOrQueryOrBook === 'string') {
      return this.bibleRepo.getVersesForRange({
        bookId: readingOrQueryOrBook,
        startChapter: startChapter!,
        startVerse,
        endChapter: endChapter ?? startChapter!,
        endVerse,
      });
    }

    const query: VerseRangeQuery = {
      bookId: readingOrQueryOrBook.bookId,
      startChapter: readingOrQueryOrBook.startChapter,
      startVerse: readingOrQueryOrBook.startVerse,
      endChapter: readingOrQueryOrBook.endChapter ?? readingOrQueryOrBook.startChapter,
      endVerse: readingOrQueryOrBook.endVerse,
    };

    return this.bibleRepo.getVersesForRange(query);
  }
}
