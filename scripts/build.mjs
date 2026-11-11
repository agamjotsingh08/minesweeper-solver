import { mkdir, copyFile } from 'node:fs/promises';
const files = ['index.html', 'style.css', 'app.js', 'engine.js', 'worker.js', 'reasoning.js', 'lessons.js', 'favicon.svg'];
const target = new URL('../dist/', import.meta.url);
await mkdir(target, { recursive: true });
for (const file of files) await copyFile(new URL(`../${file}`, import.meta.url), new URL(file, target));
console.log(`Prepared ${files.length} static assets in dist/. No deployment, commit, or push performed.`);
