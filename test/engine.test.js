import test from 'node:test';
import assert from 'node:assert/strict';
import { neighbors, createBoard, reveal, infer, observe, certify, generate, LEVELS } from '../engine.js';
test('corner, edge and center neighborhoods do not wrap', () => {
  assert.deepEqual(neighbors(0, 3, 3), [1, 3, 4]);
  assert.equal(neighbors(1, 3, 3).length, 5); assert.equal(neighbors(4, 3, 3).length, 8);
});
test('seeded boards reproduce and opening is empty', () => {
  for (const config of Object.values(LEVELS)) {
    const b = createBoard(config, 'test'); assert.deepEqual(b, createBoard(config, 'test'));
    assert.equal(b.mineIds.length, config.mines); assert.equal(new Set(b.mineIds).size, config.mines);
    assert.equal(b.clues[b.start], 0); assert.equal(reveal(b, [], [b.start]).hit, null);
  }
});
test('flood fill does not reveal a mine or cross a manual flag', () => {
  const b = createBoard(LEVELS.beginner, 'flood');
  const r = reveal(b, [], [b.start], [b.start]); assert.deepEqual(r.revealed, []);
  const opened = reveal(b, [], [b.start]); assert(opened.revealed.every(i => b.clues[i] >= 0));
  assert.equal(reveal(b, [], [b.mineIds[0]]).hit, b.mineIds[0]);
});
test('observations hide every unopened clue and mine', () => {
  const b = createBoard(LEVELS.beginner, 'hidden'), o = observe(b, [b.start]);
  assert.equal(o.cells.filter(v => v !== null).length, 1);
  assert(!('clues' in o)); assert(!('mineIds' in o)); assert(!('seed' in o));
});
test('direct rules prove mines and safe cells', () => {
  assert.deepEqual(infer({ rows: 1, cols: 2, mines: 1, knownMines: [], cells: [1, null] }).marked, [1]);
  assert.deepEqual(infer({ rows: 1, cols: 3, mines: 1, knownMines: [0], cells: [null, 1, null] }).safe, [2]);
});
test('subset subtraction derives safety where direct rules cannot', () => {
  // A1 sees {A2,B2}=1; B1 sees {A2,B2,C2}=1. Therefore C2 is safe.
  const result = infer({ rows: 2, cols: 4, mines: 2, knownMines: [], cells: [1, 1, null, null, null, null, null, null] });
  assert(result.safe.includes(6)); assert(result.proofs.some(p => p.rule === 'Subset deduction'));
});
test('ambiguous positions stall without guessing', () => {
  const a = infer({ rows: 1, cols: 3, mines: 1, knownMines: [], cells: [null, 1, null] });
  assert.equal(a.safe.length, 0); assert.equal(a.marked.length, 0);
});
test('impossible constraints report a contradiction', () => {
  assert(infer({ rows: 1, cols: 2, mines: 1, knownMines: [], cells: [2, null] }).contradiction);
});
test('all deductions are sound across 150 random boards', () => {
  for (const config of Object.values(LEVELS)) for (let seed = 0; seed < 50; seed++) {
    const b = createBoard(config, `soundness-${seed}`); let visible = reveal(b, [], [b.start]).revealed, marked = [];
    for (let round = 0; round < config.rows * config.cols; round++) {
      const a = infer(observe(b, visible, marked)); assert(!a.contradiction);
      assert(a.safe.every(i => b.clues[i] >= 0), `unsafe proof seed ${seed}`);
      assert(a.marked.every(i => b.clues[i] === -1), `false mine seed ${seed}`);
      if (!a.safe.length && !a.marked.length) break;
      marked = [...new Set([...marked, ...a.marked])]; visible = reveal(b, visible, a.safe).revealed;
    }
  }
});
test('verified boards fully solve at every difficulty', () => {
  for (const config of Object.values(LEVELS)) for (const seed of ['first-principles', 'test-1', 'test-2']) {
    const b = generate(config, seed); assert(b.verified); assert(certify(b).solved); assert(b.attempts <= 300);
  }
});
