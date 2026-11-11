import { readFile } from 'node:fs/promises';
import { makeReport } from '../reasoning.js';
try {
  if (!process.argv[2]) throw new Error('Usage: npm run verify-report -- path/to/minemind-reasoning.json');
  const report = JSON.parse(await readFile(process.argv[2], 'utf8'));
  if (report.format !== 'minemind-observation-v1') throw new Error('Unsupported report format.');
  const regenerated = makeReport(report.observation);
  if (JSON.stringify(regenerated.deductions) !== JSON.stringify(report.deductions) || JSON.stringify(regenerated.proofs) !== JSON.stringify(report.proofs)) throw new Error('Report deductions do not match this engine.');
  console.log('PASS: Deductions reproduce from the supplied public observations. This checks consistency with this engine, not the authenticity of a game or the truth of supplied clues.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
