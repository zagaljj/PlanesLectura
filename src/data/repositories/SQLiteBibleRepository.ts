import { ISQLiteDatabase, DatabaseManager } from '../sqlite/DatabaseManager';
import {
  BibleRepository,
  VerseRangeQuery,
} from '../../domain/repositories/BibleRepository';
import { BibleVerse, BibleVerseProps } from '../../domain/entities';

export class SQLiteBibleRepository implements BibleRepository {
  constructor(private readonly db: ISQLiteDatabase) {}

  private mapVerse(row: any): BibleVerse {
    return new BibleVerse({
      bookId: row.book_id,
      chapter: row.chapter,
      verse: row.verse,
      text: row.verse_text,
    });
  }

  async getVerse(bookId: string, chapter: number, verse: number): Promise<BibleVerse | null> {
    await DatabaseManager.waitForBibleSeed();
    const row = await this.db.getFirstAsync<any>(
      `SELECT book_id, chapter, verse, verse_text
       FROM bible_verses
       WHERE book_id = ? AND chapter = ? AND verse = ?`,
      bookId,
      chapter,
      verse
    );
    return row ? this.mapVerse(row) : null;
  }

  async getVersesForRange(query: VerseRangeQuery): Promise<BibleVerse[]>;
  async getVersesForRange(
    bookId: string,
    startChapter: number,
    startVerse?: number,
    endChapter?: number,
    endVerse?: number
  ): Promise<BibleVerse[]>;
  async getVersesForRange(
    queryOrBookId: VerseRangeQuery | string,
    optStartChapter?: number,
    optStartVerse?: number,
    optEndChapter?: number,
    optEndVerse?: number
  ): Promise<BibleVerse[]> {
    let bookId: string;
    let startChapter: number;
    let startVerse: number | undefined;
    let endChapter: number;
    let endVerse: number | undefined;

    if (typeof queryOrBookId === 'string') {
      bookId = queryOrBookId;
      startChapter = optStartChapter ?? 1;
      startVerse = optStartVerse;
      endChapter = optEndChapter ?? startChapter;
      endVerse = optEndVerse;
    } else {
      bookId = queryOrBookId.bookId;
      startChapter = queryOrBookId.startChapter;
      startVerse = queryOrBookId.startVerse;
      endChapter = queryOrBookId.endChapter ?? startChapter;
      endVerse = queryOrBookId.endVerse;
    }

    await DatabaseManager.waitForBibleSeed();

    if (startChapter === endChapter) {
      const rows = await this.db.getAllAsync<any>(
        `SELECT book_id, chapter, verse, verse_text
         FROM bible_verses
         WHERE book_id = ?
           AND chapter = ?
           AND (? IS NULL OR verse >= ?)
           AND (? IS NULL OR verse <= ?)
         ORDER BY chapter ASC, verse ASC`,
        bookId,
        startChapter,
        startVerse ?? null,
        startVerse ?? null,
        endVerse ?? null,
        endVerse ?? null
      );
      return rows.map(r => this.mapVerse(r));
    } else {
      const rows = await this.db.getAllAsync<any>(
        `SELECT book_id, chapter, verse, verse_text
         FROM bible_verses
         WHERE book_id = ?
           AND (
             (chapter = ? AND (? IS NULL OR verse >= ?))
             OR
             (chapter > ? AND chapter < ?)
             OR
             (chapter = ? AND (? IS NULL OR verse <= ?))
           )
         ORDER BY chapter ASC, verse ASC`,
        bookId,
        startChapter,
        startVerse ?? null,
        startVerse ?? null,
        startChapter,
        endChapter,
        endChapter,
        endVerse ?? null,
        endVerse ?? null
      );
      return rows.map(r => this.mapVerse(r));
    }
  }

  async insertVerses(verses: Array<BibleVerse | BibleVerseProps>): Promise<void> {
    if (verses.length === 0) return;

    await this.db.withTransactionAsync(async () => {
      for (const v of verses) {
        await this.db.runAsync(
          `INSERT OR REPLACE INTO bible_verses (book_id, chapter, verse, verse_text)
           VALUES (?, ?, ?, ?)`,
          v.bookId,
          v.chapter,
          v.verse,
          v.text
        );
      }
    });
  }
}
