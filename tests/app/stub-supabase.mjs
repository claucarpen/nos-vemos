// Supabase falso para los tests de la app sin sesión: ninguna juntada existe.
// No es un mock del comportamiento real: solo contesta lo que piden las páginas sin sesión.
import { createServer } from 'node:http';

const port = Number(process.env.STUB_PORT ?? 54329);

createServer((req, res) => {
  const json = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (req.url === '/salud') return json(200, { ok: true });
  if (req.method === 'POST' && req.url?.startsWith('/rest/v1/rpc/juntada_publica')) return json(200, []);
  json(404, { message: `stub: ${req.method} ${req.url} no está simulado` });
}).listen(port, '127.0.0.1', () => console.log(`stub supabase en ${port}`));
