import * as fs from 'fs';
import * as path from 'path';
import pdf from 'pdf-parse';
import { ParsedDay, ParsedPlanResult, ParsedReading } from './types';
import { CitationParser } from './CitationParser';

export class MonthlyPlanParser {
  async parseFile(filePath: string): Promise<ParsedPlanResult> {
    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found: ${resolvedPath}`);
    }

    const fileBuffer = fs.readFileSync(resolvedPath);
    const pdfData = await pdf(fileBuffer);
    const lines = pdfData.text
      .split('\n')
      .map(l =>
        l
          .replace(/[\uFFFD\u2022\u25A0\u25A1\u25CF\u25CB]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      )
      .filter(Boolean);

    // Extract description
    const desafioIdx = lines.findIndex(l => /DESAFÍO/i.test(l));
    const description =
      desafioIdx > 0
        ? lines.slice(0, desafioIdx).join(' ')
        : 'Desafío mensual de lectura y meditación diaria.';

    // Extract theme/subtitle
    const themeIdx = lines.findIndex(l => /Reflejar la bondad/i.test(l));
    const theme =
      themeIdx >= 0 ? lines[themeIdx] : 'Reflejar la bondad de Dios';

    const planId = 'ued-september-2026';
    const plan = {
      id: planId,
      title: `Desafío Una Escritura Diaria — ${theme}`,
      description,
      archetype: 'monthly' as const,
      totalDays: 30,
      isFeatured: false
    };

    // Extract 30 day citations
    const citations: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l === '1' && lines[i + 29] === '30') {
        for (let j = i + 30; j < i + 60 && j < lines.length; j++) {
          citations.push(lines[j]);
        }
        break;
      }
    }

    // Fallback: if not matched through numbers block, scan for citations
    if (citations.length < 30) {
      for (const line of lines) {
        if (
          /^(Gálatas|Efesios|Colosenses|1 Corintios|Proverbios|Miqueas|Lucas|Romanos|2 Pedro|1 Tesalonicenses|Tito|Salmos|Isaías|Jeremías|Zacarías|Oseas|Su escritura)/i.test(
            line
          )
        ) {
          citations.push(line);
        }
      }
    }

    const days: ParsedDay[] = [];
    for (let d = 1; d <= 30; d++) {
      const citationStr = citations[d - 1] || 'Salmos 119:105';
      const dayId = `${planId}-day-${d}`;
      const parsed = CitationParser.parse(citationStr);

      const reading: ParsedReading = {
        id: `${dayId}-reading-0`,
        dayId,
        orderIndex: 0,
        bookId: parsed.bookId,
        bookName: parsed.bookName,
        startChapter: parsed.startChapter,
        startVerse: parsed.startVerse,
        endChapter: parsed.endChapter,
        endVerse: parsed.endVerse,
        citationLabel: parsed.citationLabel
      };

      days.push({
        id: dayId,
        planId,
        dayNumber: d,
        title: `Día ${d}: ${parsed.citationLabel}`,
        month: 9, // September
        dayOfMonth: d,
        devotionalNotes:
          d === 30 ? 'Día de reflexión: Elija y medite en su escritura favorita.' : undefined,
        readings: [reading]
      });
    }

    return { plan, days };
  }
}
