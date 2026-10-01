import { StudyArticle, StudyArticleProps } from '../entities';

export interface ArticleRepository {
  getArticlesByBook(bookId: string): Promise<StudyArticle[]>;
  getArticlesByTitles(titles: string[]): Promise<StudyArticle[]>;
  getArticleById(id: string): Promise<StudyArticle | null>;
  getAllArticles(): Promise<StudyArticle[]>;
  upsertArticles(articles: Array<StudyArticle | StudyArticleProps>): Promise<void>;
}
