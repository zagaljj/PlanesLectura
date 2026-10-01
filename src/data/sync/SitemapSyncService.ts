import { ArticleRepository } from '../../domain/repositories/ArticleRepository';
import { SitemapParser } from './SitemapParser';

export class SitemapSyncService {
  constructor(
    private readonly articleRepo: ArticleRepository,
    private readonly sitemapUrl: string = 'https://vidaesperanzayverdad.org/sitemap.xml',
    private readonly timeoutMs: number = 10000,
    private readonly fetchFn: typeof fetch = typeof fetch !== 'undefined' ? fetch : (globalThis as any).fetch
  ) {}

  /**
   * Fetches the sitemap XML over HTTP, parses biblical study articles,
   * batch upserts them into the ArticleRepository, and returns the count of new articles inserted.
   * If network fails or times out, it silently returns 0 without throwing.
   */
  async syncDelta(): Promise<number> {
    try {
      if (!this.fetchFn) {
        return 0;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, this.timeoutMs);

      let xml: string;
      try {
        const response = await this.fetchFn(this.sitemapUrl, {
          signal: controller.signal,
        });

        if (!response.ok) {
          return 0;
        }

        xml = await response.text();
      } finally {
        clearTimeout(timeoutId);
      }

      const parsedArticles = SitemapParser.parse(xml);
      if (parsedArticles.length === 0) {
        return 0;
      }

      const existingArticles = await this.articleRepo.getAllArticles();
      const existingUrls = new Set(existingArticles.map(a => a.url));
      const newArticles = parsedArticles.filter(a => !existingUrls.has(a.url));

      await this.articleRepo.upsertArticles(parsedArticles);

      return newArticles.length;
    } catch {
      // Offline resilience: return 0 without throwing
      return 0;
    }
  }
}
