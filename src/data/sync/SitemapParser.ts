import { StudyArticle } from '../../domain/entities/StudyArticle';

interface BookMatcher {
  bookId: string;
  pattern: RegExp;
}

// Ordered matchers (e.g. numbered books like 1-juan before juan, 1-corintios before corintios)
const BOOK_MATCHERS: BookMatcher[] = [
  // Numbered Epistles & Books (checked first to avoid greedy substring match)
  { bookId: '1JN', pattern: /(?:^|-)(?:1-juan|primera-(?:de-)?juan|1-jn)(?:-|$)/i },
  { bookId: '2JN', pattern: /(?:^|-)(?:2-juan|segunda-(?:de-)?juan|2-jn)(?:-|$)/i },
  { bookId: '3JN', pattern: /(?:^|-)(?:3-juan|tercera-(?:de-)?juan|3-jn)(?:-|$)/i },
  { bookId: 'JHN', pattern: /(?:^|-)(?:el-evangelio-de-juan|san-juan|juan)(?:-|$)/i },

  { bookId: '1CO', pattern: /(?:^|-)(?:1-corintios|primera-(?:a-los-|de-)?corintios|1-cor)(?:-|$)/i },
  { bookId: '2CO', pattern: /(?:^|-)(?:2-corintios|segunda-(?:a-los-|de-)?corintios|2-cor)(?:-|$)/i },

  { bookId: '1TH', pattern: /(?:^|-)(?:1-tesalonicenses|primera-(?:a-los-|de-)?tesalonicenses|1-tes)(?:-|$)/i },
  { bookId: '2TH', pattern: /(?:^|-)(?:2-tesalonicenses|segunda-(?:a-los-|de-)?tesalonicenses|2-tes)(?:-|$)/i },

  { bookId: '1TI', pattern: /(?:^|-)(?:1-timoteo|primera-(?:a-|de-)?timoteo|1-tim)(?:-|$)/i },
  { bookId: '2TI', pattern: /(?:^|-)(?:2-timoteo|segunda-(?:a-|de-)?timoteo|2-tim)(?:-|$)/i },

  { bookId: '1PE', pattern: /(?:^|-)(?:1-pedro|primera-(?:de-)?pedro|1-ped)(?:-|$)/i },
  { bookId: '2PE', pattern: /(?:^|-)(?:2-pedro|segunda-(?:de-)?pedro|2-ped)(?:-|$)/i },

  { bookId: '1SA', pattern: /(?:^|-)(?:1-samuel|primer(?:o|-libro)?-de-samuel|1-sam)(?:-|$)/i },
  { bookId: '2SA', pattern: /(?:^|-)(?:2-samuel|segundo(?:-libro)?-de-samuel|2-sam)(?:-|$)/i },

  { bookId: '1KI', pattern: /(?:^|-)(?:1-reyes|primer(?:o|-libro)?-de-reyes|1-rey)(?:-|$)/i },
  { bookId: '2KI', pattern: /(?:^|-)(?:2-reyes|segundo(?:-libro)?-de-reyes|2-rey)(?:-|$)/i },

  { bookId: '1CH', pattern: /(?:^|-)(?:1-cronicas|primer(?:o|-libro)?-de-cronicas|1-cro)(?:-|$)/i },
  { bookId: '2CH', pattern: /(?:^|-)(?:2-cronicas|segundo(?:-libro)?-de-cronicas|2-cro)(?:-|$)/i },

  // Poetry / Writings
  { bookId: 'SNG', pattern: /(?:^|-)(?:cantar-de-los-cantares|cantares)(?:-|$)/i },
  { bookId: 'PSA', pattern: /(?:^|-)(?:el-libro-de-salmos|los-salmos|salmos?)(?:-|$)/i },
  { bookId: 'PRO', pattern: /(?:^|-)(?:el-libro-de-proverbios|proverbios?)(?:-|$)/i },
  { bookId: 'ECC', pattern: /(?:^|-)(?:el-libro-de-eclesiastes|eclesiastes)(?:-|$)/i },
  { bookId: 'JOB', pattern: /(?:^|-)(?:el-libro-de-job|job)(?:-|$)/i },

  // Pentateuch / Law
  { bookId: 'GEN', pattern: /(?:^|-)(?:el-libro-de-genesis|genesis)(?:-|$)/i },
  { bookId: 'EXO', pattern: /(?:^|-)(?:el-libro-de-exodo|exodo)(?:-|$)/i },
  { bookId: 'LEV', pattern: /(?:^|-)(?:el-libro-de-levitico|levitico)(?:-|$)/i },
  { bookId: 'NUM', pattern: /(?:^|-)(?:el-libro-de-numeros|numeros)(?:-|$)/i },
  { bookId: 'DEU', pattern: /(?:^|-)(?:el-libro-de-deuteronomio|deuteronomio)(?:-|$)/i },

  // Historical Books
  { bookId: 'JOS', pattern: /(?:^|-)(?:el-libro-de-josue|josue)(?:-|$)/i },
  { bookId: 'JDG', pattern: /(?:^|-)(?:el-libro-de-jueces|jueces)(?:-|$)/i },
  { bookId: 'RUT', pattern: /(?:^|-)(?:el-libro-de-rut|rut)(?:-|$)/i },
  { bookId: 'EZR', pattern: /(?:^|-)(?:el-libro-de-esdras|esdras)(?:-|$)/i },
  { bookId: 'NEH', pattern: /(?:^|-)(?:el-libro-de-nehemias|nehemias)(?:-|$)/i },
  { bookId: 'EST', pattern: /(?:^|-)(?:el-libro-de-ester|ester)(?:-|$)/i },

  // Major & Minor Prophets
  { bookId: 'ISA', pattern: /(?:^|-)(?:el-libro-de-isaias|isaias)(?:-|$)/i },
  { bookId: 'JER', pattern: /(?:^|-)(?:el-libro-de-jeremias|jeremias)(?:-|$)/i },
  { bookId: 'LAM', pattern: /(?:^|-)(?:el-libro-de-lamentaciones|lamentaciones)(?:-|$)/i },
  { bookId: 'EZK', pattern: /(?:^|-)(?:el-libro-de-ezequiel|ezequiel)(?:-|$)/i },
  { bookId: 'DAN', pattern: /(?:^|-)(?:el-libro-de-daniel|daniel)(?:-|$)/i },
  { bookId: 'HOS', pattern: /(?:^|-)(?:el-libro-de-oseas|oseas)(?:-|$)/i },
  { bookId: 'JOL', pattern: /(?:^|-)(?:el-libro-de-joel|joel)(?:-|$)/i },
  { bookId: 'AMO', pattern: /(?:^|-)(?:el-libro-de-amos|amos)(?:-|$)/i },
  { bookId: 'OBA', pattern: /(?:^|-)(?:el-libro-de-abdias|abdias)(?:-|$)/i },
  { bookId: 'JON', pattern: /(?:^|-)(?:el-libro-de-jonas|jonas)(?:-|$)/i },
  { bookId: 'MIC', pattern: /(?:^|-)(?:el-libro-de-miqueas|miqueas)(?:-|$)/i },
  { bookId: 'NAM', pattern: /(?:^|-)(?:el-libro-de-nahum|nahum)(?:-|$)/i },
  { bookId: 'HAB', pattern: /(?:^|-)(?:el-libro-de-habacuc|habacuc)(?:-|$)/i },
  { bookId: 'ZEP', pattern: /(?:^|-)(?:el-libro-de-sofonias|sofonias)(?:-|$)/i },
  { bookId: 'HAG', pattern: /(?:^|-)(?:el-libro-de-hageo|hageo)(?:-|$)/i },
  { bookId: 'ZEC', pattern: /(?:^|-)(?:el-libro-de-zacarias|zacarias)(?:-|$)/i },
  { bookId: 'MAL', pattern: /(?:^|-)(?:el-libro-de-malaquias|malaquias)(?:-|$)/i },

  // Gospels & Acts
  { bookId: 'MAT', pattern: /(?:^|-)(?:el-evangelio-de-mateo|san-mateo|mateo)(?:-|$)/i },
  { bookId: 'MRK', pattern: /(?:^|-)(?:el-evangelio-de-marcos|san-marcos|marcos)(?:-|$)/i },
  { bookId: 'LUK', pattern: /(?:^|-)(?:el-evangelio-de-lucas|san-lucas|lucas)(?:-|$)/i },
  { bookId: 'ACT', pattern: /(?:^|-)(?:los-hechos(?:-de-los-apostoles)?|el-libro-de-hechos|hechos)(?:-|$)/i },

  // Paul's Epistles & General Epistles
  { bookId: 'ROM', pattern: /(?:^|-)(?:(?:carta|epistola)-a-los-romanos|romanos)(?:-|$)/i },
  { bookId: 'GAL', pattern: /(?:^|-)(?:(?:carta|epistola)-a-los-galatas|galatas)(?:-|$)/i },
  { bookId: 'EPH', pattern: /(?:^|-)(?:(?:carta|epistola)-a-los-efesios|efesios)(?:-|$)/i },
  { bookId: 'PHP', pattern: /(?:^|-)(?:(?:carta|epistola)-a-los-filipenses|filipenses)(?:-|$)/i },
  { bookId: 'COL', pattern: /(?:^|-)(?:(?:carta|epistola)-a-los-colosenses|colosenses)(?:-|$)/i },
  { bookId: 'TIT', pattern: /(?:^|-)(?:(?:carta|epistola)-a-tito|tito)(?:-|$)/i },
  { bookId: 'PHM', pattern: /(?:^|-)(?:(?:carta|epistola)-a-filemon|filemon)(?:-|$)/i },
  { bookId: 'HEB', pattern: /(?:^|-)(?:(?:carta|epistola)-a-los-hebreos|hebreos)(?:-|$)/i },
  { bookId: 'JAS', pattern: /(?:^|-)(?:(?:carta|epistola)-de-santiago|santiago)(?:-|$)/i },
  { bookId: 'JUD', pattern: /(?:^|-)(?:(?:carta|epistola)-de-judas|judas)(?:-|$)/i },
  { bookId: 'REV', pattern: /(?:^|-)(?:el-libro-de-apocalipsis|apocalipsis)(?:-|$)/i },
];

export class SitemapParser {
  private static readonly VEV_BIBLIA_FILTER = 'vidaesperanzayverdad.org/biblia/';

  /**
   * Formats a slug like "salmos-imprecatorios" into a capitalized title like "Salmos imprecatorios".
   */
  static formatTitle(slug: string): string {
    const words = slug.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    if (words.length === 0) return '';
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  /**
   * Normalizes a segment or slug by removing diacritics / accents.
   */
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Identifies a biblical book ID from URL path segments and article slug.
   */
  static identifyBookId(segments: string[], slug: string): string | undefined {
    // 1. Check intermediate segments from deepest to highest (e.g. "el-libro-de-salmos")
    for (let i = segments.length - 2; i >= 0; i--) {
      const normalizedSegment = this.normalizeText(segments[i]);
      for (const matcher of BOOK_MATCHERS) {
        if (matcher.pattern.test(normalizedSegment)) {
          return matcher.bookId;
        }
      }
    }

    // 2. Check the article slug itself (e.g. "salmos-imprecatorios", "genesis-1-1")
    const normalizedSlug = this.normalizeText(slug);
    for (const matcher of BOOK_MATCHERS) {
      if (matcher.pattern.test(normalizedSlug)) {
        return matcher.bookId;
      }
    }

    return undefined;
  }

  /**
   * Parses sitemap XML and returns StudyArticle domain entities.
   */
  static parse(xml: string, defaultTimestamp: string = new Date().toISOString()): StudyArticle[] {
    if (!xml || typeof xml !== 'string' || xml.trim().length === 0) {
      return [];
    }

    const articles: StudyArticle[] = [];
    const seenUrls = new Set<string>();
    const seenIds = new Set<string>();

    // Match each <url> block to capture <loc> and optional <lastmod>
    const urlBlockRegex = /<url\b[^>]*>([\s\S]*?)<\/url>/gi;
    let urlMatch: RegExpExecArray | null;
    let foundUrlBlocks = false;

    while ((urlMatch = urlBlockRegex.exec(xml)) !== null) {
      foundUrlBlocks = true;
      const blockContent = urlMatch[1];
      const locMatch = /<loc>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/loc>/i.exec(blockContent);
      if (!locMatch) continue;

      const rawLoc = locMatch[1].trim();
      const lastmodMatch = /<lastmod>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/lastmod>/i.exec(blockContent);
      const lastSyncedAt = lastmodMatch ? lastmodMatch[1].trim() : defaultTimestamp;

      this.processUrl(rawLoc, lastSyncedAt, articles, seenUrls, seenIds);
    }

    // Fallback: If no <url> blocks were found, search for standalone <loc> tags
    if (!foundUrlBlocks) {
      const standaloneLocRegex = /<loc>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/loc>/gi;
      let locOnlyMatch: RegExpExecArray | null;
      while ((locOnlyMatch = standaloneLocRegex.exec(xml)) !== null) {
        const rawLoc = locOnlyMatch[1].trim();
        this.processUrl(rawLoc, defaultTimestamp, articles, seenUrls, seenIds);
      }
    }

    return articles;
  }

  private static processUrl(
    rawLoc: string,
    lastSyncedAt: string,
    articles: StudyArticle[],
    seenUrls: Set<string>,
    seenIds: Set<string>
  ): void {
    if (!rawLoc.includes(this.VEV_BIBLIA_FILTER)) {
      return;
    }

    if (seenUrls.has(rawLoc)) {
      return;
    }

    // Extract path after "vidaesperanzayverdad.org/biblia/"
    const parts = rawLoc.split(this.VEV_BIBLIA_FILTER);
    if (parts.length < 2) return;

    const pathAfterBiblia = parts[1].split(/[?#]/)[0].replace(/\/+$/, '');
    if (!pathAfterBiblia || pathAfterBiblia.trim().length === 0) {
      return;
    }

    const segments = pathAfterBiblia.split('/').filter(s => s.trim().length > 0);
    if (segments.length === 0) {
      return;
    }

    const slug = segments[segments.length - 1];
    const section = segments.length > 1 ? segments[0] : 'biblia';
    const title = this.formatTitle(slug);
    if (!title) return;

    const bookId = this.identifyBookId(segments, slug);

    // Generate unique ID per article
    let id = slug;
    let counter = 1;
    while (seenIds.has(id)) {
      counter++;
      id = `${slug}-${counter}`;
    }

    seenUrls.add(rawLoc);
    seenIds.add(id);

    articles.push(
      new StudyArticle({
        id,
        title,
        url: rawLoc,
        bookId,
        section,
        lastSyncedAt,
      })
    );
  }
}
