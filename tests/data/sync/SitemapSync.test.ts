import { SitemapParser } from '../../../src/data/sync/SitemapParser';
import { SitemapSyncService } from '../../../src/data/sync/SitemapSyncService';
import { ArticleRepository } from '../../../src/domain/repositories/ArticleRepository';
import { StudyArticle } from '../../../src/domain/entities/StudyArticle';

class MockArticleRepository implements ArticleRepository {
  public articles: StudyArticle[] = [];

  async getArticlesByBook(bookId: string): Promise<StudyArticle[]> {
    return this.articles.filter(a => a.bookId === bookId);
  }

  async getArticlesByTitles(titles: string[]): Promise<StudyArticle[]> {
    const set = new Set(titles.map(t => t.toLowerCase()));
    return this.articles.filter(a => set.has(a.title.toLowerCase()));
  }

  async getArticleById(id: string): Promise<StudyArticle | null> {
    return this.articles.find(a => a.id === id) || null;
  }

  async getAllArticles(): Promise<StudyArticle[]> {
    return [...this.articles];
  }

  async upsertArticles(newArticles: Array<any>): Promise<void> {
    for (const item of newArticles) {
      const idx = this.articles.findIndex(a => a.url === item.url);
      const article = item instanceof StudyArticle ? item : new StudyArticle(item);
      if (idx >= 0) {
        this.articles[idx] = article;
      } else {
        this.articles.push(article);
      }
    }
  }
}

describe('SitemapSync', () => {
  describe('SitemapParser', () => {
    it('should extract bible articles and map book slugs cleanly', () => {
      const xml = `<urlset><url><loc>https://vidaesperanzayverdad.org/biblia/santa-biblia/antiguo-testamento/los-escritos/el-libro-de-salmos/salmos-imprecatorios/</loc></url></urlset>`;
      const articles = SitemapParser.parse(xml);
      expect(articles).toHaveLength(1);
      expect(articles[0].bookId).toBe('PSA');
      expect(articles[0].title).toContain('Salmos imprecatorios');
      expect(articles[0].section).toBe('santa-biblia');
      expect(articles[0].url).toBe('https://vidaesperanzayverdad.org/biblia/santa-biblia/antiguo-testamento/los-escritos/el-libro-de-salmos/salmos-imprecatorios/');
    });

    it('should identify section versiculos-para-meditar and map book from slug', () => {
      const xml = `
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url>
            <loc>https://vidaesperanzayverdad.org/biblia/versiculos-para-meditar/genesis-1-1/</loc>
            <lastmod>2026-01-15T10:00:00Z</lastmod>
          </url>
        </urlset>
      `;
      const articles = SitemapParser.parse(xml);
      expect(articles).toHaveLength(1);
      expect(articles[0].bookId).toBe('GEN');
      expect(articles[0].title).toBe('Genesis 1 1');
      expect(articles[0].section).toBe('versiculos-para-meditar');
      expect(articles[0].lastSyncedAt).toBe('2026-01-15T10:00:00Z');
    });

    it('should correctly distinguish numbered books (1-juan vs juan, 1-corintios vs 2-corintios)', () => {
      const xml = `
        <urlset>
          <url><loc>https://vidaesperanzayverdad.org/biblia/versiculos-para-meditar/1-juan-4-8/</loc></url>
          <url><loc>https://vidaesperanzayverdad.org/biblia/versiculos-para-meditar/juan-3-16/</loc></url>
          <url><loc>https://vidaesperanzayverdad.org/biblia/santa-biblia/nuevo-testamento/las-epistolas-paulinas/primera-a-los-corintios/el-amor/</loc></url>
          <url><loc>https://vidaesperanzayverdad.org/biblia/santa-biblia/nuevo-testamento/las-epistolas-paulinas/segunda-a-los-corintios/el-ministerio/</loc></url>
        </urlset>
      `;
      const articles = SitemapParser.parse(xml);
      expect(articles).toHaveLength(4);
      expect(articles[0].bookId).toBe('1JN');
      expect(articles[1].bookId).toBe('JHN');
      expect(articles[2].bookId).toBe('1CO');
      expect(articles[3].bookId).toBe('2CO');
    });

    it('should filter out non-biblia URLs from sitemap', () => {
      const xml = `
        <urlset>
          <url><loc>https://vidaesperanzayverdad.org/quienes-somos/</loc></url>
          <url><loc>https://vidaesperanzayverdad.org/profecia/el-fin-del-mundo/</loc></url>
          <url><loc>https://vidaesperanzayverdad.org/biblia/preguntas-biblicas/que-es-la-fe/</loc></url>
          <url><loc>https://vidaesperanzayverdad.org/cambio-de-vida/arrepentimiento/</loc></url>
        </urlset>
      `;
      const articles = SitemapParser.parse(xml);
      expect(articles).toHaveLength(1);
      expect(articles[0].title).toBe('Que es la fe');
      expect(articles[0].section).toBe('preguntas-biblicas');
      expect(articles[0].bookId).toBeUndefined();
    });

    it('should handle empty or malformed XML gracefully returning empty array', () => {
      expect(SitemapParser.parse('')).toEqual([]);
      expect(SitemapParser.parse('<invalid>not a sitemap</invalid>')).toEqual([]);
    });

    it('should deduplicate multiple entries with the same URL', () => {
      const xml = `
        <urlset>
          <url><loc>https://vidaesperanzayverdad.org/biblia/santa-biblia/antiguo-testamento/los-escritos/el-libro-de-salmos/salmos-imprecatorios/</loc></url>
          <url><loc>https://vidaesperanzayverdad.org/biblia/santa-biblia/antiguo-testamento/los-escritos/el-libro-de-salmos/salmos-imprecatorios/</loc></url>
        </urlset>
      `;
      const articles = SitemapParser.parse(xml);
      expect(articles).toHaveLength(1);
    });
  });

  describe('SitemapSyncService', () => {
    let repo: MockArticleRepository;

    beforeEach(() => {
      repo = new MockArticleRepository();
    });

    it('should fetch sitemap XML, parse articles, and return count of newly inserted articles', async () => {
      const xml = `
        <urlset>
          <url><loc>https://vidaesperanzayverdad.org/biblia/santa-biblia/antiguo-testamento/los-escritos/el-libro-de-salmos/salmos-imprecatorios/</loc></url>
          <url><loc>https://vidaesperanzayverdad.org/biblia/versiculos-para-meditar/genesis-1-1/</loc></url>
        </urlset>
      `;

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => xml,
      });

      const service = new SitemapSyncService(
        repo,
        'https://vidaesperanzayverdad.org/sitemap.xml',
        5000,
        mockFetch as any
      );

      const deltaCount = await service.syncDelta();
      expect(deltaCount).toBe(2);

      const all = await repo.getAllArticles();
      expect(all).toHaveLength(2);
      expect(all[0].bookId).toBe('PSA');
      expect(all[1].bookId).toBe('GEN');
    });

    it('should only report count of NEW articles when delta sync runs again', async () => {
      const xml1 = `
        <urlset>
          <url><loc>https://vidaesperanzayverdad.org/biblia/santa-biblia/antiguo-testamento/los-escritos/el-libro-de-salmos/salmos-imprecatorios/</loc></url>
        </urlset>
      `;
      const xml2 = `
        <urlset>
          <url><loc>https://vidaesperanzayverdad.org/biblia/santa-biblia/antiguo-testamento/los-escritos/el-libro-de-salmos/salmos-imprecatorios/</loc></url>
          <url><loc>https://vidaesperanzayverdad.org/biblia/versiculos-para-meditar/genesis-1-1/</loc></url>
        </urlset>
      `;

      const mockFetch1 = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => xml1,
      });

      const service1 = new SitemapSyncService(repo, 'https://test.com/sitemap.xml', 5000, mockFetch1 as any);
      const count1 = await service1.syncDelta();
      expect(count1).toBe(1);

      const mockFetch2 = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => xml2,
      });

      const service2 = new SitemapSyncService(repo, 'https://test.com/sitemap.xml', 5000, mockFetch2 as any);
      const count2 = await service2.syncDelta();
      expect(count2).toBe(1); // Only 1 new article added in the delta

      const all = await repo.getAllArticles();
      expect(all).toHaveLength(2);
    });

    it('should handle network errors silently without throwing', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network connection failed'));

      const service = new SitemapSyncService(
        repo,
        'https://vidaesperanzayverdad.org/sitemap.xml',
        5000,
        mockFetch as any
      );

      await expect(service.syncDelta()).resolves.toBe(0);
      const all = await repo.getAllArticles();
      expect(all).toHaveLength(0);
    });

    it('should handle non-200 HTTP responses silently returning 0', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      });

      const service = new SitemapSyncService(
        repo,
        'https://vidaesperanzayverdad.org/sitemap.xml',
        5000,
        mockFetch as any
      );

      const result = await service.syncDelta();
      expect(result).toBe(0);
    });

    it('should handle timeout / aborted request silently returning 0', async () => {
      const mockFetch = jest.fn().mockImplementation((_url, options) => {
        return new Promise((_, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              reject(new Error('The operation was aborted'));
            });
          }
        });
      });

      const service = new SitemapSyncService(
        repo,
        'https://vidaesperanzayverdad.org/sitemap.xml',
        10, // 10ms timeout
        mockFetch as any
      );

      const result = await service.syncDelta();
      expect(result).toBe(0);
    });
  });
});
