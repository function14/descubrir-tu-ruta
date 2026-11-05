// Entorno local sin cuentas: API real sobre PGlite + interfaz web en un solo puerto.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearManejador } from '../src/api.mjs';
import { crearBase } from '../test/ayuda.mjs';

const PUERTO = Number(process.env.PORT ?? 8787);
const WEB = fileURLToPath(new URL('../../web/public/', import.meta.url));
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const db = await crearBase();
const manejar = crearManejador(db, { origenPermitido: null });

async function servirEstatico(pathname, res) {
  if (pathname === '/config.js') {
    res.writeHead(200, { 'content-type': TIPOS['.js'] });
    res.end(`window.API_URL = 'http://localhost:${PUERTO}/api';`);
    return;
  }
  const relativa = normalize(pathname === '/' ? 'index.html' : pathname.slice(1));
  const ruta = join(WEB, relativa);
  if (!ruta.startsWith(WEB.replaceAll('/', sep))) {
    res.writeHead(403).end();
    return;
  }
  try {
    const contenido = await readFile(ruta);
    res.writeHead(200, { 'content-type': TIPOS[extname(ruta)] ?? 'application/octet-stream' });
    res.end(contenido);
  } catch {
    res.writeHead(404).end('No encontrado');
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO}`);
  if (!url.pathname.startsWith('/api/')) {
    await servirEstatico(url.pathname, res);
    return;
  }
  let body = '';
  for await (const parte of req) body += parte;
  const respuesta = await manejar({
    rawPath: url.pathname.slice('/api'.length),
    requestContext: { http: { method: req.method } },
    queryStringParameters: Object.fromEntries(url.searchParams),
    body,
  });
  res.writeHead(respuesta.statusCode, respuesta.headers);
  res.end(respuesta.body);
}).listen(PUERTO, () => console.log(`Listo en http://localhost:${PUERTO}`));
