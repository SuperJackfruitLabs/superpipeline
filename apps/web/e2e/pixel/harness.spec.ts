// The pixel harness's own guards, in a real browser: fonts must be the routed files, nothing may
// leave the sandbox, and an empty render cannot pass. Not a screen comparison; it boots no app page.
import { expect, test } from '@playwright/test';
import { referenceFontCss } from './fonts';
import { renderReference, resolveReference } from './reference';
import { renderApp } from './app';
import { SCREENS } from './screens';

const ART = 'SP-Board-Studio';
const src = () => resolveReference(ART, 'light')!;

test('a clean reference renders with every family it uses loaded', async ({ page }) => {
  const { shots } = await renderReference(page, src(), ART);
  expect(shots).toHaveLength(1);
});

test('a font file that is missing on disk fails the render', async ({ page }) => {
  const fontCss = referenceFontCss().replace(/(\/fontsource\/@fontsource-variable\/archivo\/files\/)/g, '$1missing-');
  await expect(renderReference(page, src(), ART, { fontCss })).rejects.toThrow(/missing font file.*archivo/);
});

test('a family that is not routed at all fails the render', async ({ page }) => {
  const fontCss = referenceFontCss().split('@font-face').filter((b) => !b.includes("'Archivo'")).join('@font-face');
  await expect(renderReference(page, src(), ART, { fontCss })).rejects.toThrow(/fonts not loaded: .*Archivo/);
});

test('an external request is blocked and fails the render', async ({ page }) => {
  const reached: string[] = [];
  page.on('requestfinished', (r) => { if (r.url().includes('example.com')) reached.push(r.url()); });
  const refPatch = async (p: typeof page) => {
    await p.evaluate(() => new Promise<void>((done) => {
      const img = document.createElement('img');
      img.onload = img.onerror = () => done();
      img.src = 'https://example.com/pixel.png';
      document.body.append(img);
    }));
  };
  await expect(renderReference(page, src(), ART, { refPatch })).rejects.toThrow(/blocked external request https:\/\/example\.com/);
  expect(reached).toEqual([]);
});

test('an empty reference fails the render', async ({ page }) => {
  const refPatch = async (p: typeof page) => { await p.evaluate(() => { document.body.innerHTML = ''; }); };
  await expect(renderReference(page, src(), ART, { refPatch })).rejects.toThrow(/no text|zero size|blank/);
});

test('an app page that requests an external URL and never becomes ready fails with the guard error', async ({ browser }) => {
  test.setTimeout(60_000);
  const screen = { ...SCREENS.find((s) => s.artboard === ART)!, route: '/__pixel-guard' };
  const onPage = async (p: import('@playwright/test').Page) => {
    await p.route('**/__pixel-guard', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>x</title><img src="https://example.com/pixel.png">' }));
  };
  await expect(renderApp(browser, screen, 'light', { onPage })).rejects.toThrow(/pixel origin: blocked external request https:\/\/example\.com/);
});
