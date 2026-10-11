// @vitest-environment jsdom
/**
 * The parity net for every vibe's gate panel (spec §5.3, §7 D16-D19): whatever a vibe changes about
 * how a gate looks, these are the things a person must still be able to read and do. A panel's own
 * test file imports this before the component, so the api mock below is in place first.
 */
import type { Component } from 'svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';

export const resolveGate = vi.fn();
vi.mock('$lib/api', async (orig) => ({
  ...(await orig<typeof import('$lib/api')>()),
  resolveGate: (...a: unknown[]) => resolveGate(...a),
}));

export const subject = { id: 'sub_1', digest: 'sha256:3f9ac21e77aa', schema: 's', revision: 4, canonical: { post: 'Hello' } };
export const gatePanelProps = (over: Record<string, unknown> = {}): any => ({
  boardId: 'brd_1',
  gate: { id: 'gat_1', cardId: 'c', status: 'pending', options: [], approvalSubject: subject, stageKey: 'review', producedBy: 'agt_r' },
  error: null,
  onResponse: vi.fn(async () => true),
  agent: { id: 'agt_r', name: 'Sample agent', iconUrl: null, mood: 'needs' as const },
  lead: { kind: 'review', needsYou: true, agentId: 'agt_r', sentence: 'Draft ready.', source: 'gate', at: null },
  vibe: 'daylight' as const,
  ...over,
});

export function gatePanelContract(C: Component<any>, o: { decision: 'button' | 'radio'; submit?: string }): void {
  const choose = async (name: string) => {
    await fireEvent.click(screen.getByRole(o.decision, { name }));
    if (o.decision === 'radio') await fireEvent.click(screen.getByRole('button', { name: o.submit! }));
  };
  describe('gate panel contract', () => {
    afterEach(() => cleanup());

    it('shows the heading, the lead, the subject, the seal and the note', () => {
      render(C, gatePanelProps());
      expect(screen.getByText(/awaiting your review/)).toBeTruthy();
      expect(screen.getByText('Draft ready.')).toBeTruthy();
      expect(screen.getByText(/Immutable approval subject · revision 4/)).toBeTruthy();
      expect(screen.getByText('sub_1')).toBeTruthy();
      expect(screen.getByText('sha256:3f9ac21e77aa')).toBeTruthy();
      expect(screen.getByText(/"post": "Hello"/)).toBeTruthy();
      expect(screen.getByText(/Approving exactly this version/)).toBeTruthy();
      expect(screen.getByText(/sealed 3f9a·c21e/)).toBeTruthy();
      const note = screen.getByLabelText('Add a note (optional)');
      expect(note.getAttribute('id')).toBe('gate-note-gat_1');
      expect(note.getAttribute('maxlength')).toBe('8192');
      expect(note.getAttribute('placeholder')).toMatch(/Recorded with your decision/);
      expect(note.getAttribute('aria-invalid')).not.toBe('true');
      expect(screen.getByText('0 / 8192')).toBeTruthy();
    });

    it('keeps a scrolling subject reachable by keyboard', () => {
      render(C, gatePanelProps());
      const region = screen.getByRole('region', { name: /canonical JSON/i });
      expect(region.getAttribute('tabindex')).toBe('0');
      expect(region.textContent).toContain('"post": "Hello"');
    });

    it('offers every option', () => {
      render(C, gatePanelProps());
      for (const n of ['Approve', 'Request changes', 'Reject']) expect(screen.getByRole(o.decision, { name: n })).toBeTruthy();
    });

    it('Request changes with an empty note sends nothing, marks the field invalid and focuses it', async () => {
      resolveGate.mockReset();
      render(C, gatePanelProps());
      await choose('Request changes');
      await tick();
      expect(resolveGate).not.toHaveBeenCalled();
      const field = screen.getByLabelText('Say what needs to change');
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(document.activeElement).toBe(field);
    });

    it('the note travels with the decision', async () => {
      resolveGate.mockReset().mockResolvedValue(new Response('{}', { status: 200 }));
      render(C, gatePanelProps());
      await fireEvent.input(screen.getByLabelText('Add a note (optional)'), { target: { value: 'checked' } });
      expect(screen.getByText('7 / 8192')).toBeTruthy();
      await choose('Approve');
      expect(resolveGate).toHaveBeenCalledWith('brd_1', 'gat_1', 'approve', 'checked', subject);
    });

    it('shows the gate error as an alert', () => {
      render(C, gatePanelProps({ error: 'Gate already decided (409)' }));
      expect(screen.getByRole('alert').textContent).toContain('Gate already decided (409)');
    });

    if (o.decision === 'radio') {
      it('asks for a choice before sending', async () => {
        resolveGate.mockReset();
        render(C, gatePanelProps());
        await fireEvent.click(screen.getByRole('button', { name: o.submit! }));
        expect(screen.getByText('Pick a decision first.')).toBeTruthy();
        expect(resolveGate).not.toHaveBeenCalled();
      });
    }
  });
}
