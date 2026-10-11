// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';

const { store } = vi.hoisted(() => ({
  store: {
    openCard: vi.fn(),
    agents: [{ id: 'agt_r', name: 'Sample agent', iconUrl: null }],
    board: { stages: [{ key: 'b', name: 'Build', order: 0 }], cards: [{ id: 'crd_1', title: 'Launch post', state: 'working', delegateAgentId: 'agt_r', currentStageKey: 'b', costUsd: 0 }] },
  },
}));
vi.mock('$lib/stores/app.svelte', () => ({ app: store }));

import { appearance } from '$lib/appearance.svelte';
import Running from './Running.svelte';

afterEach(cleanup);

describe('Running', () => {
  it.each(['quiet', 'daylight'] as const)('prints the agent’s name once in %s', (vibe) => {
    appearance.set({ vibe });
    const { container } = render(Running);
    expect(container.textContent?.match(/Sample agent/g)).toHaveLength(1);
  });
});
