// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import LeadWords from './LeadWords.svelte';
import { LEAD_FALLBACK } from '$lib/copy';

afterEach(cleanup);

describe('LeadWords', () => {
  it('renders the agent’s own sentence verbatim: its emoji and symbols carry meaning', () => {
    const { container } = render(LeadWords, { lead: { kind: 'review', sentence: 'Tests ✅ 12 ❌ 3 © ® ™ ‼ ↔' }, vibe: 'daylight' });
    expect(container.textContent).toBe('Tests ✅ 12 ❌ 3 © ® ™ ‼ ↔');
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });
  it('hides the emoji of the product’s own fallback, which are decoration', () => {
    const { container } = render(LeadWords, { lead: { kind: 'review', sentence: null }, vibe: 'daylight' });
    expect(container.textContent).toBe(LEAD_FALLBACK.review.daylight);
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe('✨');
  });
});
