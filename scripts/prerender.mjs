/**
 * Writes real HTML for every route after the Vite build.
 *
 * Both entries otherwise ship `<div id="root"></div>` and nothing else, so a
 * crawler that does not execute JavaScript sees an empty page, and the docs
 * panes - the most searchable content on the site - have no HTML at all. This
 * loads each route in a headless browser, snapshots the rendered document and
 * writes it back into dist, so the markup is there before any script runs. The
 * app still takes over on load; nothing about runtime behaviour changes.
 *
 * It also emits sitemap.xml from the same route list, so the two cannot drift.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const DIST = resolve('dist');
const SITE = 'https://token.devanghacks.in';
const PORT = 41731;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

/** Routes come from the provider registry so a new provider is covered for free. */
async function routes() {
  const bundle = join(DIST, 'prerender-providers.json');
  const ids = existsSync(bundle) ? JSON.parse(readFileSync(bundle, 'utf8')) : [];
  return [
    '/',
    '/docs/',
    '/docs/browser/',
    '/docs/contribute/',
    ...ids.map((id) => `/docs/${id}/`),
  ];
}

function serve() {
  const server = createServer((req, res) => {
    const pathname = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = join(DIST, pathname);
    if (!extname(pathname)) file = join(file, 'index.html');
    if (!file.startsWith(DIST) || !existsSync(file)) {
      // Unknown docs path: the entry still boots and routes on the pathname.
      file = pathname.startsWith('/docs/')
        ? join(DIST, 'docs/index.html')
        : join(DIST, 'index.html');
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => server.listen(PORT, () => ok(server)));
}

async function findChrome() {
  for (const env of [process.env.CHROME_PATH, process.env.PUPPETEER_EXECUTABLE_PATH]) {
    if (env && existsSync(env)) return env;
  }
  const cache = join(process.env.HOME ?? '', '.cache/ms-playwright');
  if (existsSync(cache)) {
    for (const dir of (await readdir(cache)).filter((d) => d.startsWith('chromium-')).sort().reverse()) {
      for (const rel of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
        const bin = join(cache, dir, rel);
        if (existsSync(bin)) return bin;
      }
    }
  }
  for (const bin of ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']) {
    if (existsSync(bin)) return bin;
  }
  return null;
}

function snapshot(chrome, url) {
  return new Promise((ok, fail) => {
    const child = spawn(chrome, [
      '--headless=new', '--disable-gpu', '--no-sandbox',
      '--virtual-time-budget=8000', '--dump-dom', url,
    ], { stdio: ['ignore', 'pipe', 'ignore'] });
    let html = '';
    child.stdout.on('data', (chunk) => (html += chunk));
    child.on('error', fail);
    child.on('close', (code) =>
      code === 0 ? ok(html) : fail(new Error(`chrome exited ${code} for ${url}`))
    );
  });
}

async function main() {
  const list = await routes();
  const chrome = await findChrome();

  if (!chrome) {
    console.warn('prerender: no Chrome found, skipping. Pages ship as empty shells.');
    console.warn('prerender: set CHROME_PATH to enable it.');
  }

  const server = await serve();
  try {
    for (const route of chrome ? list : []) {
      const html = await snapshot(chrome, `http://127.0.0.1:${PORT}${route}`);
      if (!/<h1[\s>]/.test(html)) {
        throw new Error(`prerender: ${route} rendered no <h1>; refusing to write it`);
      }
      const dir = join(DIST, route);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'index.html'), `<!doctype html>\n${html}`);
      console.log(`prerender: ${route.padEnd(24)} ${(html.length / 1024).toFixed(1)} kB`);
    }
  } finally {
    server.close();
  }

  const today = new Date().toISOString().slice(0, 10);
  const urls = list
    .map(
      (route) =>
        `  <url>\n    <loc>${SITE}${route}</loc>\n    <lastmod>${today}</lastmod>\n` +
        `    <changefreq>monthly</changefreq>\n    <priority>${route === '/' ? '1.0' : '0.8'}</priority>\n  </url>`
    )
    .join('\n');
  await writeFile(
    join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  );
  console.log(`prerender: sitemap.xml with ${list.length} urls`);

  // The route list was a build input, not something to publish.
  await rm(join(DIST, 'prerender-providers.json'), { force: true });
}

await main();
