// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/svelte';
import GateReferences from './GateReferences.svelte';
import type { Reference } from '$lib/api';

const reference = (over: Partial<Reference>): Reference => ({
  id: 'ref_1',
  cardId: 'card_1',
  url: 'https://example.test/work',
  title: 'Work',
  provider: 'forge',
  sourceType: 'commit',
  addedBy: 'agent',
  ...over,
});

afterEach(cleanup);

describe('GateReferences', () => {
  it('shows one linked row per reference and pins known SuperLibrary versions', () => {
    render(GateReferences, {
      references: [
        reference({
          id: 'ref_pinned',
          provider: 'superlibrary',
          title: 'Pinned spec',
          url: 'https://app.superlibrary.dev/a/itm_1111111111111111/v/7',
        }),
        reference({
          id: 'ref_metadata',
          provider: 'superlibrary',
          title: 'Current brief',
          url: 'https://app.superlibrary.dev/a/itm_2222222222222222',
          metadata: { version: 3 },
        }),
        reference({ id: 'ref_commit', title: 'Code change' }),
      ],
    });

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    const row = (index: number): HTMLElement => {
      const value = rows[index];
      if (!value) throw new Error(`missing reference row ${index}`);
      return value;
    };
    const pinned = row(0);
    const metadata = row(1);
    const commit = row(2);
    expect(within(pinned).getByRole('link', { name: 'Pinned spec' }).getAttribute('href')).toBe(
      'https://app.superlibrary.dev/a/itm_1111111111111111/v/7',
    );
    expect(pinned.textContent).toContain('version 7');
    expect(within(metadata).getByRole('link', { name: 'Current brief' }).getAttribute('href')).toBe(
      'https://app.superlibrary.dev/a/itm_2222222222222222/v/3',
    );
    expect(metadata.textContent).toContain('version 3');
    expect(commit.textContent).not.toContain('version');
  });

  it('says plainly when the opening run linked nothing', () => {
    render(GateReferences, { references: [] });
    expect(screen.getByText('This run linked no artifact')).toBeTruthy();
  });
});
