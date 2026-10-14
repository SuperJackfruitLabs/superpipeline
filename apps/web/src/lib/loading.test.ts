import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError, PendingClock, connectionOf, countOrDash, failKind, liveView, outcomeOf, statusOf,
  SKELETON_DELAY_MS, SKELETON_MIN_MS, SLOW_MS, type PendingState,
} from './loading';

describe('outcomeOf', () => {
  it('is loading until the read answered, and never empty before that', () => {
    expect(outcomeOf({ loaded: false, failed: false, count: 0 })).toBe('loading');
  });
  it('is empty only after a read that worked returned nothing', () => {
    expect(outcomeOf({ loaded: true, failed: false, count: 0 })).toBe('empty');
    expect(outcomeOf({ loaded: true, failed: false, count: 2 })).toBe('ready');
  });
  it('is failed, not empty, when the read failed', () => {
    expect(outcomeOf({ loaded: true, failed: true, count: 0 })).toBe('failed');
    expect(outcomeOf({ loaded: false, failed: true, count: 0 })).toBe('failed');
  });
});

describe('failKind', () => {
  it('tells "not there for you" (404/403) from "could not load" (5xx, network)', () => {
    expect(failKind(new ApiError('getBoard', 404))).toBe('missing');
    expect(failKind(new ApiError('getBoard', 403))).toBe('missing');
    expect(failKind(new ApiError('getBoard', 500))).toBe('failed');
    expect(failKind(new TypeError('Failed to fetch'))).toBe('failed');
    expect(failKind(new DOMException('timed out', 'TimeoutError'))).toBe('failed');
  });
  it('reads the status out of an older "x failed (404)" message too', () => {
    expect(statusOf(new Error('getProject failed (404)'))).toBe(404);
    expect(failKind('Error: getBoard failed (404)')).toBe('missing');
  });
  it('keeps the message an ApiError always had', () => {
    expect(new ApiError('getBoard', 500).message).toBe('getBoard failed (500)');
  });
});

describe('counts while pending', () => {
  it('shows a dash, never 0, until the count is known', () => {
    expect(countOrDash(0, false)).toBe('–');
    expect(countOrDash(0, true)).toBe('0');
    expect(countOrDash(7, true)).toBe('7');
  });
});

describe('connection', () => {
  it('says Connecting… before the feed ever opened, Reconnecting… only after a drop', () => {
    expect(connectionOf({ open: false, everOpened: false, online: true })).toBe('connecting');
    expect(connectionOf({ open: true, everOpened: true, online: true })).toBe('live');
    expect(connectionOf({ open: false, everOpened: true, online: true })).toBe('reconnecting');
    expect(connectionOf({ open: false, everOpened: true, online: false })).toBe('offline');
  });
  it('draws connecting in the calm form, not the warning one', () => {
    expect(liveView('connecting')).toMatchObject({ state: 'offline', label: 'Connecting…' });
    expect(liveView('reconnecting')).toMatchObject({ state: 'reconnecting', label: 'Reconnecting…' });
    expect(liveView('offline').label).toBe('Offline — showing what you had');
    expect(liveView('live', true).label).toBe('Live.');
  });
});

describe('PendingClock', () => {
  let seen: PendingState[];
  let clock: PendingClock;
  beforeEach(() => {
    vi.useFakeTimers();
    seen = [];
    clock = new PendingClock((s) => seen.push(s), { set: (fn, ms) => setTimeout(fn, ms), clear: (id) => clearTimeout(id as never), now: () => Date.now() });
  });
  afterEach(() => { clock.dispose(); vi.useRealTimers(); });

  it('shows nothing for a read that answers inside 150 ms', () => {
    clock.set(true);
    vi.advanceTimersByTime(SKELETON_DELAY_MS - 10);
    expect(clock.state.phase).toBe('waiting');
    clock.set(false);
    expect(clock.state.phase).toBe('idle');
    expect(seen.some((s) => s.phase === 'showing')).toBe(false);
  });

  it('shows the skeleton after 150 ms and keeps it at least 300 ms', () => {
    clock.set(true);
    vi.advanceTimersByTime(SKELETON_DELAY_MS);
    expect(clock.state.phase).toBe('showing');
    vi.advanceTimersByTime(100);
    clock.set(false);
    expect(clock.state.phase).toBe('holding');
    vi.advanceTimersByTime(SKELETON_MIN_MS - 100 - 1);
    expect(clock.state.phase).toBe('holding');
    vi.advanceTimersByTime(1);
    expect(clock.state.phase).toBe('idle');
  });

  it('lets a skeleton shown long enough go at once', () => {
    clock.set(true);
    vi.advanceTimersByTime(SKELETON_DELAY_MS + SKELETON_MIN_MS);
    clock.set(false);
    expect(clock.state.phase).toBe('idle');
  });

  it('says the server is slow at 8 s, and stops saying it when the read answers', () => {
    clock.set(true);
    vi.advanceTimersByTime(SLOW_MS - 1);
    expect(clock.state.slow).toBe(false);
    vi.advanceTimersByTime(1);
    expect(clock.state.slow).toBe(true);
    clock.set(false);
    expect(clock.state.slow).toBe(false);
  });

  it('goes back to showing when a held skeleton is wanted again', () => {
    clock.set(true);
    vi.advanceTimersByTime(SKELETON_DELAY_MS);
    clock.set(false);
    clock.set(true);
    expect(clock.state.phase).toBe('showing');
    vi.advanceTimersByTime(1000);
    expect(clock.state.phase).toBe('showing');
  });
});
