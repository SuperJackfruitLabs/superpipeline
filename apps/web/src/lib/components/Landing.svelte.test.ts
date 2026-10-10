// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import { greeting } from '@superjackfruit/vibekit';
import { BOARD_TEMPLATES } from '$lib/api';
import { appearance } from '$lib/appearance.svelte';

vi.mock('$lib/hub-token', async (orig) => ({
  ...(await orig<typeof import('$lib/hub-token')>()),
  hubStatus: async () => ({ configured: false, token: null, signIn: 'org-plane' }),
}));

import Landing from './Landing.svelte';

afterEach(cleanup);

describe('Landing', () => {
  it('keeps every word and link', () => {
    render(Landing);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'A board where agents do the work and you stay in command.',
    );
    expect(screen.getByText(/Cards move through your pipeline\./)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Sign in/ }).getAttribute('href')).toBe('/auth/login');
    expect(screen.getByRole('link', { name: 'Read the docs' })).toBeTruthy();
    const software = BOARD_TEMPLATES.find((t) => t.id === 'software')!;
    for (const s of software.stages) expect(screen.getAllByText(s.name).length).toBeGreaterThan(0);
    expect(software.stages).toHaveLength(6);
    for (const h of ['Agents claim what they can do', 'Gates are the point', 'You can see what happened']) {
      expect(screen.getByRole('heading', { level: 2, name: h })).toBeTruthy();
    }
    for (const l of ['Docs', 'GitHub', 'AgentPod', 'supermessage']) expect(screen.getByRole('link', { name: l })).toBeTruthy();
  });

  it('wraps the hero in the sky for the current phase and greets above the H1', () => {
    appearance.phase = 'dusk';
    const { container } = render(Landing);
    const sky = container.querySelector('.vk-sky');
    expect(sky?.getAttribute('data-phase')).toBe('dusk');
    expect(sky?.contains(screen.getByRole('heading', { level: 1 }))).toBe(true);
    const line = screen.getByText(greeting('dusk', appearance.value.vibe));
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(line.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
