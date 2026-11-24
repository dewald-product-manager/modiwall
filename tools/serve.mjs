/* Local preview: node tools/serve.mjs  ->  http://localhost:4173
   Sends the same security headers as .htaccess, so a CSP or Trusted Types mistake shows up here first. */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const ROOT = resolve('public');
const PORT = Number(process.env.PORT) || 4173;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };
const htaccess = readFileSync(join(ROOT, '.htaccess'), 'utf8');
const header = (name, block = htaccess) => block.match(new RegExp(`Header (?:always )?set ${name} "([^"]+)"`))?.[1];
const SAFE = Object.fromEntries(['Strict-Transport-Security', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy', 'Cross-Origin-Opener-Policy', 'Cross-Origin-Resource-Policy', 'X-Permitted-Cross-Domain-Policies'].map((h) => [h, header(h)]).filter(([, v]) => v));
const CSP = header('Content-Security-Policy', htaccess.match(/<FilesMatch "\\\.html\$">[\s\S]*?<\/FilesMatch>/)?.[0] ?? '').replace(/; upgrade-insecure-requests/, '');

createServer((req, res) => {
  let path;
  try {
    path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  let file = join(ROOT, normalize(path === '/' ? '/index.html' : path));
  let code = 200;
  if (!file.startsWith(ROOT + sep) || !existsSync(file) || statSync(file).isDirectory() || /[\\/]\.(?!well-known[\\/])/.test(file.slice(ROOT.length))) {
    file = join(ROOT, '404.html');
    code = 404;
  }
  const type = TYPES[extname(file)] || 'application/octet-stream';
  res.writeHead(code, { 'content-type': type, ...SAFE, ...(type.startsWith('text/html') && CSP ? { 'content-security-policy': CSP } : {}) });
  createReadStream(file).on('error', () => res.end()).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`http://localhost:${PORT}`));
