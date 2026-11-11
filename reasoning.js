import { neighbors, infer } from './engine.js';

// A separate, exhaustive checker for small teaching positions. No hidden board input.
export function validateObservation(o) {
  if (!o || !Number.isInteger(o.rows) || !Number.isInteger(o.cols) || o.rows < 1 || o.cols < 1 || o.rows > 16 || o.cols > 16 || !Number.isInteger(o.mines) || o.mines < 0 || o.mines > o.rows * o.cols) throw new Error('Invalid board dimensions or mine count.');
  if (!Array.isArray(o.cells) || o.cells.length !== o.rows * o.cols || !o.cells.every(n => n === null || Number.isInteger(n) && n >= 0 && n <= 8)) throw new Error('Only revealed clues and null hidden cells are accepted.');
  if (!Array.isArray(o.knownMines) || new Set(o.knownMines).size !== o.knownMines.length || !o.knownMines.every(i => Number.isInteger(i) && i >= 0 && i < o.cells.length && o.cells[i] === null)) throw new Error('Invalid known mines.');
}

export function examine(o, target, limit = 18) {
  validateObservation(o);
  if (!Number.isInteger(target) || target < 0 || target >= o.cells.length || o.cells[target] !== null) throw new Error('Choose a hidden cell.');
  const known = new Set(o.knownMines);
  const hidden = o.cells.flatMap((n, i) => n === null && !known.has(i) ? [i] : []);
  if (hidden.length > Math.min(18, limit)) return { status: 'limit', total: null, safeWorld: null, mineWorld: null };
  const constraints = o.cells.flatMap((n, i) => n === null ? [] : [{ ids: neighbors(i, o.rows, o.cols), count: n }]);
  let total = 0, mineWorld = null, safeWorld = null;
  for (let mask = 0; mask < 2 ** hidden.length; mask++) {
    const mines = new Set(known);
    hidden.forEach((id, bit) => { if (mask & 2 ** bit) mines.add(id); });
    if (mines.size !== o.mines || !constraints.every(c => c.ids.filter(id => mines.has(id)).length === c.count)) continue;
    total++;
    if (mines.has(target)) mineWorld ??= [...mines];
    else safeWorld ??= [...mines];
  }
  return { status: !total ? 'inconsistent' : mineWorld === null ? 'safe' : safeWorld === null ? 'mine' : 'uncertain', total, safeWorld, mineWorld };
}

export function assessMove(observation, target) {
  validateObservation(observation);
  const result = infer(observation);
  const proof = result.proofs.find(p => p.ids.includes(target));
  if (observation.knownMines.includes(target)) return { status: 'mine', explanation: 'This cell was already proved to be a mine.' };
  if (proof) return { status: proof.type, explanation: `${proof.source}. ${proof.explanation}`, proof };
  return { status: 'unproved', explanation: 'The current deduction rules cannot prove this cell safe. That does not mean it is a mine. Look for another clue or use Step.' };
}

export function makeReport(observation) {
  validateObservation(observation);
  // Whitelist fields: never include a seed, hidden board, history, or actual mine positions.
  const publicObservation = { rows: observation.rows, cols: observation.cols, mines: observation.mines, cells: [...observation.cells], knownMines: [...observation.knownMines] };
  const a = infer(publicObservation);
  return { format: 'minemind-observation-v1', description: 'Deductions conditional on the supplied revealed clues and known mines. Not a signed or independently verified game transcript.', observation: publicObservation, deductions: { safe: a.safe, mines: a.marked, contradiction: a.contradiction }, proofs: a.proofs };
}

export const LESSONS = [
  { title: '01 · All neighbors accounted for', target: 2, observation: { rows: 1, cols: 3, mines: 1, knownMines: [0], cells: [null, 1, null] }, explanation: 'The middle clue already touches one known mine. The other neighbor must be safe.' },
  { title: '02 · Every hidden cell is needed', target: 1, observation: { rows: 1, cols: 2, mines: 1, knownMines: [], cells: [1, null] }, explanation: 'The clue needs one mine and has exactly one hidden neighbor. That neighbor must be a mine.' },
  { title: '03 · Subtract overlapping constraints', target: 6, observation: { rows: 2, cols: 4, mines: 2, knownMines: [], cells: [1, 1, null, null, null, null, null, null] }, explanation: 'A1 needs one mine among A2 and B2. B1 needs one among C1, A2, B2, and C2. Subtract the first set: C1 and C2 contain zero mines.' },
  { title: '04 · Know when you cannot know', target: 0, observation: { rows: 1, cols: 3, mines: 1, knownMines: [], cells: [null, 1, null] }, explanation: 'Either end could contain the one mine. Both arrangements satisfy the same clue. No logical argument can distinguish them from this information.' },
  { title: '05 · Use the total mine count', target: 3, observation: { rows: 1, cols: 4, mines: 1, knownMines: [], cells: [1, null, null, null] }, explanation: 'A1 forces B1 to be a mine. Since the entire board has only one mine, C1 and D1 must be safe.' },
];
