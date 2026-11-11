import test from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS, examine, assessMove, makeReport, validateObservation } from '../reasoning.js';
import { createBoard, observe, reveal, neighbors, LEVELS } from '../engine.js';

test('all teaching conclusions are exhaustively verified', () => {
  const expected = ['safe', 'mine', 'safe', 'uncertain', 'safe'];
  LESSONS.forEach((lesson, i) => {
    const result = examine(lesson.observation, lesson.target);
    assert.equal(result.status, expected[i]);
    assert(result.total > 0);
    for (const world of [result.safeWorld, result.mineWorld].filter(w => w !== null)) {
      assert.equal(world.length, lesson.observation.mines);
      lesson.observation.cells.forEach((n, id) => {
        if (n !== null) assert.equal(neighbors(id, lesson.observation.rows, lesson.observation.cols).filter(i => world.includes(i)).length, n);
      });
    }
  });
});
test('ambiguity returns opposing valid worlds, not an arbitrary guess', () => {
  const lesson = LESSONS[3], result = examine(lesson.observation, lesson.target);
  assert.equal(result.total, 2);
  assert(!result.safeWorld.includes(lesson.target));
  assert(result.mineWorld.includes(lesson.target));
});
test('inconsistent observations and size limits never become certainty', () => {
  assert.equal(examine({ rows: 1, cols: 2, mines: 0, cells: [1, null], knownMines: [] }, 1).status, 'inconsistent');
  assert.equal(examine({ rows: 2, cols: 10, mines: 2, cells: Array(20).fill(null), knownMines: [] }, 0).status, 'limit');
  assert.throws(() => validateObservation({ rows: 1, cols: 2, mines: 1, cells: [-1, null], knownMines: [] }));
  assert.throws(() => examine(LESSONS[0].observation, 1));
});
test('coach permits only provable safety and distinguishes unknown from mine', () => {
  assert.equal(assessMove(LESSONS[0].observation, 2).status, 'safe');
  assert.equal(assessMove(LESSONS[1].observation, 1).status, 'mine');
  assert.equal(assessMove(LESSONS[3].observation, 0).status, 'unproved');
});
test('report excludes hidden board, seed and arbitrary extra fields', () => {
  const board = createBoard(LEVELS.beginner, 'private-seed');
  const o = observe(board, reveal(board, [], [board.start]).revealed);
  const report = makeReport({ ...o, seed: board.seed, mineIds: board.mineIds, secret: 'not allowed' });
  assert.deepEqual(Object.keys(report.observation).sort(), ['cells', 'cols', 'knownMines', 'mines', 'rows']);
  assert.equal(report.observation.cells.filter(c => c === null).length, o.cells.filter(c => c === null).length);
  assert(!JSON.stringify(report).includes('private-seed'));
  assert.deepEqual(report, makeReport(JSON.parse(JSON.stringify(report)).observation));
});
test('coach never approves a mine across generated boards', () => {
  for (let seed = 0; seed < 30; seed++) {
    const b = createBoard(LEVELS.beginner, `coach-${seed}`), o = observe(b, reveal(b, [], [b.start]).revealed);
    for (const mine of b.mineIds) assert.notEqual(assessMove(o, mine).status, 'safe');
  }
});
