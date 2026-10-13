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
import { expectBusy, type BusyForm } from '../busy-contract';

/** The class a button panel gives its primary action: the Button variant or vibekit's own. */
export const PRIMARY = /\bbg-primary\b|\bvk-button--primary\b/;
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

/** The words a panel prints for the contract's fixture gate; pre-sweep panels use the defaults. */
export interface GateWords {
  heading: RegExp; subjectHeading: RegExp; subjectId: string | null; digest: string | RegExp; canonical: RegExp;
  region: RegExp; noteId: string; errorBeforeControls: boolean; lead?: string | RegExp; noteLabel?: string | RegExp; seal?: [RegExp, RegExp]; count?: (n: number) => string; noPlaceholder?: boolean;
}
export const OLD_GATE_WORDS: GateWords = {
  heading: /awaiting your review/, subjectHeading: /Immutable approval subject · revision 4/, subjectId: 'sub_1',
  digest: 'sha256:3f9ac21e77aa', canonical: /"post": "Hello"/, region: /canonical JSON/i, noteId: 'gate-note-gat_1', errorBeforeControls: true,
};

export function gatePanelContract(C: Component<any>, o: { decision: 'button' | 'radio'; submit?: string; words?: GateWords; busy?: BusyForm }): void {
  const w = o.words ?? OLD_GATE_WORDS;
  const busy = o.busy ?? { kind: 'disabled' };
  const choose = async (name: string) => {
    await fireEvent.click(screen.getByRole(o.decision, { name }));
    if (o.decision === 'radio') await fireEvent.click(screen.getByRole('button', { name: o.submit! }));
  };
  describe('gate panel contract', () => {
    afterEach(() => cleanup());

    it('shows the heading, the lead, the subject, the seal and the note', () => {
      render(C, gatePanelProps());
      expect(screen.getByText(w.heading)).toBeTruthy();
      expect(screen.getByText(w.lead ?? 'Draft ready.')).toBeTruthy();
      expect(screen.getByText(w.subjectHeading)).toBeTruthy();
      if (w.subjectId) expect(screen.getByText(w.subjectId)).toBeTruthy();
      expect(screen.getByText(w.digest)).toBeTruthy();
      expect(screen.getByText(w.canonical)).toBeTruthy();
      expect(screen.getByText(w.seal?.[0] ?? /Approving exactly this version/)).toBeTruthy();
      expect(screen.getByText(w.seal?.[1] ?? /sealed 3f9a·c21e/)).toBeTruthy();
      const note = screen.getByLabelText(w.noteLabel ?? 'Add a note (optional)');
      expect(note.getAttribute('id')).toBe(w.noteId);
      expect(note.getAttribute('maxlength')).toBe('8192');
      if (!w.noPlaceholder) expect(note.getAttribute('placeholder')).toMatch(/Recorded with your decision/);
      expect(note.getAttribute('aria-invalid')).not.toBe('true');
      expect(screen.getByText((w.count ?? ((n) => `${n} / 8192`))(0))).toBeTruthy();
    });

    it('keeps a scrolling subject reachable by keyboard', () => {
      render(C, gatePanelProps());
      const region = screen.getByRole('region', { name: w.region });
      expect(region.getAttribute('tabindex')).toBe('0');
      expect(region.textContent).toMatch(w.canonical);
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
      await fireEvent.input(screen.getByLabelText(w.noteLabel ?? 'Add a note (optional)'), { target: { value: 'checked' } });
      expect(screen.getByText((w.count ?? ((n) => `${n} / 8192`))(7))).toBeTruthy();
      await choose('Approve');
      expect(resolveGate).toHaveBeenCalledWith('brd_1', 'gat_1', 'approve', 'checked', subject);
    });

    it('holds the decision controls while a decision is in flight', async () => {
      let settle!: (r: Response) => void;
      resolveGate.mockReset().mockReturnValue(new Promise<Response>((r) => (settle = r)));
      render(C, gatePanelProps());
      await choose('Approve');
      await tick();
      const labels = o.decision === 'button' ? ['Approve', 'Request changes', 'Reject'] : [o.submit!];
      const controls = labels.map((n) => screen.getByRole('button', { name: n }));
      try {
        expectBusy(controls, busy, labels);
        if (busy.kind === 'aria') {
          await fireEvent.click(controls[controls.length - 1]);
          expect(resolveGate, 'a click on a busy control is ignored').toHaveBeenCalledTimes(1);
        }
      } finally { settle(new Response('{}', { status: 200 })); }
      await tick();
    });

    if (o.decision === 'button') {
      it('gives Approve the primary style', () => {
        render(C, gatePanelProps());
        expect(screen.getByRole('button', { name: 'Approve' }).className).toMatch(PRIMARY);
      });
    }

    it('shows the gate error as an alert', () => {
      render(C, gatePanelProps({ error: 'Gate already decided (409)' }));
      expect(screen.getByRole('alert').textContent).toContain('Gate already decided (409)');
    });

    it('puts the gate error beside the controls', () => {
      render(C, gatePanelProps({ error: 'Gate already decided (409)' }));
      const alert = screen.getByRole('alert');
      const follows = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      expect(follows(screen.getByRole('region', { name: w.region }), alert)).toBe(true);
      const controls = o.decision === 'button' ? screen.getAllByRole('button').filter((b) => /Approve|Request changes|Reject/.test(b.textContent ?? '')) : [screen.getByRole('button', { name: o.submit! })];
      if (w.errorBeforeControls) expect(follows(alert, controls[0]!)).toBe(true);
      else expect(follows(controls.at(-1)!, alert), 'Daylight puts it under the buttons (Card-States E)').toBe(true);
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
