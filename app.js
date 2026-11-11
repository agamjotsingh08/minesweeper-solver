import { LEVELS, infer, observe, reveal, coordinate, createBoard } from './engine.js';
import { assessMove, makeReport } from './reasoning.js';
const $ = id => document.getElementById(id);
const STORAGE = 'minefield-v1';
let state = null, analysis = null, running = false, autoTimer = null, busy = false, replayIndex = null, hintIds = null, generationWorker = null;
let saveAvailable = true, toastTimer;
const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const coords = ids => ids.map(i => coordinate(i, state.board.cols)).join(', ');
const flagIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="#000" d="M7 3h2v10h4v2H3v-2h4z"/><path fill="#f00" d="M8 1v7L2 5V4z"/></svg>';
const mineIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path stroke="#000" d="M8 0v16M0 8h16M2 2l12 12M2 14L14 2"/><path fill="#000" d="M4 3h8v1h1v8h-1v1H4v-1H3V4h1z"/><path fill="#fff" d="M5 5h3v3H5z"/></svg>';
const digitSegments = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];
const segmentShapes = { a:'3,1 13,1 15,3 13,5 3,5 1,3', b:'14,4 16,6 16,13 14,15 12,13 12,6', c:'14,16 16,18 16,25 14,27 12,25 12,18', d:'3,26 13,26 15,28 13,30 3,30 1,28', e:'2,16 4,18 4,25 2,27 0,25 0,18', f:'2,4 4,6 4,13 2,15 0,13 0,6', g:'3,13 13,13 15,15 13,17 3,17 1,15' };
function displayCounter(id, value, label) {
  const number = Math.max(-99, Math.min(999, Math.trunc(value)));
  const digits = number < 0 ? `-${String(-number).padStart(2, '0')}` : String(number).padStart(3, '0');
  $(id).setAttribute('aria-label', label);
  $(id).innerHTML = [...digits].map(digit => {
    const active = digit === '-' ? 'g' : digitSegments[Number(digit)];
    return `<svg viewBox="0 0 16 31" aria-hidden="true">${Object.entries(segmentShapes).map(([key, points]) => `<polygon points="${points}" fill="${active.includes(key) ? '#ff0000' : '#300000'}"/>`).join('')}</svg>`;
  }).join('');
}
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 3500); }
function save() {
  if (!state) return;
  try { localStorage.setItem(STORAGE, JSON.stringify(state)); }
  catch { if (saveAvailable) toast('Browser storage unavailable. This session will not be saved.'); saveAvailable = false; }
}
function snapshot(entry) {
  state.journal.push(entry);
  state.history.push({ revealed: [...state.revealed], known: [...state.known], flags: [...state.flags], status: state.status, hit: state.hit, journalLength: state.journal.length });
  save();
}
function current() { return replayIndex === null ? state : { ...state, ...state.history[replayIndex] }; }
function stop() { running = false; clearTimeout(autoTimer); $('autoPlay').innerHTML = '▶ <span>Run AI solver</span>'; }
function updateAnalysis() { const view = current(); analysis = view.status === 'lost' ? null : infer(observe(state.board, view.revealed, view.known)); }
function checkWin() {
  if (state.revealed.length === state.board.rows * state.board.cols - state.board.mines) {
    state.status = 'won';
    const visible = new Set(state.revealed);
    state.known = Array.from({ length: state.board.rows * state.board.cols }, (_, i) => i).filter(i => !visible.has(i));
    state.flags = [];
    stop();
  }
}
function renderBoard(view) {
  const { board } = state, seen = new Set(view.revealed), flags = new Set(view.flags), known = new Set(view.known);
  const previousFocus = document.activeElement?.dataset?.cell;
  $('board').style.setProperty('--cols', board.cols);
  document.querySelector('main').style.setProperty('--board-cols', board.cols);
  $('board').classList.toggle('expert-board', board.cols > 12);
  let html = '<span class="axis"></span>';
  for (let col = 0; col < board.cols; col++) html += `<span class="axis" aria-hidden="true">${String.fromCharCode(65 + col)}</span>`;
  for (let row = 0; row < board.rows; row++) {
    html += `<span class="axis" aria-hidden="true">${row + 1}</span>`;
    for (let col = 0; col < board.cols; col++) {
      const id = row * board.cols + col, n = board.clues[id], visible = seen.has(id), flag = flags.has(id) || known.has(id), showMine = view.status === 'lost' && n === -1;
      const hint = hintIds?.safe.includes(id) ? ' hint-safe' : hintIds?.marked.includes(id) ? ' hint-mine' : '';
      const classes = `cell${visible ? ` revealed n${n}` : ''}${flag ? ' flagged' : ''}${showMine ? ' mine-visible' : ''}${showMine && id === view.hit ? ' exploded' : ''}${hint}`;
      const description = showMine ? 'mine' : visible ? `${n} adjacent mines` : flag ? known.has(id) ? 'proven mine' : 'flagged' : 'hidden';
      html += `<button class="${classes}" data-cell="${id}" aria-label="${coordinate(id, board.cols)}, ${description}" ${busy ? 'disabled' : ''}>${showMine ? mineIcon : visible ? n > 0 ? n : '' : flag ? flagIcon : ''}</button>`;
    }
  }
  $('board').innerHTML = html;
  if (previousFocus !== undefined) $('board').querySelector(`[data-cell="${previousFocus}"]`)?.focus({ preventScroll: true });
}
function renderInspector(view) {
  const a = analysis, done = view.status === 'won';
  $('safeCount').textContent = a?.safe.length ?? 0;
  $('constraintCount').textContent = a?.constraints.length ?? 0;
  $('moveCount').textContent = replayIndex ?? state.history.length - 1;
  $('confidence').textContent = done ? 'COMPLETE' : a?.proofs.length ? 'CERTAIN' : 'NO GUESSING';
  const proof = a?.proofs[0];
  $('deduction').innerHTML = done ? '<h3>Every safe cell accounted for.</h3><p>The board is clear. Explore the replay to see how each clue led to the next deduction.</p>' : view.status === 'lost' ? '<h3>A mine was revealed.</h3><p>Start a new board or review the replay. The AI only plays cells supported by a proof.</p>' : proof ? `<h3>${proof.type === 'safe' ? '◇' : '⚑'} ${escape(proof.rule)}</h3><code>${escape(coords(proof.ids))} → ${proof.count} mine${proof.count === 1 ? '' : 's'}</code><p>${escape(proof.explanation)}</p><details><summary>See the evidence</summary><p>${escape(proof.source)}</p></details>` : '<h3>Certainty has its limits.</h3><p>No safe move is proved by the current rules. The AI will stop here. Try a verified board for a complete no-guess solve.</p>';
  const constraints = a?.constraints ?? [];
  $('knowledge').innerHTML = constraints.length ? constraints.slice(0, 100).map(c => `<div class="constraint-row" title="${escape(c.source)}"><span>{ ${escape(coords(c.ids))} }</span><b>= ${c.count}</b></div>`).join('') + (constraints.length > 100 ? '<small>Showing the first 100 constraints.</small>' : '') : '<p class="section-description">No unresolved constraints.</p>';
  const entries = state.journal.slice(0, replayIndex === null ? state.journal.length : view.journalLength);
  $('journalCount').textContent = `${entries.length} ENTRIES`;
  $('journal').innerHTML = entries.slice(-20).reverse().map((e, i) => `<div class="journal-entry"><span>${String(entries.length - i - 1).padStart(2, '0')}</span><p><strong>${escape(e.title)}</strong><small>${escape(e.detail)}</small></p></div>`).join('');
}
function render() {
  if (!state) return;
  const view = current(), b = state.board;
  updateAnalysis(); renderBoard(view); renderInspector(view);
  const remaining = b.mines - new Set([...view.known, ...view.flags]).size;
  displayCounter('minesLeft', remaining, `${remaining} mines remaining`);
  $('faceReset').className = `face-reset ${view.status}`;
  const cleared = view.revealed.filter(i => b.clues[i] >= 0).length;
  $('progress').textContent = `${Math.round(100 * cleared / (b.rows * b.cols - b.mines))}%`;
  $('boardSize').textContent = `${b.rows} × ${b.cols} GRID`;
  $('boardBadge').textContent = b.verified ? '◇ VERIFIED NO-GUESS' : '◇ CLASSIC RANDOM';
  $('status').className = `status-line ${view.status}`;
  $('status').textContent = replayIndex !== null ? `Reviewing move ${replayIndex}. Select Live to continue playing.` : view.status === 'won' ? `Board cleared. ${state.history.length - 1} moves, every safe cell revealed.` : view.status === 'lost' ? `Mine at ${coordinate(view.hit, b.cols)}. Review your moves or start again.` : running ? 'AI is following the proof. Pause any time to take over.' : analysis?.proofs.length ? `${analysis.safe.length} safe cells and ${analysis.marked.length} mines proved. Your move—or let the AI take it.` : 'Solver paused: no further move proved. No guesses will be made.';
  const disabled = busy || replayIndex !== null || view.status !== 'playing';
  for (const id of ['autoPlay', 'step', 'hint']) $(id).disabled = disabled || !analysis?.proofs.length;
  $('step').disabled ||= running;
  $('hint').disabled ||= running;
  $('replay').max = state.history.length - 1;
  $('replay').value = replayIndex ?? state.history.length - 1;
  $('replay').disabled = busy;
  $('replayLabel').textContent = `${replayIndex ?? state.history.length - 1} / ${state.history.length - 1}`;
  $('autoPlay').innerHTML = running ? 'Ⅱ <span>Pause solver</span>' : '▶ <span>Run AI solver</span>';
  renderTime();
}
function renderTime() { const seconds = state?.elapsed ?? 0; displayCounter('timer', seconds, `${seconds} seconds elapsed`); }
function canPlay() { return state && !busy && replayIndex === null && state.status === 'playing'; }
function playCell(id, flag = false) {
  if (!canPlay()) return;
  stop(); hintIds = null;
  if (state.revealed.includes(id) || state.known.includes(id)) return;
  if (flag) {
    state.flags = state.flags.includes(id) ? state.flags.filter(i => i !== id) : [...state.flags, id];
    snapshot({ title: `${state.flags.includes(id) ? 'Flag placed' : 'Flag removed'} at ${coordinate(id, state.board.cols)}`, detail: 'Your annotation. The solver independently verifies every mine.' });
  } else {
    if (state.flags.includes(id)) { toast('Remove the flag before revealing this cell.'); return; }
    if ($('coachMode').checked) {
      const assessment = assessMove(observe(state.board, state.revealed, state.known), id);
      $('coachFeedback').textContent = `${coordinate(id, state.board.cols)}: ${assessment.explanation}`;
      if (assessment.status !== 'safe') {
        hintIds = assessment.status === 'mine' ? { safe: [], marked: [id] } : null;
        render();
        toast('Coach blocked this reveal: a safe move needs a proof.');
        return;
      }
    }
    const before = state.revealed.length, result = reveal(state.board, state.revealed, [id], state.flags);
    state.revealed = result.revealed; state.hit = result.hit;
    if (result.hit !== null) state.status = 'lost'; else checkWin();
    snapshot({ title: result.hit !== null ? 'A mine was revealed' : `You revealed ${coordinate(id, state.board.cols)}`, detail: `${state.revealed.length - before} cell(s) opened.` });
  }
  render();
}
function step() {
  if (!canPlay()) return;
  updateAnalysis();
  if (analysis.contradiction) { stop(); toast('Conflicting constraints found. Please start a new board.'); return; }
  if (!analysis.safe.length && !analysis.marked.length) { stop(); render(); return; }
  const a = analysis, before = state.revealed.length;
  hintIds = null;
  state.known = [...new Set([...state.known, ...a.marked])];
  // Human flags never enter inference. Proven-safe cells override mistaken annotations.
  state.flags = state.flags.filter(i => !a.safe.includes(i) && !a.marked.includes(i));
  const result = reveal(state.board, state.revealed, a.safe);
  state.revealed = result.revealed; state.hit = result.hit;
  if (result.hit !== null) { state.status = 'lost'; stop(); } else checkWin();
  snapshot({ title: `${a.safe.length} safe · ${a.marked.length} mines proved`, detail: `${[...new Set(a.proofs.map(p => p.rule))].join(' + ')}. ${state.revealed.length - before} cells revealed, including empty-region expansion.` });
  render();
  if (!analysis?.proofs.length || state.status !== 'playing') { stop(); render(); }
}
function tick() { if (!running) return; step(); if (running) autoTimer = setTimeout(tick, Number($('speed').value)); }
function generateBoard(seed = $('seed').value.trim() || 'first-principles') {
  stop(); busy = true; replayIndex = null; hintIds = null;
  generationWorker?.terminate();
  $('coachFeedback').textContent = 'Coach checks your chosen cell against visible clues before revealing it. Unproved does not mean unsafe.';
  const level = $('difficulty').value, verified = $('boardMode').value === 'verified';
  $('boardOverlay').hidden = false; $('generationStatus').textContent = 'Verifying every move in the background';
  if (state) render();
  generationWorker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  const fail = message => { busy = false; $('boardOverlay').hidden = true; $('status').textContent = message; generationWorker.terminate(); if (state) render(); toast(message); };
  generationWorker.onerror = () => fail('The board worker could not start. Run the app through npm start and try again.');
  generationWorker.onmessage = ({ data }) => {
    if (data.kind === 'progress') { $('generationStatus').textContent = `Checked ${data.attempts} candidates. Looking for a complete logical solution…`; return; }
    if (data.kind === 'error') { fail(data.message); return; }
    const board = data.board;
    state = { board, level, revealed: reveal(board, [], [board.start]).revealed, known: [], flags: [], hit: null, status: 'playing', elapsed: 0, history: [], journal: [] };
    busy = false; $('boardOverlay').hidden = true; $('seed').value = seed;
    checkWin();
    snapshot({ title: `Safe opening at ${coordinate(board.start, board.cols)}`, detail: board.verified ? `Board verified in ${board.certificate.steps} deduction rounds. ${board.attempts} candidate(s) tested.` : 'Random board. The solver will stop if its rules cannot prove a move.' });
    const url = new URL(location.href); url.search = ''; history.replaceState(null, '', url); render(); generationWorker.terminate();
  };
  generationWorker.postMessage({ kind: 'generate', level, seed: seed.slice(0, 60), verified });
}
$('board').addEventListener('click', event => { const button = event.target.closest('[data-cell]'); if (button) playCell(Number(button.dataset.cell), $('flagMode').checked); });
$('board').addEventListener('contextmenu', event => { const button = event.target.closest('[data-cell]'); if (button) { event.preventDefault(); playCell(Number(button.dataset.cell), true); } });
$('board').addEventListener('keydown', event => {
  const button = event.target.closest('[data-cell]'); if (!button || !state) return;
  const id = Number(button.dataset.cell), cols = state.board.cols;
  if (event.key.toLowerCase() === 'f') { event.preventDefault(); playCell(id, true); return; }
  const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols };
  if (event.key in offsets) { event.preventDefault(); const next = Math.max(0, Math.min(state.board.rows * cols - 1, id + offsets[event.key])); $('board').querySelector(`[data-cell="${next}"]`)?.focus(); }
});
$('newGame').onclick = () => generateBoard(`field-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`);
$('faceReset').onclick = () => $('newGame').click();
$('learnButton').onclick = () => { stop(); if (state) render(); $('learnDialog').showModal(); };
$('closeLearn').onclick = () => $('learnDialog').close();
$('coachMode').onchange = () => { stop(); $('coachFeedback').hidden = !$('coachMode').checked; if (state) render(); };
$('exportReport').onclick = () => {
  if (!state || busy) return;
  const view = current();
  if (view.status === 'lost') { toast('Select a replay position before the loss to export valid clues.'); return; }
  const report = makeReport(observe(state.board, view.revealed, view.known));
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'minemind-reasoning.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Reasoning report downloaded. Hidden board and seed are excluded.');
};
document.addEventListener('keydown', event => { if (event.key === 'F2') { event.preventDefault(); $('newGame').click(); } });
$('board').addEventListener('pointerdown', event => { if (canPlay() && event.button === 0) $('faceReset').classList.add('surprised'); });
window.addEventListener('pointerup', () => $('faceReset').classList.remove('surprised'));
window.addEventListener('pointercancel', () => $('faceReset').classList.remove('surprised'));
$('gameMenuButton').onclick = () => { const open = $('gameOptions').hidden; $('gameOptions').hidden = !open; $('gameMenuButton').setAttribute('aria-expanded', open); };
$('solverMenuButton').onclick = () => {
  const open = $('solverInspector').hidden;
  $('solverInspector').hidden = !open;
  document.querySelector('main').classList.toggle('show-solver', open);
  $('solverMenuButton').setAttribute('aria-expanded', open);
  if (!open) selectTab(false);
};
$('loadSeed').onclick = () => generateBoard();
$('seed').addEventListener('keydown', e => { if (e.key === 'Enter') generateBoard(); });
$('difficulty').onchange = () => generateBoard();
$('boardMode').onchange = () => generateBoard();
$('step').onclick = step;
$('autoPlay').onclick = () => { if (running) { stop(); render(); } else if (canPlay()) { running = true; render(); autoTimer = setTimeout(tick, 180); } };
$('hint').onclick = () => { if (!canPlay()) return; const p = analysis?.proofs[0]; if (!p) return; hintIds = { safe: p.type === 'safe' ? p.ids : [], marked: p.type === 'mine' ? p.ids : [] }; render(); toast(`${p.rule}: highlighted cells are ${p.type === 'safe' ? 'safe to reveal' : 'proven mines'}.`); };
$('toggleKB').onclick = () => { const expanded = $('knowledge').classList.toggle('expanded'); $('toggleKB').textContent = expanded ? 'Collapse ↙' : 'Expand ↗'; $('toggleKB').setAttribute('aria-expanded', expanded); };
$('replay').oninput = () => { if (!state || busy) return; stop(); hintIds = null; replayIndex = Number($('replay').value); render(); };
$('live').onclick = () => { replayIndex = null; hintIds = null; render(); };
$('copySeed').onclick = async () => {
  if (!state) return;
  const url = new URL(location.href); url.search = new URLSearchParams({ seed: state.board.requestedSeed, level: state.level, mode: state.board.verified ? 'verified' : 'classic' });
  try { await navigator.clipboard.writeText(url.href); toast('Board link copied. Same seed, same opening, same proof.'); }
  catch { toast('Clipboard unavailable. Copy the link from your address bar.'); history.replaceState(null, '', url); }
};
function selectTab(lab) { stop(); $('playPanel').hidden = lab; $('labPanel').hidden = !lab; for (const [id, selected] of [['playTab', !lab], ['labTab', lab]]) { $(id).classList.toggle('active', selected); $(id).setAttribute('aria-selected', selected); } if (state) render(); }
$('playTab').onclick = () => selectTab(false); $('labTab').onclick = () => selectTab(true);
for (const id of ['playTab', 'labTab']) $(id).onkeydown = e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); selectTab(id === 'playTab'); $(id === 'playTab' ? 'labTab' : 'playTab').focus(); } };
$('helpButton').onclick = () => { stop(); if (state) render(); $('helpDialog').showModal(); };
$('closeHelp').onclick = () => $('helpDialog').close();
$('benchmark').onclick = () => {
  const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  $('benchmark').disabled = true; $('benchmarkResults').textContent = 'Starting 30 unfiltered boards…';
  const finish = () => { $('benchmark').disabled = false; worker.terminate(); };
  worker.onerror = () => { $('benchmarkResults').textContent = 'Benchmark worker failed. Please try again.'; finish(); };
  worker.onmessage = ({ data }) => {
    if (data.kind === 'benchmarkProgress') $('benchmarkResults').textContent = `${data.done} / 30 boards tested · ${data.solved} solved without guesses`;
    else if (data.kind === 'benchmark') { $('benchmarkResults').innerHTML = `<strong>${data.solved} / ${data.total} solved</strong>${Math.round(100 * data.solved / data.total)}% completion · ${data.total - data.solved} stalled · 0 guesses<br>${data.steps} deduction rounds · ${(data.ms / 1000).toFixed(2)}s on this device`; finish(); }
    else if (data.kind === 'error') { $('benchmarkResults').textContent = data.message; finish(); }
  };
  worker.postMessage({ kind: 'benchmark', level: $('benchmarkLevel').value });
};
setInterval(() => { if (state?.status === 'playing' && !busy && replayIndex === null && !document.hidden && !$('playPanel').hidden && !$('helpDialog').open && !$('learnDialog').open) { state.elapsed++; renderTime(); if (state.elapsed % 5 === 0) save(); } }, 1000);
document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); save(); if (state) render(); } });
window.addEventListener('pagehide', save);
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE));
    if (!saved || !LEVELS[saved.level] || !saved.history?.length || !saved.journal?.length) return false;
    const b = saved.board, config = LEVELS[saved.level];
    if (b.rows !== config.rows || b.cols !== config.cols || b.mines !== config.mines || !['playing', 'won', 'lost'].includes(saved.status)) return false;
    const reconstructed = createBoard(config, b.seed, b.start);
    if (JSON.stringify(b.clues) !== JSON.stringify(reconstructed.clues)) return false;
    const validIds = ids => Array.isArray(ids) && ids.every(i => Number.isInteger(i) && i >= 0 && i < b.rows * b.cols);
    if (![saved, ...saved.history].every(s => validIds(s.revealed) && validIds(s.known) && validIds(s.flags))) return false;
    state = saved; $('difficulty').value = saved.level; $('boardMode').value = b.verified ? 'verified' : 'classic'; $('seed').value = b.requestedSeed; render(); return true;
  } catch { return false; }
}
const query = new URLSearchParams(location.search);
if (query.has('seed')) { $('seed').value = query.get('seed').slice(0, 60); if (LEVELS[query.get('level')]) $('difficulty').value = query.get('level'); $('boardMode').value = query.get('mode') === 'classic' ? 'classic' : 'verified'; generateBoard(); }
else if (!restore()) generateBoard();
