import { generate, LEVELS, certify } from './engine.js';
self.onmessage = ({ data }) => {
  const { kind, id } = data;
  try {
    if (kind === 'generate') {
      const board = generate(LEVELS[data.level], data.seed, data.verified, attempts => self.postMessage({ id, kind: 'progress', attempts }));
      self.postMessage({ id, kind, board });
    } else if (kind === 'benchmark') {
      const start = performance.now(); let solved = 0, steps = 0;
      for (let i = 0; i < 30; i++) {
        const board = generate(LEVELS[data.level], `benchmark-${i}`, false);
        const result = certify(board); solved += Number(result.solved); steps += result.steps;
        self.postMessage({ id, kind: 'benchmarkProgress', done: i + 1, solved });
      }
      self.postMessage({ id, kind, solved, total: 30, steps, ms: performance.now() - start });
    }
  } catch (error) { self.postMessage({ id, kind: 'error', message: error.message }); }
};
