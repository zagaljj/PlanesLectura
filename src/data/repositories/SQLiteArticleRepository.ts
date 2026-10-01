import { ISQLiteDatabase } from '../sqlite/DatabaseManager';
import { ArticleRepository } from '../../domain/repositories/ArticleRepository';
import { StudyArticle, StudyArticleProps } from '../../domain/entities';

export class SQLiteArticleRepository implements ArticleRepository {
  constructor(private readonly db: ISQLiteDatabase) {}

  private mapArticle(row: any): StudyArticle {
    return new StudyArticle({
      id: row.id,
      title: row.title,
      url: row.url,
      bookId: row.book_id ?? undefined,
      section: row.section,
      lastSyncedAt: row.last_synced_at,
    });
  }

  async getArticlesByBook(bookId: string): Promise<StudyArticle[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT id, title, url, book_id, section, last_synced_at
       FROM study_articles
       WHERE book_id = ?
       ORDER BY title ASC`,
      bookId
    );
    return rows.map(r => this.mapArticle(r));
  }

  async getArticlesByTitles(titles: string[]): Promise<StudyArticle[]> {
    const trimmedTitles = titles.map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    if (trimmedTitles.length === 0) {
      return [];
    }

    const placeholders = trimmedTitles.map(() => '?').join(', ');
    const rows = await this.db.getAllAsync<any>(
      `SELECT id, title, url, book_id, section, last_synced_at
       FROM study_articles
       WHERE LOWER(TRIM(title)) IN (${placeholders})
       ORDER BY title ASC`,
      ...trimmedTitles
    );
    return rows.map(r => this.mapArticle(r));
  }

  async getArticleById(id: string): Promise<StudyArticle | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT id, title, url, book_id, section, last_synced_at
       FROM study_articles
       WHERE id = ?`,
      id
    );
    return row ? this.mapArticle(row) : null;
  }

  async getAllArticles(): Promise<StudyArticle[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT id, title, url, book_id, section, last_synced_at
       FROM study_articles
       ORDER BY title ASC`
    );
    return rows.map(r => this.mapArticle(r));
  }

  async upsertArticles(articles: Array<StudyArticle | StudyArticleProps>): Promise<void> {
    if (articles.length === 0) return;

    await this.db.withTransactionAsync(async () => {
      for (const a of articles) {
        await this.db.runAsync(
          `INSERT INTO study_articles (id, title, url, book_id, section, last_synced_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(url) DO UPDATE SET
             title = excluded.title,
             book_id = excluded.book_id,
             section = excluded.section,
             last_synced_at = excluded.last_synced_at`,
          a.id,
          a.title,
          a.url,
          a.bookId ?? null,
          a.section,
          a.lastSyncedAt
        );
      }
    });
  }
}
