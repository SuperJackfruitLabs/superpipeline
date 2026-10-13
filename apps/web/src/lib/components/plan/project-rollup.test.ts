import { describe, it, expect } from 'vitest';
import type { Project, ProjectRollup } from '$lib/api';
import {
  fmtTarget, formatAsOf, groupProjects, HEALTH_LABEL, milestoneDate, milestonesMeta, progressPct, projectsSummary, rollupSegments, STATE_LABEL,
} from './project-rollup';

describe('formatAsOf', () => {
  it('renders a complete rollup as "as of HH:MM", with no incomplete notice', () => {
    const line = formatAsOf({ computedAt: '2026-10-01T14:32:00.000Z', partial: false, boardsUnanswered: 0 });
    expect(line).toMatch(/^as of \d{2}:\d{2}$/);
    expect(line).not.toContain('incomplete');
  });

  it('names the incomplete notice and the exact unanswered count when partial, singular board', () => {
    const line = formatAsOf({ computedAt: '2026-10-01T14:32:00.000Z', partial: true, boardsUnanswered: 1 });
    expect(line).toMatch(/^as of \d{2}:\d{2} · incomplete \(1 board did not answer\)$/);
  });

  it('pluralises "boards" when more than one board failed to answer', () => {
    const line = formatAsOf({ computedAt: '2026-10-01T14:32:00.000Z', partial: true, boardsUnanswered: 2 });
    expect(line).toContain('2 boards did not answer');
    expect(line).not.toContain('2 board ');
  });
});

describe('progressPct', () => {
  it('is 0 for a project with no cards at all — never divides by zero', () => {
    expect(progressPct({ cardsTotal: 0, cardsDone: 0 })).toBe(0);
  });

  it('rounds cardsDone/cardsTotal to the nearest whole percent', () => {
    expect(progressPct({ cardsTotal: 3, cardsDone: 1 })).toBe(33);
  });

  it('never exceeds 100 even if cardsDone somehow outpaces cardsTotal', () => {
    expect(progressPct({ cardsTotal: 2, cardsDone: 5 })).toBe(100);
  });
});

describe('rollupSegments', () => {
  // `ProjectView.svelte` renders every element of this array through one `{#each}` — the point of
  // the function (see its own doc comment). These tests hold the property that actually matters:
  // a provenance segment is always present, carrying `formatAsOf`'s exact text, so a template
  // edit cannot keep the figures while dropping it without visibly filtering the loop.
  const base = { cardsTotal: 5, cardsDone: 3, costUsd: 12.5, cardsOverdue: 0, computedAt: '2026-10-01T14:32:00.000Z', partial: false, boardsUnanswered: 0 };

  it('returns a figure segment each for cards and cost, in that order', () => {
    const figures = rollupSegments(base).filter((s) => s.kind === 'figure');
    expect(figures.map((s) => s.text)).toEqual(['3/5 cards done', '$12.50']);
  });

  it('always returns exactly one provenance segment, carrying formatAsOf\'s exact text, for any input', () => {
    // Not a redundant check of the segment above: this asserts the STRUCTURAL property — that
    // for an arbitrary rollup, including the partial case (where provenance carries the
    // unanswered-board count rather than being omitted), there is always exactly one `provenance`
    // segment and its text always contains exactly what `formatAsOf` would say for that same
    // rollup. That is the property a future edit could only break by editing `rollupSegments`
    // itself, which is exactly the point: there is no template-level degree of freedom left to
    // drop it with.
    const partial = { ...base, partial: true, boardsUnanswered: 2 };
    for (const r of [base, partial]) {
      const provenance = rollupSegments(r).filter((s) => s.kind === 'provenance');
      expect(provenance).toHaveLength(1);
      expect(provenance[0]!.text).toContain(formatAsOf(r));
    }
  });

  it('places the provenance segment last, after both figures', () => {
    expect(rollupSegments(base).map((s) => s.kind)).toEqual(['figure', 'figure', 'provenance']);
  });

  it('folds the overdue count into the provenance segment, not a third figure, only when there is one', () => {
    const noOverdue = rollupSegments(base);
    expect(noOverdue.some((s) => s.text.includes('overdue'))).toBe(false);

    const withOverdue = rollupSegments({ ...base, cardsOverdue: 2 });
    expect(withOverdue).toHaveLength(3); // still cards, cost, provenance — not a fourth segment
    const provenance = withOverdue.find((s) => s.kind === 'provenance')!;
    expect(provenance.text).toContain('2 overdue');
    expect(provenance.text).toContain(formatAsOf(base)); // provenance still present alongside it
  });
});

const P = (id: string, name: string, state: Project['state'], targetDate: string | null = null, health: Project['health'] = null): Project =>
  ({ id, tenantId: 'tnt_vibes', name, description: null, targetDate, state, health, leadUserId: null, createdAt: '2026-09-01T00:00:00Z', updatedAt: null });
const FIXTURE: Project[] = [
  P('prj_34b48f840daa4309', 'Building in public — Marketing & Community flow', 'active'),
  P('prj_23b93f2d16d54b27', 'Guild — Forge workspaces and checkpoint recovery', 'active'),
  P('prj_42ab5ec961104f65', 'Marketing & Community — Melissa and Anna onboarding', 'active'),
  P('prj_fx_sjl_portfolio', 'SJL Active Portfolio', 'completed', '2026-10-05', 'on-track'),
  P('prj_fx_sjl_baseline', 'SJL Operating Baseline', 'completed', '2026-10-09', 'on-track'),
];
const GUILD: ProjectRollup = { projectId: 'prj_23b93f2d16d54b27', cardsTotal: 7, cardsDone: 2, cardsOverdue: 1, costUsd: 1.85, computedAt: '2026-10-11T08:21:00Z', partial: false, boardsUnanswered: 0 };

describe('projects page words', () => {
  it('summarises the fixture as the reference prints it', () => {
    expect(projectsSummary(FIXTURE)).toBe('5 projects · 3 active, 2 completed.');
    expect(projectsSummary([])).toBe('No projects yet.');
    expect(projectsSummary([P('p', 'x', 'planned')])).toBe('1 project · 1 planned.');
  });
  it('groups by state in the fixed order, keeping server order inside a group, and drops empty groups', () => {
    const g = groupProjects(FIXTURE);
    expect(g.map((x) => [x.label, x.id, x.projects.map((p) => p.name)])).toEqual([
      ['Active', 'g-act', ['Building in public — Marketing & Community flow', 'Guild — Forge workspaces and checkpoint recovery', 'Marketing & Community — Melissa and Anna onboarding']],
      ['Completed', 'g-done', ['SJL Active Portfolio', 'SJL Operating Baseline']],
    ]);
  });
  it('prints target and milestone dates in UTC, en-GB', () => {
    expect(fmtTarget('2026-10-05')).toBe('Target 5 Oct 2026');
    expect(fmtTarget('2026-10-09')).toBe('Target 9 Oct 2026');
    expect(fmtTarget(null)).toBe('No target date');
    expect(milestoneDate('2026-10-12')).toBe('12 Oct 2026');
  });
  it('names the milestone count beside the disclosure', () => {
    expect(milestonesMeta(0)).toBe('· none yet');
    expect(milestonesMeta(3)).toBe('· 3');
  });
  it('labels states and health', () => {
    expect(STATE_LABEL.completed).toBe('Completed');
    expect(HEALTH_LABEL['on-track']).toBe('On track');
  });
  it('carries the rollup into segments, in the browser zone the harness uses', () => {
    expect(rollupSegments(GUILD, 'Asia/Kolkata').map((s) => s.text)).toEqual(['2/7 cards done', '$1.85', 'as of 13:51 · 1 overdue']);
    expect(formatAsOf({ ...GUILD, partial: true, boardsUnanswered: 1 }, 'Asia/Kolkata')).toBe('as of 13:51 · incomplete (1 board did not answer)');
    expect([[4, 9], [2, 7], [12, 12], [0, 0]].map(([cardsDone, cardsTotal]) => progressPct({ cardsDone: cardsDone!, cardsTotal: cardsTotal! }))).toEqual([44, 29, 100, 0]);
  });
});
