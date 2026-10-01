import * as fs from 'fs';
import * as path from 'path';
import pdf from 'pdf-parse';
import { ParsedDay, ParsedPlanResult, ParsedReading } from './types';
import { CitationParser } from './CitationParser';

export class ThematicPlanParser {
  async parseFile(filePath: string): Promise<ParsedPlanResult> {
    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found: ${resolvedPath}`);
    }

    const fileBuffer = fs.readFileSync(resolvedPath);
    const filename = path.basename(filePath).toLowerCase();

    if (filename.includes('pentecost') || filename.includes('hechos')) {
      return this.parsePentecost(fileBuffer);
    } else if (filename.includes('pascua')) {
      return this.parsePassover(fileBuffer);
    }

    // Fallback based on text content
    const quickExtract = await pdf(fileBuffer);
    if (/pentecost/i.test(quickExtract.text)) {
      return this.parsePentecost(fileBuffer);
    } else {
      return this.parsePassover(fileBuffer);
    }
  }

  private async parsePentecost(buffer: Buffer): Promise<ParsedPlanResult> {
    const planId = 'pentecost';
    const plan = {
      id: planId,
      title: 'Hechos 2: Pentecostés y el inicio de la Iglesia de Dios',
      description:
        'La fiesta de Pentecostés es la tercera de las fiestas santas anuales reveladas en la Biblia. Esta guía temática de 7 días lo lleva a través del capítulo 2 de Hechos con preguntas de reflexión y artículos de estudio.',
      archetype: 'thematic' as const,
      totalDays: 7,
      isFeatured: false
    };

    const pdfData = await pdf(buffer);
    const text = pdfData.text;

    const dayMeta = [
      {
        dayNum: 1,
        citation: 'Hechos 2:1-4',
        title: 'Los discípulos se reúnen en la fiesta de Pentecostés',
        resources: [
          '¿Qué es hablar en lenguas?',
          'Un acontecimiento que captó la atención'
        ]
      },
      {
        dayNum: 2,
        citation: 'Hechos 2:5-13',
        title: 'El don de hablar en lenguas capta la atención',
        resources: [
          '¿Qué pasa si no puedo hablar en lenguas?',
          'De Pentecostés a... ¡pentecostalismo?'
        ]
      },
      {
        dayNum: 3,
        citation: 'Hechos 2:14-21',
        title: 'Pedro comienza su poderoso mensaje espontáneo',
        resources: [
          'El sermón que dio comienzo a la Iglesia',
          'La vida del apóstol Pedro',
          'Pentecostés y el libro de Joel'
        ]
      },
      {
        dayNum: 4,
        citation: 'Hechos 2:22-24',
        title: 'Pedro proclama la identidad de Jesús',
        resources: []
      },
      {
        dayNum: 5,
        citation: 'Hechos 2:25-35',
        title: 'La profecía de David sobre la resurrección de Cristo a gloria',
        resources: [
          'El poder de su resurrección',
          'Ni permitirás que tu santo vea corrupción'
        ]
      },
      {
        dayNum: 6,
        citation: 'Hechos 2:36-39',
        title: 'El poderoso llamado a la acción de Pedro',
        resources: [
          'Arrepentimiento: compungirse de corazón',
          'Se compungieron de corazón',
          'Muchos son llamados, y pocos escogidos',
          '7 pasos del llamamiento cristiano'
        ]
      },
      {
        dayNum: 7,
        citation: 'Hechos 2:40-47',
        title: 'El dramático comienzo de la Iglesia de Dios',
        resources: [
          '¿Cuál es el propósito de la Iglesia?',
          'Manifestaciones de la unidad',
          'La Iglesia de Dios: ¿qué es en realidad?',
          'Hechos de los apóstoles',
          '¿Por qué celebramos Pentecostés en domingo?'
        ]
      }
    ];

    // Extract questions per day dynamically from the PDF text
    // Day 1 questions appear before "DÍA 1 | Hechos 2:1-4"
    const days: ParsedDay[] = [];

    // Helper to extract numbered questions from a chunk of text
    function extractQuestions(chunk: string): string[] {
      const qRegex = /(\d+)\.\s+([^]+?)(?=(?:\d+\.\s+)|DÍA|RECURSOS|$)/g;
      const questions: string[] = [];
      let match: RegExpExecArray | null;
      while ((match = qRegex.exec(chunk)) !== null) {
        const cleaned = match[2]
          .replace(/[\uFFFD\u2022\u25A0\u25A1\u25CF\u25CB]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (cleaned.length > 10) {
          questions.push(cleaned);
        }
      }
      return questions;
    }

    // Find indices of "DÍA {n} |"
    const dayIndices: { dayNum: number; index: number }[] = [];
    const diaHeaderRegex = /DÍA\s+(\d+)\s*\|\s*Hechos/g;
    let m: RegExpExecArray | null;
    while ((m = diaHeaderRegex.exec(text)) !== null) {
      dayIndices.push({ dayNum: parseInt(m[1], 10), index: m.index });
    }

    const q1Start = text.indexOf('1. ¿Por qué los apóstoles');

    for (let i = 0; i < dayMeta.length; i++) {
      const meta = dayMeta[i];
      const dayId = `${planId}-day-${meta.dayNum}`;
      const parsedCit = CitationParser.parse(meta.citation);

      let chunk = '';
      if (meta.dayNum === 1 && q1Start !== -1 && dayIndices[1]) {
        chunk = text.slice(q1Start, dayIndices[1].index);
      } else {
        const curIdx = dayIndices.find(d => d.dayNum === meta.dayNum)?.index ?? -1;
        const nextIdx =
          dayIndices.find(d => d.dayNum === meta.dayNum + 1)?.index ?? text.length;
        if (curIdx !== -1) {
          chunk = text.slice(curIdx, nextIdx);
        }
      }

      const questions = extractQuestions(chunk);

      // Extract any extra resources under RECURSOS: in this chunk if present
      const recMatch = chunk.match(/RECURSOS:\s*([\s\S]+?)(?=(?:DÍA|©|$))/);
      let resources = meta.resources;
      if (recMatch) {
        const found = recMatch[1]
          .split('\n')
          .map(l => l.trim())
          .filter(
            l =>
              l.length > 5 &&
              !l.startsWith('©') &&
              !l.includes('Iglesia de Dios') &&
              !l.includes('CARACTERÍSTICA')
          );
        if (found.length > 0) {
          resources = Array.from(new Set([...resources, ...found]));
        }
      }

      const reading: ParsedReading = {
        id: `${dayId}-reading-0`,
        dayId,
        orderIndex: 0,
        bookId: parsedCit.bookId,
        bookName: parsedCit.bookName,
        startChapter: parsedCit.startChapter,
        startVerse: parsedCit.startVerse,
        endChapter: parsedCit.endChapter,
        endVerse: parsedCit.endVerse,
        citationLabel: parsedCit.citationLabel
      };

      days.push({
        id: dayId,
        planId,
        dayNumber: meta.dayNum,
        title: `Día ${meta.dayNum}: ${meta.title}`,
        devotionalNotes: meta.title,
        reflectionQuestions: questions.length > 0 ? questions : undefined,
        explicitArticleTitles: resources.length > 0 ? resources : undefined,
        readings: [reading]
      });
    }

    return { plan, days };
  }

  private async parsePassover(buffer: Buffer): Promise<ParsedPlanResult> {
    const planId = 'passover';
    const plan = {
      id: planId,
      title: 'Preparación para la Pascua y el auto examen',
      description:
        'Como parte de nuestra preparación para la Pascua anual, las Escrituras nos instruyen que debemos examinarnos. Este período de introspección nos ayuda a desarrollar nuestra relación con Dios y Jesucristo a medida que crecemos continuamente en el entendimiento de lo que el sacrificio pascual de Cristo significa para nosotros.',
      archetype: 'thematic' as const,
      totalDays: 6,
      isFeatured: false
    };

    const pdfData = await pdf(buffer);
    const text = pdfData.text;

    const pautasIdx = text.indexOf('PAUTAS PARA COMENZAR:');
    const recIdx = text.indexOf('RECURSOS ADICIONALES');
    const pautasText =
      pautasIdx !== -1
        ? text.slice(pautasIdx + 'PAUTAS PARA COMENZAR:'.length, recIdx !== -1 ? recIdx : text.length)
        : text;

    const splitRegex = /(?=(?:En\s+(?:1\s+de\s+Corintios|Mateo|Efesios|el\s+Salmo)|Estudie\s+las\s+obras))/g;
    const rawParagraphs = pautasText
      .split(splitRegex)
      .map(p =>
        p
          .replace(/[\uFFFD\u2022\u25A0\u25A1\u25CF\u25CB]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      )
      .filter(p => p.length > 20);

    const passoverDaysConfig = [
      {
        dayNum: 1,
        citation: '1 Corintios 11:27-32',
        title: 'Tomar la Pascua de una manera digna',
        resource: '“Examinaos a vosotros mismos”: ¿qué significa ser reprobado?'
      },
      {
        dayNum: 2,
        citation: 'Mateo 5:48',
        title: 'Sed perfectos como vuestro Padre',
        resource: 'Características de Dios en el Antiguo y Nuevo Testamento - Infografía'
      },
      {
        dayNum: 3,
        citation: 'Mateo 23:23',
        title: 'La justicia, la misericordia y la fe',
        resource: 'Las prioridades de Dios: lo más importante de la ley'
      },
      {
        dayNum: 4,
        citation: 'Efesios 4:13',
        title: 'La unidad en la fe',
        resource: 'Resentimientos'
      },
      {
        dayNum: 5,
        citation: 'Salmo 19:12-14',
        title: 'Pecados secretos y soberbia',
        resource: undefined
      },
      {
        dayNum: 6,
        citation: 'Gálatas 5:19-23',
        title: 'Las obras de la carne y el fruto del Espíritu',
        resource: 'El fruto del Espíritu'
      }
    ];

    const days: ParsedDay[] = [];

    for (let i = 0; i < passoverDaysConfig.length; i++) {
      const cfg = passoverDaysConfig[i];
      const dayId = `${planId}-day-${cfg.dayNum}`;
      const parsedCit = CitationParser.parse(cfg.citation);
      const question = rawParagraphs[i] || `Reflexión sobre ${cfg.citation}`;

      const reading: ParsedReading = {
        id: `${dayId}-reading-0`,
        dayId,
        orderIndex: 0,
        bookId: parsedCit.bookId,
        bookName: parsedCit.bookName,
        startChapter: parsedCit.startChapter,
        startVerse: parsedCit.startVerse,
        endChapter: parsedCit.endChapter,
        endVerse: parsedCit.endVerse,
        citationLabel: parsedCit.citationLabel
      };

      days.push({
        id: dayId,
        planId,
        dayNumber: cfg.dayNum,
        title: `Día ${cfg.dayNum}: ${cfg.title}`,
        devotionalNotes: cfg.title,
        reflectionQuestions: [question],
        explicitArticleTitles: cfg.resource ? [cfg.resource] : undefined,
        readings: [reading]
      });
    }

    return { plan, days };
  }
}
