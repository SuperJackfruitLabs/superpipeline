// @vitest-environment jsdom
/**
 * The card's one composition (CardView, composition contract §7 "Card", §11.3) on card 4605, in every
 * vibe and on every surface: the same accessibility tree outside the one signature slot, the blocks in
 * order, every old section reachable once in the block §11.3 folds it into, the decision, question and
 * resume panels opening in place of the sentence, facts in words, the criteria as a checklist, the
 * history and raw data behind closed disclosures, and the loading, slow and failed states (rule 11).
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { flushSync, tick } from 'svelte';
import { VIBES } from '@superjackfruitlabs/vibekit-ui';
import { parityTree, primaryActionsPerRow, rawMachineText, repeatedParagraphs } from '$lib/composition/guards';
import { renderInVibes } from '$lib/composition/render-vibes';
import type { Gate } from '$lib/api';
import { fakeApi, fakeApp } from './testing/fakes';
import { mountModel } from './testing/mount-model.svelte';
import { ACTIVITIES_4605, BOARD_DX, CARD_4605 } from './testing/card-4605';
import { CARD_BLOCKS, CARD_SECTION_KEYS, FOLDED } from './sections';
import type { CardModel } from './card-model.svelte';
import CardView from './CardView.svelte';

vi.mock('$lib/stores/app.svelte', async () => ({ app: (await import('./testing/fakes')).fakeApp }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...(await import('./testing/fakes')).fakeApi }));
vi.mock('$lib/superlibrary', async (orig) => ({ ...(await orig<typeof import('$lib/superlibrary')>()), relatedForCard: vi.fn(async () => []) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
beforeAll(() => {
  window.matchMedia ??= vi.fn().mockImplementation((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
});

const NOW = new Date('2026-10-11T08:21:00.000Z');
const BOARD = fakeApp.board;
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW); });
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  fakeApp.board = BOARD;
  fakeApp.labelById = () => new Map();
  fakeApi.getCardActivities.mockImplementation(async () => ({ activities: ACTIVITIES_4605, handoff: null, gates: [] }) as never);
  fakeApi.getComments.mockImplementation(async () => []);
});

const GATE: Gate = {
  id: 'gat_4605', cardId: CARD_4605.id, stageKey: 'reproduce', status: 'pending', options: [], producedBy: 'agt_fx_error_eric', summary: 'Diagnosis ready.',
  references: [{ id: 'ref_lib_1', cardId: CARD_4605.id, url: 'https://app.superlibrary.dev/a/itm_1111111111111111', title: 'Diagnosis report', provider: 'superlibrary', sourceType: 'artifact', metadata: { version: 2 }, addedBy: 'agent' }],
  approvalSubject: { id: 'sub_1', digest: 'sha256:3f9ac21e77aa', schema: 's', revision: 4, canonical: { post: 'Hello' } },
} as Gate;
function withGate(): void {
  fakeApp.board = { ...BOARD_DX, gates: [GATE] };
  fakeApi.getCardActivities.mockImplementation(async () => ({ activities: ACTIVITIES_4605, handoff: null, gates: [GATE] }) as never);
}

type Surface = 'drawer' | 'phone' | 'page';
async function loaded(surface: Surface = 'drawer'): Promise<{ model: CardModel; dispose: () => void }> {
  const m = mountModel({ surface: surface === 'phone' ? 'drawer' : surface });
  await vi.waitFor(() => expect(m.model.detailLoaded).toBe(true));
  return m;
}
const props = (model: CardModel, surface: Surface) => ({ model, surface, gate: model.gateBinding, question: model.questionBinding, pageHref: model.pageHref, boardHref: model.boardHref, onClose: vi.fn() });
const state = () => document.querySelector<HTMLElement>('[data-block="state"]')!;
const cell = (k: string) => document.querySelector(`[data-cell="${k}"]`);

describe('the card in every vibe, on every surface', () => {
  for (const surface of ['drawer', 'phone', 'page'] as const) {
    it(`${surface}: the same accessibility tree in all four vibes outside the signature slot, and the guards pass`, async () => {
      const { model, dispose } = await loaded(surface);
      const roots = await renderInVibes(CardView, props(model, surface));
      try {
        const trees = Object.fromEntries(VIBES.map((v) => [v, parityTree(roots[v])]));
        for (const v of VIBES) expect(trees[v], `${v} against daylight`).toBe(trees.daylight);
        const report = VIBES.map((v) => ({
          v,
          blocks: [...roots[v].querySelectorAll('[data-block]')].map((b) => b.getAttribute('data-block')),
          signatures: roots[v].querySelectorAll('[data-signature]').length,
          words: roots[v].querySelector('[data-signature]')?.textContent ?? null,
          rows: primaryActionsPerRow(roots[v]),
          raw: rawMachineText(roots[v]),
          repeated: repeatedParagraphs(roots[v]),
        }));
        expect(report).toEqual(VIBES.map((v) => ({ v, blocks: [...CARD_BLOCKS], signatures: 1, words: '', rows: [], raw: [], repeated: [] })));
      } finally {
        roots.unmount();
        dispose();
      }
    });
  }

  it('the decision panel, open, is the same in every vibe too, with one primary', async () => {
    withGate();
    const { model, dispose } = await loaded();
    const roots = await renderInVibes(CardView, { ...props(model, 'drawer'), opened: 'gate' as const });
    try {
      const trees = Object.fromEntries(VIBES.map((v) => [v, parityTree(roots[v])]));
      for (const v of VIBES) expect(trees[v], `${v} against daylight`).toBe(trees.daylight);
      for (const v of VIBES) {
        expect(roots[v].querySelector('form[data-row="gate"]'), v).toBeTruthy();
        expect(primaryActionsPerRow(roots[v]), v).toEqual([]);
        expect(rawMachineText(roots[v]), v).toEqual([]);
      }
    } finally {
      roots.unmount();
      dispose();
    }
  });

  it('the page titles the card with an h1 and closes to the board; the drawer with an h2 and Close (Esc)', async () => {
    const { model, dispose } = await loaded('page');
    render(CardView, props(model, 'page'));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(CARD_4605.title);
    expect(screen.getByRole('link', { name: 'Close' }).getAttribute('href')).toBe(model.boardHref);
    expect(screen.queryByRole('link', { name: 'Open in new window' })).toBeNull();
    cleanup();
    render(CardView, props(model, 'drawer'));
    expect(screen.getByRole('heading', { level: 2, name: CARD_4605.title }).id).toBe('drawer-title');
    expect(screen.getByRole('button', { name: 'Close (Esc)' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open in new window' }).getAttribute('href')).toBe(model.pageHref);
    dispose();
  });
});

describe('the sections', () => {
  it('every old section key is reachable in one block', async () => {
    const { model, dispose } = await loaded();
    render(CardView, props(model, 'drawer'));
    const check = (keys: readonly string[]) => {
      for (const k of keys) {
        const els = document.querySelectorAll(`[data-section="${k}"]`);
        expect(els.length, `${k} drawn once`).toBe(1);
        expect(els[0]!.closest('[data-block]')?.getAttribute('data-block'), `${k} in its block`).toBe(FOLDED[k as keyof typeof FOLDED]);
      }
    };
    check(CARD_SECTION_KEYS.filter((k) => k !== 'editForm'));
    for (const b of CARD_BLOCKS) expect(document.querySelectorAll(`[data-block="${b}"]`).length, b).toBe(1);
    // The edit form opens in the head, in its own block, and nothing else moves.
    model.edit.start();
    flushSync();
    check(CARD_SECTION_KEYS);
    expect(screen.getByRole('button', { name: 'Edit card' }).getAttribute('aria-pressed')).toBe('true');
    dispose();
  });
  it('FOLDED names a block for every key, and no key is folded into a block that does not exist', () => {
    expect(Object.keys(FOLDED).sort()).toEqual([...CARD_SECTION_KEYS].sort());
    for (const b of Object.values(FOLDED)) expect(CARD_BLOCKS).toContain(b);
  });
});

describe('the state block', () => {
  it('says where the card is, for how long, who did what last, with Resume beside Move', async () => {
    const { model, dispose } = await loaded();
    render(CardView, props(model, 'drawer'));
    expect(within(state()).getByText(/^error-eric stopped in Reproduce after attempt 2: No fresh DM event to trace; needs one per agent\. It will read your note before it tries again\.$/)).toBeTruthy();
    const buttons = [...state().querySelectorAll('.cv-act .vk-button')].map((b) => [b.textContent!.trim(), b.className.includes('vk-button--primary')]);
    expect(buttons).toEqual([['Resume', true], ['Move', false]]);
    dispose();
  });

  it('review opens the decision panel in place of the state sentence', async () => {
    withGate();
    const { model, dispose } = await loaded();
    render(CardView, props(model, 'drawer'));
    const sentence = within(state()).getByText(/^Waiting for your review in Reproduce for 2 days\. error-eric finished attempt 2 and produced one document\.$/);
    expect(sentence).toBeTruthy();
    await fireEvent.click(within(state()).getByRole('button', { name: 'Review' }));
    await tick();
    expect(state().contains(sentence)).toBe(false);
    const panel = state().querySelector('form[data-row="gate"]')!;
    expect(panel, 'the panel is inside the state block').toBeTruthy();
    expect(panel.textContent).toContain('error-eric asks you to approve attempt 2.');
    expect(within(state()).getByRole('radio', { name: /^Approve/ })).toHaveProperty('checked', true);
    expect(within(state()).getByRole('radio', { name: /^Request changes/ })).toBeTruthy();
    expect(within(state()).getByRole('radio', { name: /^Reject/ })).toBeTruthy();
    expect(document.activeElement, 'focus moves into the panel').toBe(within(state()).getByRole('radio', { name: /^Approve/ }));
    // The primary is named after the picked decision.
    expect(within(state()).getByRole('button', { name: 'Approve' }).className).toContain('vk-button--primary');
    await fireEvent.click(within(state()).getByRole('radio', { name: /^Request changes/ }));
    expect(within(state()).getByRole('button', { name: 'Request changes' })).toBeTruthy();
    // What you sign is behind a closed disclosure, keyboard reachable.
    const signing = within(state()).getByText('What you are signing').closest('details')!;
    expect(signing.open).toBe(false);
    expect(within(signing).getByRole('region', { name: 'The approval subject', hidden: true }).getAttribute('tabindex')).toBe('0');
    // The produced document is listed once, with Open.
    expect(screen.getByRole('link', { name: 'Open Diagnosis report' }).getAttribute('href')).toBe('https://app.superlibrary.dev/a/itm_1111111111111111/v/2');
    dispose();
  });

  it('Request changes with no note sends nothing and asks for one; Approve sends the note', async () => {
    withGate();
    fakeApi.resolveGate.mockClear();
    const { model, dispose } = await loaded();
    render(CardView, { ...props(model, 'drawer'), opened: 'gate' });
    await fireEvent.click(within(state()).getByRole('radio', { name: /^Request changes/ }));
    await fireEvent.click(within(state()).getByRole('button', { name: 'Request changes' }));
    await tick();
    expect(fakeApi.resolveGate).not.toHaveBeenCalled();
    const note = within(state()).getByLabelText('Say what needs to change');
    expect(note.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(note);
    await fireEvent.click(within(state()).getByRole('radio', { name: /^Approve/ }));
    await fireEvent.input(note, { target: { value: 'checked the diff' } });
    await fireEvent.click(within(state()).getByRole('button', { name: 'Approve' }));
    await vi.waitFor(() => expect(fakeApi.resolveGate).toHaveBeenCalledWith(BOARD_DX.boardId, 'gat_4605', 'approve', 'checked the diff', GATE.approvalSubject));
    dispose();
  });

  it('Answer opens the question panel in place of the sentence', async () => {
    fakeApp.board = { ...BOARD_DX, elicitations: [{ id: 'eli_1', cardId: CARD_4605.id, agentId: 'agt_fx_error_eric', question: 'Which repos first?', signal: 'question', status: 'pending', options: [{ name: 'forge', title: 'Forge-primary first' }, { name: 'gh', title: 'GitHub-primary first' }], createdAt: '2026-10-11T07:00:00Z' } as never] };
    fakeApi.answerElicitation.mockClear();
    const { model, dispose } = await loaded();
    render(CardView, props(model, 'drawer'));
    expect(within(state()).getByText(/^Waiting for your answer in Reproduce/)).toBeTruthy();
    await fireEvent.click(within(state()).getByRole('button', { name: 'Answer' }));
    await tick();
    expect(within(state()).getByText('Which repos first?', { exact: false })).toBeTruthy();
    await fireEvent.click(within(state()).getByRole('radio', { name: /^GitHub-primary first/ }));
    await fireEvent.input(within(state()).getByLabelText('Or answer in your own words'), { target: { value: 'because' } });
    await fireEvent.click(within(state()).getByRole('button', { name: 'Answer' }));
    await vi.waitFor(() => expect(fakeApi.answerElicitation).toHaveBeenCalledWith(BOARD_DX.boardId, 'eli_1', { option: 'gh', text: 'because' }));
    dispose();
  });

  it('Resume opens the note in place of the sentence; an empty note names the agent and sends nothing', async () => {
    fakeApi.resumeCard.mockClear();
    const { model, dispose } = await loaded();
    render(CardView, props(model, 'drawer'));
    await fireEvent.click(within(state()).getByRole('button', { name: 'Resume' }));
    await tick();
    const note = within(state()).getByLabelText('Note for the next attempt');
    expect(document.activeElement === note || document.activeElement?.tagName === 'SELECT').toBe(true);
    expect(state().querySelector('[data-section="resume"]')!.tagName).toBe('FORM');
    await fireEvent.click(within(state()).getByRole('button', { name: 'Resume' }));
    expect(fakeApi.resumeCard).not.toHaveBeenCalled();
    expect(state().textContent).toContain('Add a note for error-eric first.');
    dispose();
  });

  it('an archived card says so with Restore as the only verb; a done card has Move alone', async () => {
    fakeApp.board = { ...BOARD_DX, cards: [{ ...CARD_4605, archivedAt: '2026-10-02T10:00:00Z' }] };
    let mounted = await loaded();
    render(CardView, props(mounted.model, 'drawer'));
    expect(within(state()).getByText(/^Archived on 2 October\. Agents cannot claim it and it leaves the board\. Restore it to bring it back to Reproduce\.$/)).toBeTruthy();
    expect([...state().querySelectorAll('.cv-act .vk-button')].map((b) => b.textContent!.trim())).toEqual(['Restore']);
    mounted.dispose();
    cleanup();
    fakeApp.board = { ...BOARD_DX, cards: [{ ...CARD_4605, state: 'completed', needsHuman: undefined, stateSince: '2026-10-09T10:00:00Z' } as never] };
    mounted = await loaded();
    render(CardView, props(mounted.model, 'drawer'));
    expect(within(state()).getByText(/^Shipped by error-eric on 9 October\. Nothing to do\.$/)).toBeTruthy();
    expect([...state().querySelectorAll('.cv-act .vk-button')].map((b) => b.textContent!.trim())).toEqual(['Move']);
    mounted.dispose();
  });

  it('Archive and Delete are quiet, never the primary', async () => {
    const { model, dispose } = await loaded();
    render(CardView, props(model, 'drawer'));
    for (const name of ['Archive card', 'Delete card']) {
      const b = screen.getByRole('button', { name });
      expect(b.className, name).toContain('vk-button--quiet');
      expect(b.closest('[data-section="cardActions"]')).toBeTruthy();
    }
    dispose();
  });
});

describe('loading, slow and failed (rule 11)', () => {
  it('while the log is on its way, the head and track draw and the state block waits; from 8 s it says the server is slow', async () => {
    vi.useRealTimers();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const { model, dispose } = mountModel({ holdDetail: true });
    render(CardView, props(model, 'drawer'));
    expect([...document.querySelectorAll('[data-block]')].map((b) => b.getAttribute('data-block'))).toEqual(['head', 'track', 'state']);
    expect(state().getAttribute('aria-busy')).toBe('true');
    expect(document.body.textContent).not.toMatch(/No comments yet|\$0\.00|none yet/);
    await vi.advanceTimersByTimeAsync(8_100);
    expect(state().textContent).toMatch(/slow/i);
    expect(within(state()).getByRole('button', { name: 'Try again' })).toBeTruthy();
    dispose();
  });
  it('a failed read keeps the head and track, says what happened and offers Try again, which reads again', async () => {
    fakeApi.getCardActivities.mockRejectedValueOnce(new Error('500'));
    const { model, dispose } = mountModel();
    await vi.waitFor(() => expect(model.detailFailed).toBe(true));
    render(CardView, props(model, 'drawer'));
    expect(within(state()).getByRole('alert').textContent).toContain('Could not load the card.');
    expect(screen.getByRole('heading', { name: CARD_4605.title })).toBeTruthy();
    await fireEvent.click(within(state()).getByRole('button', { name: 'Try again' }));
    await vi.waitFor(() => expect(model.detailLoaded).toBe(true));
    expect(state().querySelector('[role="alert"]')).toBeNull();
    dispose();
  });
});

describe('facts, the brief and what was produced', () => {
  it('facts show label names, never ids', async () => {
    fakeApp.board = { ...BOARD_DX, cards: [{ ...CARD_4605, labels: ['lbl_estate', 'lbl_gone'] }] };
    fakeApp.labelById = () => new Map([['lbl_estate', { name: 'estate', colour: '' }]]);
    const { model, dispose } = await loaded();
    render(CardView, props(model, 'drawer'));
    const facts = document.querySelector('[data-block="facts"]')!;
    const labels = [...facts.querySelectorAll('dt')].find((d) => d.textContent === 'Labels')!.nextElementSibling!;
    expect(labels.textContent).toBe('estate, a removed label');
    expect(facts.textContent).not.toMatch(/\b(lbl|usr|agt|prn|prj)_/);
    expect([...facts.querySelectorAll('dt')].map((d) => d.textContent)).toEqual(['Owner', 'Priority', 'Labels', 'Due', 'Attempt', 'Asked by', 'Project', 'Sub-tasks', 'Links', 'References']);
    expect(facts.textContent).toContain('Rakesh Gangwar');
    dispose();
  });

  it('acceptance criteria render as a checklist, not JSON', async () => {
    const { model, dispose } = await loaded();
    render(CardView, props(model, 'drawer'));
    const list = screen.getByRole('list', { name: 'Acceptance criteria' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items[0]!.textContent).toMatch(/^AC-01Trace user DM ingress/);
    expect(list.textContent).not.toMatch(/[[\]{}"]/);
    expect(list.closest('[data-block]')!.getAttribute('data-block')).toBe('produced');
    dispose();
  });

  it('the brief is open: the description and the spec as labelled groups', async () => {
    const { model, dispose } = await loaded();
    render(CardView, props(model, 'drawer'));
    const brief = document.querySelector<HTMLElement>('[data-block="brief"]')!;
    expect(brief.closest('details')).toBeNull();
    expect(brief.textContent).toContain('Reproduce and localize why');
    expect(within(brief).getByTestId('spec-value-scope').textContent).toContain('Diagnosis and repair proposal only.');
    dispose();
  });

  it('an empty card draws no placeholder for a block with nothing to show', async () => {
    fakeApp.board = { ...BOARD_DX, cards: [{ ...CARD_4605, spec: {} }], references: [] };
    const { model, dispose } = await loaded();
    render(CardView, props(model, 'drawer'));
    for (const b of ['brief', 'produced']) expect(document.querySelector<HTMLElement>(`[data-block="${b}"]`)!.hidden, b).toBe(true);
    for (const k of ['plan', 'decisions', 'delivery']) expect(document.querySelector<HTMLElement>(`[data-section="${k}"]`)!.hidden, k).toBe(true);
    // Sections that offer an action stay: the comment box, Add link, Add a sub-task, Attach a link.
    for (const name of ['Add link', 'Add a sub-task', 'Attach a link']) expect(screen.getByRole('button', { name })).toBeTruthy();
    expect(screen.getByLabelText('Add a comment', { selector: 'textarea' })).toBeTruthy();
    dispose();
  });
});

describe('history and raw data', () => {
  it('history and raw data are closed disclosures with counts', async () => {
    const { model, dispose } = await loaded();
    render(CardView, props(model, 'drawer'));
    const history = document.querySelector('[data-block="history"] details') as HTMLDetailsElement;
    const raw = document.querySelector('[data-block="raw"] details') as HTMLDetailsElement;
    expect(history.open).toBe(false);
    expect(raw.open).toBe(false);
    // 9 + 14 events, no decisions, no comments; the last event was at 14:11 on 8 October.
    expect(history.querySelector('summary')!.textContent).toMatch(/^Conversation and history\s*23 entries · last 2 days ago/);
    expect(raw.querySelector('summary')!.textContent).toMatch(/^Raw data\s*JSON/);
    expect(raw.querySelector('[data-testid="raw-json"]')!.textContent).toContain('"description"');
    // Machine detail lives inside the disclosure and nowhere else.
    expect(raw.textContent).toContain(CARD_4605.id);
    dispose();
  });

  it('every attempt expands, shows its own timeline and toggles its own tool calls', async () => {
    const acts = ACTIVITIES_4605.map((a) => (a.runId === 'run_fx_4605_1' && a.seq === 2 ? { ...a, parameter: { path: 'apps/hub/src/inbound.ts' }, result: { lines: 408 } } : a));
    fakeApi.getCardActivities.mockImplementation(async () => ({ activities: acts, handoff: null, gates: [] }) as never);
    const { model, dispose } = await loaded();
    render(CardView, props(model, 'drawer'));
    const head = (run: string) => document.querySelector<HTMLButtonElement>(`button[data-attempt-head="${run}"]`)!;
    const body = (run: string) => document.getElementById(head(run).getAttribute('aria-controls') ?? '');
    const toggle = (run: string) => document.querySelector<HTMLButtonElement>(`button[data-attempt-tools="${run}"]`)!;
    expect(head('run_fx_4605_2').getAttribute('aria-expanded'), 'the newest attempt opens').toBe('true');
    expect(head('run_fx_4605_1').getAttribute('aria-expanded')).toBe('false');
    await fireEvent.click(head('run_fx_4605_1'));
    expect(body('run_fx_4605_1')!.textContent).toContain('The board refused completion');
    expect(body('run_fx_4605_1')!.textContent).not.toContain('Tool call 1');
    await fireEvent.click(toggle('run_fx_4605_1'));
    expect(toggle('run_fx_4605_1').getAttribute('aria-pressed')).toBe('true');
    expect(body('run_fx_4605_1')!.textContent).toContain('Tool call 1');
    expect(toggle('run_fx_4605_2').textContent!.trim(), 'the toggle is per attempt').toBe('Show tool calls');
    dispose();
  });

  it('names comment authors from the roster, never an id', async () => {
    const at = '2026-10-10T08:00:00.000Z';
    const comment = (id: string, author: { kind: 'human' | 'agent'; id: string; name: string | null }, body: string) => ({ id, cardId: CARD_4605.id, author, body, createdAt: at, editedAt: null, deletedAt: null });
    fakeApi.getComments.mockImplementation(async () => [
      comment('cmt_1', { kind: 'agent', id: 'agt_fx_error_eric', name: null }, 'From a known agent.'),
      comment('cmt_2', { kind: 'agent', id: 'agt_738c00000000aaaa', name: null }, 'From an agent nobody can name.'),
      comment('cmt_3', { kind: 'human', id: 'usr_b19776fac3c94df4', name: null }, 'From a member.'),
    ] as never);
    const { model, dispose } = await loaded();
    render(CardView, props(model, 'drawer'));
    await vi.waitFor(() => expect(document.body.textContent).toContain('From a known agent.'));
    const text = document.querySelector('[data-section="comments"]')!.textContent!;
    expect(text).not.toMatch(/agt_|usr_/);
    expect(text).toMatch(/error-eric: From a known agent\./);
    expect(text).toMatch(/An agent: From an agent nobody can name\./);
    expect(text).toMatch(/Rakesh Gangwar: From a member\./);
    dispose();
  });

  it('an agent the board does not list reads "an agent", never an id', async () => {
    const stranger = { ...CARD_4605, queuedByAgentId: 'agt_1111eeee1111eeee', queuedBy: 'prn_unknown_x' };
    const { model, dispose } = mountModel({ surface: 'gallery', holdDetail: true, source: { board: { ...BOARD_DX, cards: [stranger] }, agents: fakeApp.agents } });
    render(CardView, { ...props(model, 'drawer'), surface: 'gallery' });
    expect(document.body.textContent).not.toMatch(/\b(?:agt|prn)_/);
    dispose();
  });
});

describe('a half-typed resume note', () => {
  it('opens the resume panel again with the note, once', async () => {
    sessionStorage.setItem(`sp:draft:resume:${CARD_4605.id}`, 'Half a thought');
    try {
      const { model, dispose } = await loaded();
      render(CardView, props(model, 'drawer'));
      await tick();
      expect(within(state()).getByLabelText('Note for the next attempt')).toHaveProperty('value', 'Half a thought');
      dispose();
    } finally {
      sessionStorage.removeItem(`sp:draft:resume:${CARD_4605.id}`);
    }
  });
});

describe('the card-states gallery', () => {
  it('draws CardView once per approved state, in the approved order', async () => {
    const { default: Gallery, GALLERY_KEYS } = await import('./CardStatesGallery.svelte');
    const boardId = BOARD_DX.boardId ?? '';
    const spec = { boardId, cardId: CARD_4605.id };
    const specs = { gate: spec, question: spec, stopped: { ...spec, opened: 'resume' as const }, done: spec, archived: spec, loading: { ...spec, holdDetail: true }, error: { ...spec, failDetail: true } };
    render(Gallery, { specs, sources: { [boardId]: { board: BOARD_DX, agents: fakeApp.agents } } });
    const cells = [...document.querySelectorAll<HTMLElement>('[data-cell]')];
    expect(cells.map((c) => c.dataset.cell)).toEqual([...GALLERY_KEYS]);
    expect(cells.map((c) => c.querySelectorAll('.cv').length)).toEqual(GALLERY_KEYS.map(() => 1));
    expect(cell('error')?.querySelector('[role="alert"]')?.textContent).toContain('Could not load the card.');
    expect(cell('loading')?.querySelector('[data-block="state"]')?.getAttribute('aria-busy')).toBe('true');
    await vi.waitFor(() => expect(cell('stopped')?.querySelector('form[data-row="resume"]')).toBeTruthy());
  });
});
