// apps/web/src/lib/components/shell/shell-words.test.ts
import { describe, expect, it } from 'vitest';
import { countWords } from '@superjackfruit/vibekit';
import {
  boardCounts, boardStatus, dateline, filterSummary, firstNameOf, initialsOf, needsPart, operateCount, paperShowingLine,
  projectCountOf, PROJECTS_NOTE, showingLine, statusLine, studioSubRight, userNameOf,
} from './shell-words';
import { DX_CARDS, DX_NEEDS } from './__fixtures__/dx';

const NOW = new Date('2026-10-11T08:21:00Z');
const TZ = 'Asia/Kolkata';

describe('who is signed in', () => {
  it('names, initials and first name', () => {
    expect(userNameOf({ name: 'Rakesh Gangwar', login: 'rakesh' })).toBe('Rakesh Gangwar');
    expect(userNameOf({ login: 'rakesh' })).toBe('rakesh');
    expect(userNameOf(null)).toBe('You');
    expect(initialsOf('Rakesh Gangwar')).toBe('RG');
    expect(initialsOf('ada')).toBe('A');
    expect(firstNameOf('Rakesh Gangwar')).toBe('Rakesh');
  });
});

describe('the dateline and the Studio sub-bar', () => {
  it('reads Sunday 11 October in full daylight at the fixture clock', () => {
    expect(dateline(NOW, 'noon', TZ)).toBe('Sunday 11 October · in full daylight');
    expect(dateline(NOW, 'night', TZ)).toBe('Sunday 11 October · after dark');
  });
  it('says when the board was synced', () => {
    expect(studioSubRight(NOW, 'noon', TZ)).toBe('The board at 13:51 · midday · Sunday 11 October');
    expect(studioSubRight(null, 'noon', TZ)).toBeNull();
  });
});

describe('showing notes', () => {
  it('Developer Experience, Production Releases, Agent Onboarding and a filtered board', () => {
    expect(showingLine(7, 7, false)).toBe('Showing all 7 cards');
    expect(showingLine(0, 0, false)).toBe('No cards on this board');
    expect(showingLine(20, 20, false)).toBe('Showing all 20 cards');
    expect(showingLine(3, 7, true)).toBe('Showing 3 of 7 cards');
    expect(PROJECTS_NOTE).toBe('Projects group cards across boards. Filters don’t apply here.');
  });
  it('Paper adds who waits and what shipped, dropping zeros', () => {
    expect(paperShowingLine('Showing all 7 cards', 4, 1)).toBe('Showing all 7 cards · 4 wait on you · 1 shipped');
    expect(paperShowingLine('No cards on this board', 0, 0)).toBe('No cards on this board');
  });
  it('the filter summary', () => {
    expect(filterSummary(0)).toBe('none on');
    expect(filterSummary(2)).toBe('2 on');
  });
});

describe('the Inbox count', () => {
  it('renders every vibe’s form of 4, and nothing at 0', () => {
    expect(operateCount(4)).toEqual({
      n: '4', comma: ', 4 need you', paren: '(4)', needYou: ' need you', aria: 'Inbox, 4 need you', tip: 'Inbox · 4 need you', quiet: '(4 need you)',
    });
    expect(operateCount(0)).toBeNull();
  });
  it('one card reads "1 needs you" everywhere, as vibekit’s badges say it', () => {
    expect(countWords(1, true)).toBe('1 needs you');
    expect(needsPart(1)).toEqual({ text: '1 needs you', signal: true });
    expect(operateCount(1)).toMatchObject({ comma: ', 1 needs you', needYou: ' needs you', aria: 'Inbox, 1 needs you', tip: 'Inbox · 1 needs you', quiet: '(1 needs you)' });
  });
});

describe('counts and status lines', () => {
  it('Developer Experience counts: 7 live, 4 need you, 2 blocked, 1 shipped, 3 projects', () => {
    expect(boardCounts(DX_CARDS, DX_NEEDS)).toEqual({ all: 7, needs: 4, blocked: 2, shipped: 1 });
    expect(projectCountOf(DX_CARDS)).toBe(3);
  });
  it('the Studio board status', () => {
    expect(boardStatus(boardCounts(DX_CARDS, DX_NEEDS), NOW, TZ)).toEqual({
      items: [{ text: '7 cards' }, { text: '4 need you', signal: true }, { text: '2 blocked' }, { text: '1 shipped' }, { text: 'synced 13:51' }],
      right: ['⌘K commands', 'N new card'],
    });
  });
  it('each page’s status line (notes `pages.md` §1, Operate and the empty board)', () => {
    const synced = { text: 'synced 13:51' };
    const four = { text: '4 need you', signal: true };
    expect(statusLine(['5 projects', '7 cards on this board', needsPart(4)], NOW, { timeZone: TZ }).items).toEqual([{ text: '5 projects' }, { text: '7 cards on this board' }, four, synced]);
    expect(statusLine(['Workspace · Agents', needsPart(4)], NOW, { timeZone: TZ }).items).toEqual([{ text: 'Workspace · Agents' }, four, synced]);
    expect(statusLine(['Board settings · Developer Experience', '7 cards', needsPart(4)], NOW, { timeZone: TZ }).items).toEqual([{ text: 'Board settings · Developer Experience' }, { text: '7 cards' }, four, synced]);
    expect(statusLine(['Spend', needsPart(4)], NOW, { timeZone: TZ }).items).toEqual([{ text: 'Spend' }, four, synced]);
    expect(statusLine(['7 cards', needsPart(4), '0 running', '19 unread'], NOW, { timeZone: TZ }).items).toEqual([{ text: '7 cards' }, four, { text: '0 running' }, { text: '19 unread' }, synced]);
    expect(statusLine(['Production Releases', '0 cards', needsPart(4)], NOW, { right: [], timeZone: TZ })).toEqual({
      items: [{ text: 'Production Releases' }, { text: '0 cards' }, four, synced], right: [],
    });
  });
  it('drops the needs item at 0 and the clock when nothing has synced', () => {
    expect(statusLine(['Spend', needsPart(0)], null).items).toEqual([{ text: 'Spend' }]);
  });
});
