import { describe, expect, it } from 'vitest';
import { summarise } from './drift-summary.mjs';

describe('pixel drift summary', () => {
  it('counts each status and names the furthest screens', () => {
    const s = summarise([
      { artboard: 'A', theme: 'light', status: 'pass', ratio: 0 },
      { artboard: 'B', theme: 'dark', status: 'fail', ratio: 0.02 },
      { artboard: 'C', theme: 'light', status: 'expected-fail', ratio: 0.008 },
      { artboard: 'D', theme: 'light', status: 'fail', error: 'no data-ready' },
    ]);
    expect(s).toMatch(/4 screens/);
    expect(s).toMatch(/1 match, 0 within the warning band, 1 on the allow-list, 1 drifted past the bar, 1 did not render/);
    expect(s).toMatch(/Furthest: B·dark 2\.00%, C·light 0\.80%/);
  });
  it('says so when nothing was recorded', () => expect(summarise([])).toMatch(/no screen was recorded/));
});
