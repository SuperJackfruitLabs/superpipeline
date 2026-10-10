// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import AgentFace from './AgentFace.svelte';

afterEach(cleanup);

// vibekit's Face names itself "<label>, <mood>" (MOOD_LABEL), so the agent's name leads it.
describe('AgentFace', () => {
  it('mood: a generated face named for the agent', () => {
    const { container } = render(AgentFace, { agentId: 'agt_r', name: 'Sample agent', mood: 'needs', variant: 'mood' });
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('Sample agent, needs you');
  });
  it('mood: a chosen picture overrides the generated face', () => {
    render(AgentFace, { agentId: 'agt_r', name: 'Sample agent', iconUrl: 'https://example.com/a.png', variant: 'mood' });
    expect(screen.getByRole('img', { name: /^Sample agent/ }).getAttribute('src')).toBe('https://example.com/a.png');
  });
  it('portrait: an initial when there is no picture', () => {
    render(AgentFace, { agentId: 'agt_r', name: 'Sample agent', variant: 'portrait' });
    expect(screen.getByRole('img', { name: 'Sample agent' }).textContent).toBe('S');
  });
  it('light: a face plus a status light that blinks only when the agent needs you', () => {
    const { container } = render(AgentFace, { agentId: 'agt_r', name: 'Sample agent', mood: 'needs', variant: 'light' });
    expect(container.querySelector('.status-led')?.getAttribute('data-blink')).toBe('true');
  });
  it('light: the status light is steady when the agent does not need you', () => {
    const { container } = render(AgentFace, { agentId: 'agt_r', name: 'Sample agent', mood: 'working', variant: 'light' });
    expect(container.querySelector('.status-led')?.getAttribute('data-blink')).toBe('false');
  });
  it('name: the name only', () => {
    const { container } = render(AgentFace, { agentId: 'agt_r', name: 'Sample agent', variant: 'name' });
    expect(container.textContent?.trim()).toBe('Sample agent');
    expect(container.querySelector('svg, img')).toBeNull();
  });
  it('an HTML name is text, never markup', () => {
    const { container } = render(AgentFace, { agentId: 'agt_r', name: '<img src=x onerror=alert(1)>', variant: 'portrait' });
    expect(container.querySelector('img')).toBeNull();
  });
});
