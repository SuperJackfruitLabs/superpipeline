// apps/web/src/lib/components/workspace/dialogs/crew-dialogs.svelte.test.ts
// @vitest-environment jsdom
// New person and New capability: a header button opens a dialog; the lists carry no inline create form.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';

const api = vi.hoisted(() => ({
  getMembers: vi.fn(), addMember: vi.fn(), setMemberRole: vi.fn(), removeMember: vi.fn(),
  getAgents: vi.fn(), getCapabilities: vi.fn(), createCapability: vi.fn(), updateCapability: vi.fn(), deleteCapability: vi.fn(),
  addImplication: vi.fn(), removeImplication: vi.fn(), listAttention: vi.fn(), listLabels: vi.fn(),
}));
vi.mock('$lib/api', () => api);
vi.mock('$lib/stores/app.svelte', () => ({ app: { markBusy: <T,>(p: Promise<T>) => p, boardId: null, board: null, user: { userId: 'usr_ira' } } }));

import PeopleTab from '../PeopleTab.svelte';
import { viewport } from '$lib/viewport.svelte';
import { requestCrewNew } from '../crew-new';
import CapabilitiesTab from '../CapabilitiesTab.svelte';

const ira = { userId: 'usr_ira', name: 'Ira Mehta', email: 'ira@vibes-fixture.invalid', role: 'owner' };
const cap = (key: string) => ({ id: `cap_${key}`, key, name: key, description: null, tags: [], examples: [], origin: 'declared', externalId: null, externalSource: null, inputModes: [], outputModes: [], agentCount: 1, boardCount: 1 });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// The tab's own New button shows where the masthead has none (a phone, Quiet); these tests drive it.
beforeEach(() => {
  viewport.phone = true;
  for (const f of Object.values(api)) f.mockReset();
  api.getMembers.mockResolvedValue([ira]);
  api.getAgents.mockResolvedValue([]);
  api.getCapabilities.mockResolvedValue([cap('code')]);
  api.listAttention.mockResolvedValue({ cards: [], boardsUnanswered: 0 });
  api.listLabels.mockResolvedValue([]);
});
afterEach(() => { cleanup(); viewport.phone = false; });

describe('New person', () => {
  it('has no inline invite form; the dialog adds a person with a name, email and role, then closes', async () => {
    api.addMember.mockResolvedValue(json({ member: {} }, 201));
    render(PeopleTab, { vibe: 'daylight' });
    await screen.findByText('Ira Mehta');
    expect(screen.queryByLabelText('Invite by email'), 'no inline form').toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'New person' }));
    const dialog = await screen.findByRole('dialog', { name: 'New person' });
    await fireEvent.input(within(dialog).getByLabelText('Name (optional)'), { target: { value: 'Dev Rao' } });
    await fireEvent.input(within(dialog).getByLabelText('Email'), { target: { value: 'dev@vibes-fixture.invalid' } });
    await fireEvent.click(within(dialog).getByRole('radio', { name: /Owner/ }));
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Add person' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New person' })).toBeNull());
    expect(api.addMember).toHaveBeenCalledWith('dev@vibes-fixture.invalid', 'owner', 'Dev Rao');
  });
  it('keeps the dialog open with the refusal inline', async () => {
    api.addMember.mockResolvedValue(json({ error: 'already a member of this workspace' }, 409));
    render(PeopleTab, { vibe: 'daylight' });
    await fireEvent.click(await screen.findByRole('button', { name: 'New person' }));
    const dialog = await screen.findByRole('dialog', { name: 'New person' });
    await fireEvent.input(within(dialog).getByLabelText('Email'), { target: { value: 'dev@vibes-fixture.invalid' } });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Add person' }));
    expect((await within(dialog).findByRole('alert')).textContent).toBe('already a member of this workspace');
    expect(screen.getByRole('dialog', { name: 'New person' })).toBeTruthy();
  });
});

describe('New capability', () => {
  it('has no inline add form; the dialog hints at a near name while typing and creates with a description', async () => {
    api.createCapability.mockResolvedValue(json({ capability: cap('cdoe'), similar: ['code'] }, 201));
    render(CapabilitiesTab, { vibe: 'daylight' });
    await screen.findByText('code');
    expect(screen.queryByLabelText('Add a capability'), 'no inline form').toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'New capability' }));
    const dialog = await screen.findByRole('dialog', { name: 'New capability' });
    await fireEvent.input(within(dialog).getByLabelText('Name'), { target: { value: 'cdoe' } });
    expect(within(dialog).getByText(/^Similar to code\./)).toBeTruthy();
    await fireEvent.input(within(dialog).getByLabelText('Description (optional)'), { target: { value: 'Writes code.' } });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Create capability' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New capability' })).toBeNull());
    expect(api.createCapability).toHaveBeenCalledWith({ key: 'cdoe', description: 'Writes code.' });
    expect(screen.getByText(/^Similar to code\./)).toBeTruthy();
  });
});

describe('the Crew masthead opens the tab’s New dialog', () => {
  it('on a desktop the tab draws no New button of its own, and the masthead’s request opens its dialog', async () => {
    viewport.phone = false;
    render(PeopleTab, { props: {} });
    expect(screen.queryByRole('button', { name: 'New person' })).toBeNull();
    requestCrewNew('people');
    expect(await screen.findByRole('dialog', { name: 'New person' })).toBeTruthy();
  });
});
