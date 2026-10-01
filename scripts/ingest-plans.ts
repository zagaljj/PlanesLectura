import * as fs from 'fs';
import * as path from 'path';
import { AnnualPlanParser } from '../src/data/parsers/AnnualPlanParser';
import { MonthlyPlanParser } from '../src/data/parsers/MonthlyPlanParser';
import { ThematicPlanParser } from '../src/data/parsers/ThematicPlanParser';

async function main() {
  const rootDir = process.cwd();
  const outputDir = path.resolve(rootDir, 'assets/data/plans');
  fs.mkdirSync(outputDir, { recursive: true });

  const annualParser = new AnnualPlanParser();
  const monthlyParser = new MonthlyPlanParser();
  const thematicParser = new ThematicPlanParser();

  console.log('--- Starting Bible Reading Plans Ingestion Pipeline ---');

  // 1. Chronological Plan
  console.log('Ingesting Chronological Plan...');
  const chronoResult = await annualParser.parseFile(
    path.resolve(rootDir, 'Programa_cronologico_de_la_biblia.pdf')
  );
  fs.writeFileSync(
    path.resolve(outputDir, 'chronological.json'),
    JSON.stringify(chronoResult, null, 2),
    'utf-8'
  );
  console.log(
    `✓ Chronological plan ingested: ${chronoResult.days.length} days, saved to assets/data/plans/chronological.json`
  );

  // 2. Robert Murray M'Cheyne Advanced Plan
  console.log("Ingesting Robert Murray M'Cheyne Plan...");
  const mccheyneResult = await annualParser.parseFile(
    path.resolve(rootDir, 'Programa_avanzado_de_lectura_de_la_biblia.pdf')
  );
  fs.writeFileSync(
    path.resolve(outputDir, 'mccheyne.json'),
    JSON.stringify(mccheyneResult, null, 2),
    'utf-8'
  );
  console.log(
    `✓ M'Cheyne plan ingested: ${mccheyneResult.days.length} days, saved to assets/data/plans/mccheyne.json`
  );

  // 3. UED Monthly Challenge
  console.log('Ingesting UED Monthly Challenge...');
  const uedResult = await monthlyParser.parseFile(
    path.resolve(rootDir, 'UED_Septiembre_2026.pdf')
  );
  fs.writeFileSync(
    path.resolve(outputDir, 'ued.json'),
    JSON.stringify(uedResult, null, 2),
    'utf-8'
  );
  console.log(
    `✓ UED monthly plan ingested: ${uedResult.days.length} days, saved to assets/data/plans/ued.json`
  );

  // 4. Pentecost Thematic Plan
  console.log('Ingesting Hechos 2 (Pentecost) Thematic Plan...');
  const pentecostResult = await thematicParser.parseFile(
    path.resolve(rootDir, 'VEV_PLT_Hechos-2-Pentecostes.pdf')
  );
  fs.writeFileSync(
    path.resolve(outputDir, 'pentecost.json'),
    JSON.stringify(pentecostResult, null, 2),
    'utf-8'
  );
  console.log(
    `✓ Pentecost plan ingested: ${pentecostResult.days.length} days, saved to assets/data/plans/pentecost.json`
  );

  // 5. Passover Thematic Plan
  console.log('Ingesting Preparación para la Pascua Thematic Plan...');
  const passoverResult = await thematicParser.parseFile(
    path.resolve(rootDir, 'VEV_PLT_Preparacion-para-la-Pascua.pdf')
  );
  fs.writeFileSync(
    path.resolve(outputDir, 'passover.json'),
    JSON.stringify(passoverResult, null, 2),
    'utf-8'
  );
  console.log(
    `✓ Passover plan ingested: ${passoverResult.days.length} days, saved to assets/data/plans/passover.json`
  );

  console.log('--- All 5 plans successfully ingested into assets/data/plans/ ---');
}

main().catch(err => {
  console.error('Ingestion failed with error:', err);
  process.exit(1);
});
