import * as fs from 'fs';
import * as path from 'path';
import pdf from 'pdf-parse';
import { ParsedDay, ParsedPlanResult, ParsedReading } from './types';
import { CitationParser } from './CitationParser';

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const SPANISH_MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre'
];

export class AnnualPlanParser {
  async parseFile(filePath: string): Promise<ParsedPlanResult> {
    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found: ${resolvedPath}`);
    }

    const fileBuffer = fs.readFileSync(resolvedPath);

    // Determine if it is M'Cheyne or Chronological
    const filename = path.basename(filePath).toLowerCase();
    if (filename.includes('avanzado') || filename.includes('mccheyne')) {
      return this.parseMCheyne(fileBuffer);
    } else if (filename.includes('cronologico') || filename.includes('cronológico')) {
      return this.parseChronological(fileBuffer);
    }

    // Fallback: peek at text content
    const quickExtract = await pdf(fileBuffer);
    if (/mccheyne|cuatro secciones/i.test(quickExtract.text)) {
      return this.parseMCheyne(fileBuffer);
    } else {
      return this.parseChronological(fileBuffer);
    }
  }

  private async parseMCheyne(buffer: Buffer): Promise<ParsedPlanResult> {
    const planId = 'mccheyne';
    const plan = {
      id: planId,
      title: "Programa Avanzado de Lectura de la Biblia (M'Cheyne)",
      description:
        "Este popular programa de lectura fue creado por Robert Murray M'Cheyne. En este año, usted leerá una vez el Antiguo Testamento y el Nuevo Testamento y los Salmos dos veces a través de cuatro secciones diarias.",
      archetype: 'annual' as const,
      totalDays: 365,
      isFeatured: true
    };

    const pdfData = await pdf(buffer);
    const lines = pdfData.text
      .split('\n')
      .map(l =>
        l
          .replace(/[\uFFFD\u2022\u25A0\u25A1\u25CF\u25CB]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      )
      .filter(Boolean);

    interface DayAccumulator {
      dayNumber: number;
      readings: string[];
    }

    const rawDays: DayAccumulator[] = [];
    let curDay: DayAccumulator | null = null;

    for (const line of lines) {
      // Check if line starts with day number (1..31) followed by book name
      const dayMatch = line.match(/^(\d{1,2})\s+([A-Za-z0-9ÁÉÍÓÚáéíóú].*)$/);
      if (
        dayMatch &&
        parseInt(dayMatch[1], 10) >= 1 &&
        parseInt(dayMatch[1], 10) <= 31
      ) {
        if (!curDay || curDay.readings.length >= 4) {
          curDay = {
            dayNumber: rawDays.length + 1,
            readings: [dayMatch[2].trim()]
          };
          rawDays.push(curDay);
          continue;
        }
      }

      if (curDay && curDay.readings.length < 4) {
        // Filter out boilerplate text and month headers
        if (
          !line.includes('La Biblia es') &&
          !line.includes('de tener una') &&
          !line.includes('Este año') &&
          !line.includes('lectura fue') &&
          !line.includes('usted leerá') &&
          !line.includes('Provista por') &&
          !SPANISH_MONTHS.includes(line.toLowerCase().replace(/\s+/g, ''))
        ) {
          curDay.readings.push(line);
        }
      }
    }

    // Map rawDays to 12 calendar months
    const days: ParsedDay[] = [];
    let currentRawIdx = 0;

    for (let m = 0; m < 12; m++) {
      const monthNum = m + 1;
      const daysInMonth = MONTH_DAYS[m];

      for (let d = 1; d <= daysInMonth; d++) {
        const rawDay = rawDays[currentRawIdx];
        const dayNumber = currentRawIdx + 1;
        const dayId = `${planId}-day-${dayNumber}`;

        const parsedReadings: ParsedReading[] = [];
        if (rawDay) {
          rawDay.readings.forEach((citationStr, orderIdx) => {
            const parsed = CitationParser.parse(citationStr);
            parsedReadings.push({
              id: `${dayId}-reading-${orderIdx}`,
              dayId,
              orderIndex: orderIdx,
              bookId: parsed.bookId,
              bookName: parsed.bookName,
              startChapter: parsed.startChapter,
              startVerse: parsed.startVerse,
              endChapter: parsed.endChapter,
              endVerse: parsed.endVerse,
              citationLabel: parsed.citationLabel
            });
          });
        }

        days.push({
          id: dayId,
          planId,
          dayNumber,
          month: monthNum,
          dayOfMonth: d,
          readings: parsedReadings
        });

        currentRawIdx++;
      }
    }

    return { plan, days };
  }

  private async parseChronological(buffer: Buffer): Promise<ParsedPlanResult> {
    const planId = 'chronological';
    const plan = {
      id: planId,
      title: 'Programa Cronológico de Lectura de la Biblia',
      description:
        'Este programa cronológico de lectura de la Biblia lo lleva a través de la Biblia en el orden que se ciñe más cercanamente a la línea de tiempo en que los eventos ocurrieron, comenzando con el evento más temprano de todos —la creación.',
      archetype: 'annual' as const,
      totalDays: 365,
      isFeatured: true
    };

    interface PageItem {
      str: string;
      transform: number[];
    }

    const pagesItems: PageItem[][] = [];
    await pdf(buffer, {
      pagerender: (pageData: any) => {
        return pageData.getTextContent().then((tc: any) => {
          pagesItems.push(tc.items);
          return '';
        });
      }
    });

    const days: ParsedDay[] = [];
    let cumulativeDay = 0;

    for (let m = 0; m < 12; m++) {
      const monthNum = m + 1;
      const daysInMonth = MONTH_DAYS[m];
      const items = pagesItems[m] || [];

      // Filter out footer/header text
      const contentItems = items.filter(
        it => it.transform[5] > 120 && it.transform[5] < 600 && it.str.trim()
      );

      function getCol(x: number): number {
        if (x < 160) return 1;
        if (x < 290) return 2;
        if (x < 430) return 3;
        return 4;
      }

      contentItems.sort((a, b) => {
        const colA = getCol(a.transform[4]);
        const colB = getCol(b.transform[4]);
        if (colA !== colB) return colA - colB;
        return b.transform[5] - a.transform[5];
      });

      // Group into lines
      const lines: { col: number; y: number; text: string }[] = [];
      let curLine: { col: number; y: number; text: string } | null = null;
      for (const it of contentItems) {
        if (
          !curLine ||
          Math.abs(curLine.y - it.transform[5]) > 6 ||
          curLine.col !== getCol(it.transform[4])
        ) {
          if (curLine) lines.push(curLine);
          curLine = { col: getCol(it.transform[4]), y: it.transform[5], text: it.str };
        } else {
          curLine.text += ' ' + it.str;
        }
      }
      if (curLine) lines.push(curLine);

      let currentDayNum = 0;
      const monthDays = new Map<number, string[]>();

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const text = line.text
          .replace(/[\uFFFD\u2022\u25A0\u25A1\u25CF\u25CB]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const dayMatch = text.match(/^(\d{1,2})\s+(.+)$/);
        if (dayMatch) {
          const parsedNum = parseInt(dayMatch[1], 10);
          let assignedDay = parsedNum;
          if (assignedDay === currentDayNum + 1) {
            currentDayNum = assignedDay;
          } else if (
            assignedDay === currentDayNum &&
            currentDayNum + 1 <= daysInMonth
          ) {
            // Source typo in PDF (e.g., June 25 repeated instead of 26)
            currentDayNum = currentDayNum + 1;
            assignedDay = currentDayNum;
          }
          monthDays.set(assignedDay, [dayMatch[2].trim()]);
        } else if (currentDayNum > 0 && text) {
          // Check if it's a month title like "MAYO" or "M AYO"
          const normalized = text.toLowerCase().replace(/\s+/g, '');
          if (!SPANISH_MONTHS.includes(normalized)) {
            const list = monthDays.get(currentDayNum) || [];
            list.push(text);
            monthDays.set(currentDayNum, list);
          }
        }
      }

      for (let d = 1; d <= daysInMonth; d++) {
        cumulativeDay++;
        const rawCitations = monthDays.get(d) || [];

        // Join continuation lines (e.g. "Deuteronomio 14-" followed by "16")
        const mergedCitations: string[] = [];
        for (const raw of rawCitations) {
          if (
            /^\d/.test(raw) &&
            !/^[123]\s+[A-Za-zÁÉÍÓÚáéíóú]/.test(raw) &&
            mergedCitations.length > 0
          ) {
            mergedCitations[mergedCitations.length - 1] += ' ' + raw;
          } else {
            mergedCitations.push(raw);
          }
        }

        const dayId = `${planId}-day-${cumulativeDay}`;
        const parsedReadings: ParsedReading[] = [];

        mergedCitations.forEach((cit, orderIdx) => {
          try {
            const parsed = CitationParser.parse(cit);
            parsedReadings.push({
              id: `${dayId}-reading-${orderIdx}`,
              dayId,
              orderIndex: orderIdx,
              bookId: parsed.bookId,
              bookName: parsed.bookName,
              startChapter: parsed.startChapter,
              startVerse: parsed.startVerse,
              endChapter: parsed.endChapter,
              endVerse: parsed.endVerse,
              citationLabel: parsed.citationLabel
            });
          } catch {
            // Fallback if parsing citation fails
            parsedReadings.push({
              id: `${dayId}-reading-${orderIdx}`,
              dayId,
              orderIndex: orderIdx,
              bookId: 'GEN',
              bookName: 'Génesis',
              startChapter: 1,
              endChapter: 1,
              citationLabel: cit
            });
          }
        });

        days.push({
          id: dayId,
          planId,
          dayNumber: cumulativeDay,
          month: monthNum,
          dayOfMonth: d,
          readings: parsedReadings
        });
      }
    }

    return { plan, days };
  }
}
