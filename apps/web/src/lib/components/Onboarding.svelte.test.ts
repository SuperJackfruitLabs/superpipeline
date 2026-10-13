// apps/web/src/lib/components/Onboarding.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import Onboarding from './Onboarding.svelte';

afterEach(cleanup);

describe('Onboarding', () => {
  // The front door draws no shell (routes/+page.svelte), so nothing above it supplies the page's
  // h1: its own title is the one h1. Pages inside the shell use h2 (e2e/headings.spec.ts).
  it('is the page’s one h1, because no shell is drawn above it', () => {
    render(Onboarding);
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Set up the pipeline your agents will work']);
  });
});
