// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import WorkspaceHeader from './WorkspaceHeader.svelte';
import { workspaceCounts } from './workspace-counts.svelte';

afterEach(cleanup);

describe('the Workspace tabs', () => {
  it('say the Needs you count is across every board', () => {
    workspaceCounts.value = { needsYou: 5, agents: 4, capabilities: 2, labels: 3, people: 1 };
    render(WorkspaceHeader, { props: { current: 'agents', description: 'x' } });
    expect(screen.getByRole('tab', { name: /Needs you, 5 need you across all boards/ })).toBeTruthy();
  });
});
