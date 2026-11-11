import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const target = path.resolve(root, relative);
    if (!target.startsWith(root) || relative.split(/[\\/]/).some(p => p.startsWith('.')) || !types[path.extname(target)]) {
      res.writeHead(403).end('Forbidden'); return;
    }
    const data = await readFile(target);
    res.writeHead(200, { 'Content-Type': `${types[path.extname(target)]}; charset=utf-8`, 'Cache-Control': 'no-cache' }).end(data);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(Number(process.env.PORT) || 4173, '127.0.0.1', () => console.log('Logic Lab is running at http://127.0.0.1:4173'));
