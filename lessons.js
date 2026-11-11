import { LESSONS, examine } from './reasoning.js';
import { coordinate } from './engine.js';
const $ = id => document.getElementById(id);
let index = 0, completed = new Set();
try { const ids = JSON.parse(localStorage.getItem('minemind-lessons') || '[]'); if (Array.isArray(ids)) completed = new Set(ids.filter(i => Number.isInteger(i) && i >= 0 && i < LESSONS.length)); } catch {}
function grid(o, target, world) {
  return `<div class="lesson-grid" style="--lesson-cols:${o.cols}">${o.cells.map((n, id) => `<span class="lesson-cell ${id === target ? 'target' : ''}" aria-label="${coordinate(id, o.cols)} ${n !== null ? `clue ${n}` : world ? world.includes(id) ? 'mine' : 'safe' : o.knownMines.includes(id) ? 'known mine' : 'hidden'}">${n !== null ? n : world ? world.includes(id) ? '✹' : '·' : o.knownMines.includes(id) ? '⚑' : '?'}<small>${coordinate(id, o.cols)}</small></span>`).join('')}</div>`;
}
function render() {
  const lesson = LESSONS[index];
  $('lessonSelect').value = index;
  $('lessonQuestion').textContent = `What can you prove about ${coordinate(lesson.target, lesson.observation.cols)}? Total mines: ${lesson.observation.mines}.`;
  $('lessonBoard').innerHTML = grid(lesson.observation, lesson.target);
  $('lessonFeedback').textContent = 'Choose a conclusion before seeing the explanation. The blue outline marks the target cell.';
  $('lessonWorlds').replaceChildren();
  $('lessonProgress').textContent = `${completed.size} / ${LESSONS.length} lessons answered correctly on this device`;
}
$('lessonSelect').innerHTML = LESSONS.map((lesson, i) => `<option value="${i}">${lesson.title}</option>`).join('');
$('lessonSelect').onchange = () => { index = Number($('lessonSelect').value); render(); };
$('nextLesson').onclick = () => { index = (index + 1) % LESSONS.length; render(); };
for (const button of document.querySelectorAll('[data-conclusion]')) button.onclick = () => {
  const lesson = LESSONS[index], result = examine(lesson.observation, lesson.target);
  const correct = button.dataset.conclusion === result.status;
  if (correct) { completed.add(index); try { localStorage.setItem('minemind-lessons', JSON.stringify([...completed])); } catch {} }
  $('lessonFeedback').textContent = `${correct ? 'Correct.' : 'Not quite.'} ${lesson.explanation} Exhaustive check: ${result.total} valid arrangement(s).`;
  $('lessonWorlds').innerHTML = [result.safeWorld !== null ? `<section><h3>A valid world where the target is safe</h3>${grid(lesson.observation, lesson.target, result.safeWorld)}</section>` : '', result.mineWorld !== null ? `<section><h3>A valid world where the target is a mine</h3>${grid(lesson.observation, lesson.target, result.mineWorld)}</section>` : ''].join('');
  $('lessonProgress').textContent = `${completed.size} / ${LESSONS.length} lessons answered correctly on this device`;
};
render();
