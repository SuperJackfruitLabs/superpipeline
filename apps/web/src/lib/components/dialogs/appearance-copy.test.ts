// apps/web/src/lib/components/dialogs/appearance-copy.test.ts
import { describe, expect, it } from 'vitest';
import { appearanceReadout } from './appearance-copy';

const at = { phase: 'noon' as const, timeOff: false, firstName: 'Ira', clock: '13:51' };

describe('the Appearance readout (SP-Dlg-Appearance)', () => {
  it('speaks in each vibe’s voice', () => {
    expect(appearanceReadout({ ...at, vibe: 'daylight' })).toBe('Midday · Good afternoon, Ira.');
    expect(appearanceReadout({ ...at, vibe: 'paper' })).toBe('Midday · The light is high and even.');
    expect(appearanceReadout({ ...at, vibe: 'studio' })).toBe('Midday, 13:51');
    expect(appearanceReadout({ ...at, vibe: 'quiet', timeOff: true })).toBe('Time of day is off · Midday.');
  });
  it('writes no prose of its own: a phase with no reference line is the phase alone', () => {
    expect(appearanceReadout({ ...at, vibe: 'paper', phase: 'dusk' })).toBe('Dusk');
    expect(appearanceReadout({ ...at, vibe: 'quiet' })).toBe('Midday');
  });
  it('keeps the greeting’s own mark and drops the name when there is none', () => {
    expect(appearanceReadout({ ...at, vibe: 'daylight', phase: 'night' })).toBe('Night · Working late, Ira?');
    expect(appearanceReadout({ ...at, vibe: 'daylight', firstName: '' })).toBe('Midday · Good afternoon.');
  });
});
