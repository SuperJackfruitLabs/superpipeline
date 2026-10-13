#!/usr/bin/env node
// apps/web/scripts/pixel/recv.mjs <dir> — receive a canvas export: POST /?name=<Artboard>[.dark] with the DOM as the body.
import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2];
if (!dir) { console.error('usage: recv.mjs <dir>'); process.exit(2); }
createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.end();
  const name = new URL(req.url, 'http://x').searchParams.get('name') ?? '';
  if (!/^SP-[A-Za-z0-9-]+(\.dark)?$/.test(name)) { res.statusCode = 400; return res.end('bad name'); }
  let body = ''; req.on('data', (c) => (body += c)); req.on('end', () => {
    writeFileSync(join(dir, `${name}.html`), `<!doctype html>\n${body}`); res.end('ok'); console.log('wrote', name);
  });
}).listen(8977, () => console.log('listening on :8977'));
