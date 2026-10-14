// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import WorkspaceHeader from './WorkspaceHeader.svelte';
import { workspaceCounts } from './workspace-counts.svelte';

afterEach(cleanup);

describe('the Crew tabs', () => {
  it('are Agents, People and Capabilities under /crew: Needs you lives in the Inbox, with no badge here', () => {
    workspaceCounts.value = { agents: 4, capabilities: 2, people: 1 };
    render(WorkspaceHeader, { props: { current: 'agents', description: 'x' } });
    expect(screen.getByRole('heading', { name: 'Crew' })).toBeTruthy();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent?.replace(/\d+/, '').trim())).toEqual(['Agents', 'People', 'Capabilities']);
    expect(tabs.map((t) => t.getAttribute('href'))).toEqual(['/crew/agents', '/crew/people', '/crew/capabilities']);
    expect(screen.queryByText(/need you/)).toBeNull();
  });
});
