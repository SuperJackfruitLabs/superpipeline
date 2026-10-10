// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import Peek from './Peek.svelte';

afterEach(cleanup);
const s = (over: Record<string, unknown> = {}) => ({
  id: 'crd_1', title: 'Launch post', delegate: { id: 'agt_r', name: 'Sample agent', iconUrl: null }, mood: 'needs',
  lead: { kind: 'review', needsYou: true, sentence: 'Ready to ship.' }, gatePending: true, questionFrom: null, attention: { actions: ['review'] }, ...over,
}) as never;

describe('Peek', () => {
  it('is a labelled region with the agent’s sentence and one action', async () => {
    const onOpen = vi.fn();
    render(Peek, { summary: s(), vibe: 'daylight', onOpen });
    expect(screen.getByRole('complementary', { name: 'Peek' })).toBeTruthy();
    expect(screen.getByText('Ready to ship.')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(onOpen).toHaveBeenCalledWith('crd_1');
  });
  it('falls back to the kind’s words when the agent said nothing', () => {
    render(Peek, { summary: s({ lead: { kind: 'stopped', needsYou: true, sentence: null }, gatePending: false }), vibe: 'quiet', onOpen: vi.fn() });
    expect(screen.getByText('Stopped. Waiting for you.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeTruthy();
  });
  it('says so when there is nothing to peek at', () => {
    render(Peek, { summary: null, vibe: 'daylight', onOpen: vi.fn() });
    expect(screen.getByText('Point at a card to see what its agent says.')).toBeTruthy();
  });
});
