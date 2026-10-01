interface BookDefinition {
  id: string;
  standardName: string;
  aliases: string[];
}

export const BIBLE_BOOKS: BookDefinition[] = [
  // Old Testament
  { id: 'GEN', standardName: 'Génesis', aliases: ['génesis', 'genesis', 'gen'] },
  { id: 'EXO', standardName: 'Éxodo', aliases: ['éxodo', 'exodo', 'ex'] },
  { id: 'LEV', standardName: 'Levítico', aliases: ['levítico', 'levitico', 'lev'] },
  { id: 'NUM', standardName: 'Números', aliases: ['números', 'numeros', 'num'] },
  { id: 'DEU', standardName: 'Deuteronomio', aliases: ['deuteronomio', 'deut', 'dt'] },
  { id: 'JOS', standardName: 'Josué', aliases: ['josué', 'josue', 'jos'] },
  { id: 'JDG', standardName: 'Jueces', aliases: ['jueces', 'jue'] },
  { id: 'RUT', standardName: 'Rut', aliases: ['rut', 'ruth', 'rt'] },
  { id: '1SA', standardName: '1 Samuel', aliases: ['1 samuel', '1samuel', '1 sa', '1sa', '1 s', '1s'] },
  { id: '2SA', standardName: '2 Samuel', aliases: ['2 samuel', '2samuel', '2 sa', '2sa', '2 s', '2s'] },
  { id: '1KI', standardName: '1 Reyes', aliases: ['1 reyes', '1reyes', '1 re', '1re', '1 r', '1r'] },
  { id: '2KI', standardName: '2 Reyes', aliases: ['2 reyes', '2reyes', '2 re', '2re', '2 r', '2r'] },
  { id: '1CH', standardName: '1 Crónicas', aliases: ['1 crónicas', '1 cronicas', '1crónicas', '1cronicas', '1 cr', '1cr'] },
  { id: '2CH', standardName: '2 Crónicas', aliases: ['2 crónicas', '2 cronicas', '2crónicas', '2cronicas', '2 cr', '2cr'] },
  { id: 'EZR', standardName: 'Esdras', aliases: ['esdras', 'esd'] },
  { id: 'NEH', standardName: 'Nehemías', aliases: ['nehemías', 'nehemias', 'neh'] },
  { id: 'EST', standardName: 'Ester', aliases: ['ester', 'est'] },
  { id: 'JOB', standardName: 'Job', aliases: ['job', 'jb'] },
  { id: 'PSA', standardName: 'Salmos', aliases: ['salmos', 'salmo', 'sal', 'psa', 'ps'] },
  { id: 'PRO', standardName: 'Proverbios', aliases: ['proverbios', 'proverbio', 'prov', 'pr'] },
  { id: 'ECC', standardName: 'Eclesiastés', aliases: ['eclesiastés', 'eclesiastes', 'ecl', 'ec'] },
  { id: 'SNG', standardName: 'Cantares', aliases: ['cantar de los cantares', 'cantares', 'cantar', 'cnt', 'cntr'] },
  { id: 'ISA', standardName: 'Isaías', aliases: ['isaías', 'isaias', 'isa', 'is'] },
  { id: 'JER', standardName: 'Jeremías', aliases: ['jeremías', 'jeremias', 'jer'] },
  { id: 'LAM', standardName: 'Lamentaciones', aliases: ['lamentaciones', 'lamentations', 'lam'] },
  { id: 'EZK', standardName: 'Ezequiel', aliases: ['ezequiel', 'eze', 'ez'] },
  { id: 'DAN', standardName: 'Daniel', aliases: ['daniel', 'dan', 'dn'] },
  { id: 'HOS', standardName: 'Oseas', aliases: ['oseas', 'os'] },
  { id: 'JOL', standardName: 'Joel', aliases: ['joel', 'jl'] },
  { id: 'AMO', standardName: 'Amós', aliases: ['amós', 'amos', 'am'] },
  { id: 'OBA', standardName: 'Abdías', aliases: ['abdías', 'abdias', 'abd', 'ob'] },
  { id: 'JON', standardName: 'Jonás', aliases: ['jonás', 'jonas', 'jon'] },
  { id: 'MIC', standardName: 'Miqueas', aliases: ['miqueas', 'miq'] },
  { id: 'NAM', standardName: 'Nahúm', aliases: ['nahúm', 'nahum', 'nah', 'na'] },
  { id: 'HAB', standardName: 'Habacuc', aliases: ['habacuc', 'hab'] },
  { id: 'ZEP', standardName: 'Sofonías', aliases: ['sofonías', 'sofonias', 'sof'] },
  { id: 'HAG', standardName: 'Hageo', aliases: ['hageo', 'hag'] },
  { id: 'ZEC', standardName: 'Zacarías', aliases: ['zacarías', 'zacarias', 'zac'] },
  { id: 'MAL', standardName: 'Malaquías', aliases: ['malaquías', 'malaquias', 'mal'] },

  // New Testament
  { id: 'MAT', standardName: 'Mateo', aliases: ['mateo', 'mat', 'mt'] },
  { id: 'MRK', standardName: 'Marcos', aliases: ['marcos', 'mrk', 'mc'] },
  { id: 'LUK', standardName: 'Lucas', aliases: ['lucas', 'luk', 'lc'] },
  { id: 'JHN', standardName: 'Juan', aliases: ['juan', 'jhn', 'jn'] },
  { id: 'ACT', standardName: 'Hechos', aliases: ['hechos de los apóstoles', 'hechos', 'hch', 'act'] },
  { id: 'ROM', standardName: 'Romanos', aliases: ['romanos', 'rom', 'ro'] },
  { id: '1CO', standardName: '1 Corintios', aliases: ['1 corintios', '1 de corintios', '1corintios', '1 co', '1co'] },
  { id: '2CO', standardName: '2 Corintios', aliases: ['2 corintios', '2 de corintios', '2corintios', '2 co', '2co'] },
  { id: 'GAL', standardName: 'Gálatas', aliases: ['gálatas', 'galatas', 'gal', 'ga'] },
  { id: 'EPH', standardName: 'Efesios', aliases: ['efesios', 'efe', 'ef'] },
  { id: 'PHP', standardName: 'Filipenses', aliases: ['filipenses', 'fil', 'flp'] },
  { id: 'COL', standardName: 'Colosenses', aliases: ['colosenses', 'col'] },
  { id: '1TH', standardName: '1 Tesalonicenses', aliases: ['1 tesalonicenses', '1tesalonicenses', '1 tes', '1tes', '1 ts', '1ts'] },
  { id: '2TH', standardName: '2 Tesalonicenses', aliases: ['2 tesalonicenses', '2tesalonicenses', '2 tes', '2tes', '2 ts', '2ts'] },
  { id: '1TI', standardName: '1 Timoteo', aliases: ['1 timoteo', '1timoteo', '1 tim', '1tim', '1 ti', '1ti'] },
  { id: '2TI', standardName: '2 Timoteo', aliases: ['2 timoteo', '2timoteo', '2 tim', '2tim', '2 ti', '2ti'] },
  { id: 'TIT', standardName: 'Tito', aliases: ['tito', 'tit'] },
  { id: 'PHM', standardName: 'Filemón', aliases: ['filemón', 'filemon', 'flm'] },
  { id: 'HEB', standardName: 'Hebreos', aliases: ['hebreos', 'heb'] },
  { id: 'JAS', standardName: 'Santiago', aliases: ['santiago', 'stg', 'jas'] },
  { id: '1PE', standardName: '1 Pedro', aliases: ['1 pedro', '1pedro', '1 pe', '1pe', '1 p', '1p'] },
  { id: '2PE', standardName: '2 Pedro', aliases: ['2 pedro', '2pedro', '2 pe', '2pe', '2 p', '2p'] },
  { id: '1JN', standardName: '1 Juan', aliases: ['1 juan', '1juan', '1 jn', '1jn', '1 j', '1j'] },
  { id: '2JN', standardName: '2 Juan', aliases: ['2 juan', '2juan', '2 jn', '2jn', '2 j', '2j'] },
  { id: '3JN', standardName: '3 Juan', aliases: ['3 juan', '3juan', '3 jn', '3jn', '3 j', '3j'] },
  { id: 'JUD', standardName: 'Judas', aliases: ['judas', 'jud'] },
  { id: 'REV', standardName: 'Apocalipsis', aliases: ['apocalipsis', 'apoc', 'rev', 'ap'] }
];

export interface ParsedCitation {
  bookId: string;
  bookName: string;
  startChapter: number;
  startVerse?: number;
  endChapter: number;
  endVerse?: number;
  citationLabel: string;
}

export class CitationParser {
  static hasKnownBookPrefix(rawCitation: string): boolean {
    const cleaned = rawCitation
      .replace(/[\uFFFD\u2022\u25A0\u25A1\u25CF\u25CB]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (/escritura favorita/i.test(cleaned)) {
      return true;
    }

    for (const book of BIBLE_BOOKS) {
      for (const alias of book.aliases) {
        const regex = new RegExp(`^${alias}(?:\\s+|\\d|$)`, 'i');
        if (regex.test(cleaned)) {
          return true;
        }
      }
    }
    return false;
  }

  static parse(rawCitation: string): ParsedCitation {
    const cleaned = rawCitation
      .replace(/[\uFFFD\u2022\u25A0\u25A1\u25CF\u25CB]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Check for custom/meditation day
    if (/escritura favorita/i.test(cleaned)) {
      return {
        bookId: 'PSA',
        bookName: 'Salmos',
        startChapter: 119,
        startVerse: 105,
        endChapter: 119,
        endVerse: 105,
        citationLabel: 'Su escritura favorita (Salmos 119:105)'
      };
    }

    let matchedBook: BookDefinition | null = null;
    let remaining = cleaned;

    for (const book of BIBLE_BOOKS) {
      for (const alias of book.aliases) {
        const regex = new RegExp(`^${alias}(?:\\s+|\\d|$)`, 'i');
        if (regex.test(cleaned)) {
          matchedBook = book;
          remaining = cleaned.replace(new RegExp(`^${alias}\\s*`, 'i'), '').trim();
          break;
        }
      }
      if (matchedBook) break;
    }

    if (!matchedBook) {
      throw new Error(`Unable to recognize Bible book in citation: "${cleaned}"`);
    }

    let startChapter = 1;
    let startVerse: number | undefined = undefined;
    let endChapter = 1;
    let endVerse: number | undefined = undefined;

    // Pattern 1: Cross chapter verse range, e.g. "18:15-19:48" or "5:11-6:23"
    const crossChapterMatch = remaining.match(/^(\d+):(\d+)\s*-\s*(\d+):(\d+)/);
    if (crossChapterMatch) {
      startChapter = parseInt(crossChapterMatch[1], 10);
      startVerse = parseInt(crossChapterMatch[2], 10);
      endChapter = parseInt(crossChapterMatch[3], 10);
      endVerse = parseInt(crossChapterMatch[4], 10);
    } else {
      // Pattern 2: Single chapter verse range, e.g. "12:22-51" or single verse "5:48"
      const singleChapterVerseMatch = remaining.match(/^(\d+):(\d+)(?:\s*-\s*(\d+))?/);
      if (singleChapterVerseMatch) {
        startChapter = parseInt(singleChapterVerseMatch[1], 10);
        startVerse = parseInt(singleChapterVerseMatch[2], 10);
        endChapter = startChapter;
        endVerse = singleChapterVerseMatch[3]
          ? parseInt(singleChapterVerseMatch[3], 10)
          : startVerse;
      } else {
        // Pattern 3: Chapter range or single chapter, e.g. "1-3" or "1" or "11, 59"
        const chapterRangeMatch = remaining.match(/^(\d+)(?:\s*-\s*(\d+))?/);
        if (chapterRangeMatch) {
          startChapter = parseInt(chapterRangeMatch[1], 10);
          if (chapterRangeMatch[2]) {
            endChapter = parseInt(chapterRangeMatch[2], 10);
          } else {
            // Check if there are other numbers in a list, e.g. "11, 59"
            const allNumbers = remaining.match(/\d+/g);
            if (allNumbers && allNumbers.length > 1) {
              const lastNum = parseInt(allNumbers[allNumbers.length - 1], 10);
              endChapter = lastNum >= startChapter ? lastNum : startChapter;
            } else {
              endChapter = startChapter;
            }
          }
        }
      }
    }

    // Ensure valid bounds
    if (endChapter < startChapter) {
      endChapter = startChapter;
    }
    if (
      startChapter === endChapter &&
      startVerse !== undefined &&
      endVerse !== undefined &&
      endVerse < startVerse
    ) {
      endVerse = startVerse;
    }

    return {
      bookId: matchedBook.id,
      bookName: matchedBook.standardName,
      startChapter,
      startVerse,
      endChapter,
      endVerse,
      citationLabel: cleaned
    };
  }
}
