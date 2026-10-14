import { describe, expect, it } from 'vitest';
import { studioFigs } from './phone-words';
import { fmtUsd } from '../studio/studio-prose';

describe('the Studio spend figure while the week is being read (loading-audit L12)', () => {
  it('is a dash, never $0.00, until the spend is in', () => {
    const base = { overBudget: 0, overdue: 0, stages: 4, blocked: 0 };
    expect(studioFigs({ ...base, spend: undefined })[0]!.value).toBe('—');
    expect(studioFigs({ ...base, spend: null })[0]!.value).toBe('—');
    expect(studioFigs({ ...base, spend: 0 })[0]!.value).toBe('$0.00');
    expect(fmtUsd(undefined)).toBe('—');
  });
});
