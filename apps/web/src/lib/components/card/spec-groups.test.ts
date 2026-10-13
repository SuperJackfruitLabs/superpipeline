// apps/web/src/lib/components/card/spec-groups.test.ts
import { describe, expect, it } from 'vitest';
import { firstParagraph, humanizeKey, specGroups, specRowCount } from './spec-groups';
import { SPEC_4605, VISIBLE } from './testing/card-4605';

describe('humanizeKey', () => {
  it('splits camelCase, capitalises the first word only', () => {
    expect(humanizeKey('latestConfirmedGrant')).toBe('Latest confirmed grant');
    expect(humanizeKey('accountsIssues')).toBe('Accounts issues');
    expect(humanizeKey('requiredEvidence')).toBe('Required evidence');
    expect(humanizeKey('routingRule')).toBe('Routing rule');
    expect(humanizeKey('kind')).toBe('Kind');
  });
  it('a card’s own spec.fieldLabels override keys whose label is not mechanical (no names in shipped code)', () => {
    const labels = { messageMelissa: 'Message Melissa' };
    expect(humanizeKey('messageMelissa', labels)).toBe('Message Melissa');
    expect(humanizeKey('messageMelissa')).toBe('Message melissa');
  });
});

describe('firstParagraph', () => {
  it('shows the first paragraph; the rest is behind Show more', () => {
    expect(firstParagraph('One.\n\nTwo.\n\nThree.')).toEqual({ shown: 'One.', more: 'Two.\n\nThree.' });
    expect(firstParagraph('Only one.')).toEqual({ shown: 'Only one.', more: null });
  });
});

describe('specGroups (4605)', () => {
  const groups = specGroups(SPEC_4605, { criteriaHeading: 'Acceptance criteria' });
  it('has the five groups and ten rows, in the card’s own order, and no description/criteria/groups/project rows', () => {
    expect(groups.map((g) => g.label)).toEqual(['What to do', 'Who it is about', 'Background', 'Rules', 'Where work goes']);
    expect(groups.map((g) => g.rows.map((r) => r.label))).toEqual([
      ['Rework', 'Required evidence'], ['Message Melissa', 'Audience Anna'], ['Context', 'Latest confirmed grant'],
      ['Scope', 'Accounts issues'], ['Repository', 'Routing rule'],
    ]);
    expect(specRowCount(groups)).toBe(10);
  });
  it('puts Show more on exactly the five values stored with a continuation', () => {
    const more = groups.flatMap((g) => g.rows).filter((r) => r.value.kind === 'text' && r.value.more !== null).map((r) => r.key);
    expect(more).toEqual(['rework', 'context', 'scope', 'accountsIssues', 'routingRule']);
    const rework = groups[0]!.rows[0]!.value;
    expect(rework).toMatchObject({ kind: 'text', shown: VISIBLE.rework });
    expect(groups[2]!.rows[1]!.value).toEqual({ kind: 'text', shown: VISIBLE.latestConfirmedGrant, more: null });
  });
  it('says where the required evidence is listed, per surface', () => {
    expect(groups[0]!.rows[1]!.value).toEqual({ kind: 'evidence', text: '5 items, listed under Acceptance criteria.' });
    const page = specGroups(SPEC_4605, { criteriaHeading: 'Things to prove' });
    expect(page[0]!.rows[1]!.value).toEqual({ kind: 'evidence', text: '5 items, listed under Things to prove.' });
  });
  it('recognises the matrix-id and repository shapes', () => {
    expect(groups[1]!.rows[0]!.value).toEqual({ kind: 'matrix', matrixId: '@agent_message-melissa:id.agentpod.dev', cardId: 'card_f180b1627c594b41' });
    expect(groups[4]!.rows[0]!.value).toEqual({ kind: 'repo', repo: 'SuperJackfruitLabs/atelier', visibility: 'private', policyUrl: 'https://github.com/SuperJackfruitLabs/atelier/blob/main/AGENTS.md' });
  });
  it('a spec with no groups puts everything under Other details; empty values are dropped', () => {
    expect(specGroups({ description: 'x', role: 'Reviewer', empty: '', nested: { a: 1 } }, { criteriaHeading: 'Acceptance criteria' })).toEqual([
      { label: 'Other details', rows: [
        { key: 'role', label: 'Role', value: { kind: 'text', shown: 'Reviewer', more: null } },
        { key: 'nested', label: 'Nested', value: { kind: 'structured', value: { a: 1 } } },
      ] },
    ]);
    expect(specGroups(null, { criteriaHeading: 'Acceptance criteria' })).toEqual([]);
  });
});
