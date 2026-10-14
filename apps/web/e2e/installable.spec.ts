import { test, expect } from '@playwright/test';

/**
 * The home-screen install files are served to anyone, signed in or not, with the right types.
 *
 * A phone fetches the manifest and icons before anyone has signed in to the installed app, and
 * an iOS home-screen app does not share Safari's cookies. If they sat behind the session check
 * the install would get the sign-in page instead, and the icon would be a screenshot. Checked on
 * both servers: the Vite dev server the suite drives, and the Worker (`wrangler dev`, serving the
 * built `apps/web/build`), which is what production is.
 */
import { PORTS } from '../scripts/ports';
const ORIGINS = [PORTS.webUrl, PORTS.apiUrl];
const FILES: [string, RegExp][] = [
  ['/manifest.webmanifest', /^application\/manifest\+json/],
  ['/brand/icon-192.png', /^image\/png/],
  ['/brand/icon-512.png', /^image\/png/],
  ['/brand/icon-maskable-192.png', /^image\/png/],
  ['/brand/icon-maskable-512.png', /^image\/png/],
  ['/apple-touch-icon.png', /^image\/png/],
  ['/favicon.ico', /^image\/(x-icon|vnd\.microsoft\.icon)/],
  ['/brand/favicon.svg', /^image\/svg\+xml/],
  ['/brand/favicon-16.png', /^image\/png/],
  ['/brand/favicon-32.png', /^image\/png/],
  ['/brand/favicon-48.png', /^image\/png/],
];

for (const origin of ORIGINS) {
  test(`install files are public on ${origin}`, async ({ playwright }) => {
    // A fresh context: no cookies, no dev-auth headers.
    const anon = await playwright.request.newContext();
    try {
      for (const [path, type] of FILES) {
        const res = await anon.get(`${origin}${path}`, { maxRedirects: 0 });
        expect(res.status(), path).toBe(200);
        // Vite's dev server sends .ico with no type at all; the Worker (production) names it.
        if (path.endsWith('.ico') && origin === PORTS.webUrl) continue;
        expect(res.headers()['content-type'], path).toMatch(type);
      }
      const manifest = await (await anon.get(`${origin}/manifest.webmanifest`)).json();
      expect(manifest.display).toBe('standalone');
      // Every icon the manifest names is served too, not only the ones listed above.
      for (const icon of manifest.icons as { src: string }[]) expect((await anon.get(`${origin}${icon.src}`)).status(), icon.src).toBe(200);
    } finally {
      await anon.dispose();
    }
  });
}
