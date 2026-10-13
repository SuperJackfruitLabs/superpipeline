// apps/web/e2e/pixel/render-error.test.ts
import { describe, expect, it } from 'vitest';
import { renderFailure } from './report';

const row = { artboard: 'SP-Dlg-Move-Paper', vibe: 'paper', theme: 'light' };

describe('a render error in the pixel runner', () => {
  it('fails an allow-listed key with its cause instead of excusing it', () => {
    const f = renderFailure(row, 'SP-Dlg-Move-Paper·light', 'no [data-ready] after 15000ms');
    expect(f.row.status).toBe('fail');
    expect(f.row.error).toBe('no [data-ready] after 15000ms');
    expect(f.row.ratio).toBeUndefined();
    expect(f.message).toBe('SP-Dlg-Move-Paper·light: the app did not render: no [data-ready] after 15000ms');
  });
  it('is the same failure for a key that is not allow-listed', () => {
    expect(renderFailure(row, 'k', 'boom').row.status).toBe('fail');
  });
});
