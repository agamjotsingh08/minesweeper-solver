// The inference API accepts observations only. Hidden mine positions never enter it.
export const LEVELS = {
  beginner: { label: 'Beginner', rows: 9, cols: 9, mines: 10 },
  intermediate: { label: 'Intermediate', rows: 12, cols: 12, mines: 24 },
  expert: { label: 'Expert', rows: 16, cols: 16, mines: 48 },
};
export function neighbors(id, rows, cols) {
  const out = [], r = Math.floor(id / cols), c = id % cols;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if ((dr || dc) && r + dr >= 0 && r + dr < rows && c + dc >= 0 && c + dc < cols) out.push((r + dr) * cols + c + dc);
  }
  return out;
}
export const coordinate = (id, cols) => `${String.fromCharCode(65 + id % cols)}${Math.floor(id / cols) + 1}`;
function random(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function createBoard({ rows, cols, mines }, seed, start = Math.floor(rows / 2) * cols + Math.floor(cols / 2)) {
  const excluded = new Set([start, ...neighbors(start, rows, cols)]);
  const positions = Array.from({ length: rows * cols }, (_, i) => i).filter(i => !excluded.has(i));
  if (mines > positions.length || mines < 0) throw new Error('Invalid mine count');
  const rng = random(seed);
  for (let i = positions.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [positions[i], positions[j]] = [positions[j], positions[i]]; }
  const mineIds = positions.slice(0, mines), set = new Set(mineIds);
  const clues = Array.from({ length: rows * cols }, (_, i) => set.has(i) ? -1 : neighbors(i, rows, cols).filter(n => set.has(n)).length);
  return { rows, cols, mines, mineIds, clues, seed: String(seed), start };
}
export function reveal(board, revealed, ids, blocked = []) {
  const seen = new Set(revealed), flags = new Set(blocked), queue = [...ids];
  let hit = null;
  while (queue.length) {
    const id = queue.pop();
    if (seen.has(id) || flags.has(id)) continue;
    seen.add(id);
    if (board.clues[id] === -1) { hit = id; break; }
    if (board.clues[id] === 0) queue.push(...neighbors(id, board.rows, board.cols));
  }
  return { revealed: [...seen].sort((a, b) => a - b), hit };
}
export function observe(board, revealed, knownMines = []) {
  const seen = new Set(revealed);
  return { rows: board.rows, cols: board.cols, mines: board.mines, knownMines: [...knownMines], cells: board.clues.map((n, i) => seen.has(i) ? n : null) };
}
export function infer(observation) {
  const { rows, cols, mines, cells, knownMines } = observation;
  const known = new Set(knownMines), constraints = [], keys = new Set();
  let contradiction = false;
  const add = (ids, count, source, rule = 'Clue constraint') => {
    ids.sort((a, b) => a - b);
    if (count < 0 || count > ids.length) { contradiction = true; return; }
    if (!ids.length) return;
    const key = `${ids.join(',')}:${count}`;
    if (!keys.has(key)) { keys.add(key); constraints.push({ ids, count, source, rule }); }
  };
  cells.forEach((n, id) => {
    if (n === null || n < 0) return;
    const ns = neighbors(id, rows, cols);
    add(ns.filter(i => cells[i] === null && !known.has(i)), n - ns.filter(i => known.has(i)).length, `Clue ${coordinate(id, cols)} = ${n}`);
  });
  add(cells.flatMap((n, i) => n === null && !known.has(i) ? [i] : []), mines - known.size, 'Total remaining mines', 'Global mine count');
  const deduction = () => {
    const safe = new Set(), marked = new Set(), proofs = [];
    for (const c of constraints) {
      if (c.count === 0 || c.count === c.ids.length) {
        const type = c.count === 0 ? 'safe' : 'mine';
        c.ids.forEach(i => (type === 'safe' ? safe : marked).add(i));
        proofs.push({ ...c, type, explanation: c.count === 0 ? `${c.ids.length === 1 ? 'This hidden cell has' : `These ${c.ids.length} hidden cells have`} no mines remaining. Every one is safe.` : `${c.ids.length === 1 ? 'This hidden cell is' : `All ${c.ids.length} hidden cells are`} needed to satisfy the mine count. Mark ${c.ids.length === 1 ? 'it as a mine' : 'them as mines'}.` });
      }
    }
    if ([...safe].some(i => marked.has(i))) contradiction = true;
    return { safe: [...safe], marked: [...marked], proofs, constraints, contradiction };
  };
  let result = deduction();
  if (result.safe.length || result.marked.length || contradiction) return result;
  // If A is a subset of B, B\A contains count(B)-count(A) mines.
  // Bound work so an unresolved board never freezes the application.
  for (let pass = 0; pass < 5; pass++) {
    const length = constraints.length;
    for (let a = 0; a < length; a++) for (let b = 0; b < length; b++) {
      const A = constraints[a], B = constraints[b];
      if (A.ids.length >= B.ids.length || constraints.length >= 450) continue;
      const bs = new Set(B.ids);
      if (A.ids.every(i => bs.has(i))) {
        const as = new Set(A.ids);
        add(B.ids.filter(i => !as.has(i)), B.count - A.count, `Subtract {${A.ids.map(i => coordinate(i, cols)).join(', ')}} = ${A.count} from {${B.ids.map(i => coordinate(i, cols)).join(', ')}} = ${B.count}`, 'Subset deduction');
      }
    }
    result = deduction();
    if (result.safe.length || result.marked.length || contradiction || constraints.length === length) return result;
  }
  return result;
}
export function certify(board) {
  let revealed = reveal(board, [], [board.start]).revealed, marked = [], steps = 0;
  while (revealed.length < board.rows * board.cols - board.mines && steps < board.rows * board.cols) {
    const result = infer(observe(board, revealed, marked));
    if (result.contradiction || (!result.safe.length && !result.marked.length)) return { solved: false, steps, revealed: revealed.length };
    marked = [...new Set([...marked, ...result.marked])];
    const next = reveal(board, revealed, result.safe);
    if (next.hit !== null) throw new Error('Unsound deduction');
    revealed = next.revealed; steps++;
  }
  return { solved: revealed.length === board.rows * board.cols - board.mines, steps, revealed: revealed.length };
}
export function generate(config, seed, verified = true, progress = () => {}) {
  for (let attempt = 0; attempt < (verified ? 300 : 1); attempt++) {
    const board = createBoard(config, `${seed}:${attempt}`);
    const certificate = verified ? certify(board) : null;
    if (!verified || certificate.solved) return { ...board, requestedSeed: String(seed), verified, attempts: attempt + 1, certificate };
    if (attempt % 5 === 0) progress(attempt + 1);
  }
  throw new Error('No certified board found within 300 attempts. Try another seed or a lower difficulty.');
}
