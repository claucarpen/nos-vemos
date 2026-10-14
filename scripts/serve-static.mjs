// Sirve .vercel/output/static para los tests e2e (el sitio construido usa rutas absolutas).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = join(process.cwd(), '.vercel/output/static');
const port = Number(process.env.PORT ?? 4321);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain' };

createServer(async (req, res) => {
  const path = normalize(new URL(req.url, 'http://x').pathname).replace(/^(\.\.[/\\])+/, '');
  const file = join(root, path.endsWith('/') ? path + 'index.html' : path);
  try {
    // Como Vercel: `/privacidad` sirve `privacidad/index.html` (URLs limpias).
    const body = await readFile(file).catch(async (e) => {
      if (extname(file)) throw e;
      return readFile(join(file, 'index.html'));
    });
    res.writeHead(200, { 'content-type': types[extname(file) || '.html'] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, () => console.log(`static on ${port}`));
