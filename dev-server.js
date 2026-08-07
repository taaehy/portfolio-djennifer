import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import contactHandler from './api/contact.js';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);

function loadLocalEnv() {
  const envPath = join(root, '.env.local');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadLocalEnv();

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function sendJsonResponse(response) {
  let statusCode = 200;
  const adapter = {
    setHeader: (...args) => response.setHeader(...args),
    status(code) {
      statusCode = code;
      return adapter;
    },
    json(payload) {
      response.statusCode = statusCode;
      response.end(JSON.stringify(payload));
    },
  };
  return adapter;
}

async function parseBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 10_000) throw new Error('PAYLOAD_TOO_LARGE');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function resolveStaticPath(pathname) {
  let relative = decodeURIComponent(pathname).replace(/^\/+/, '');
  if (!relative) relative = 'index.html';
  if (relative.endsWith('/')) relative += 'index.html';
  if (relative.split('/').some((segment) => segment.startsWith('.'))) return null;

  const blocked = ['api/', 'lib/', 'test/', 'dev-server.js', 'package.json', 'vercel.json'];
  if (blocked.some((entry) => relative === entry || relative.startsWith(entry))) return null;

  let filePath = resolve(root, normalize(relative));
  if (!filePath.startsWith(`${root}\\`) && filePath !== root) return null;
  if (!existsSync(filePath) && !extname(filePath)) {
    const directoryIndex = join(filePath, 'index.html');
    const htmlFile = `${filePath}.html`;
    if (existsSync(directoryIndex)) filePath = directoryIndex;
    else if (existsSync(htmlFile)) filePath = htmlFile;
  }
  return filePath;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (url.pathname === '/api/contact') {
    try {
      request.body = await parseBody(request);
      await contactHandler(request, sendJsonResponse(response));
    } catch (error) {
      response.statusCode = error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify({ message: 'Dados inválidos.' }));
    }
    return;
  }

  const filePath = resolveStaticPath(url.pathname);
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile() || !mimeTypes[extname(filePath).toLowerCase()]) {
    response.statusCode = 404;
    response.end('Not found');
    return;
  }

  response.statusCode = 200;
  response.setHeader('Content-Type', mimeTypes[extname(filePath).toLowerCase()]);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-cache');
  createReadStream(filePath).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Portfólio disponível em http://127.0.0.1:${port}`);
});
