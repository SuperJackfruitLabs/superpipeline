// apps/web/src/lib/components/dialogs/reconnect-copy.test.ts
import { describe, expect, it } from 'vitest';
import { RC_LEAD, rcLead, reasonLine, returnBox, toastSub, whatHappened } from './reconnect-copy';

describe('reconnect copy', () => {
  it('has each vibe’s lead verbatim, and says “page” off a card', () => {
    expect(RC_LEAD).toEqual({
      daylight: 'Your sign-in ran out and we could not renew it quietly. Sign in and you will land right back on this card.',
      paper: 'Your sign-in has expired, and it could not be renewed in the background. Once you sign in, you return to this card.',
      studio: 'SESSION EXPIRED. Background renewal failed. Sign in to return to this card.',
      quiet: 'You are signed out. We could not renew your sign-in. After you sign in, this card opens again.',
    });
    expect(rcLead('quiet', false)).toBe('You are signed out. We could not renew your sign-in. After you sign in, this page opens again.');
  });
  it('names where you will come back to', () => {
    expect(returnBox({ card: { title: 'Diagnose Melissa and Anna Supermessage silence — trace actual failing hop', stageName: 'Reproduce' }, boardName: 'Developer Experience', pathname: '/b/brd_134a0ddb6d434478/c/card_05823a57e8224605' }))
      .toEqual({ title: 'Diagnose Melissa and Anna Supermessage silence — trace actual failing hop', sub: 'Developer Experience · Reproduce' });
    expect(returnBox({ card: null, boardName: 'Developer Experience', pathname: '/b/brd_1' })).toEqual({ title: 'Developer Experience', sub: 'Board' });
    expect(returnBox({ card: null, boardName: 'Developer Experience', pathname: '/b/brd_1/operate/log' })).toEqual({ title: 'Developer Experience', sub: 'Board log' });
    expect(returnBox({ card: null, boardName: 'Developer Experience', pathname: '/b/brd_1/operate/telemetry' })).toEqual({ title: 'Developer Experience', sub: 'Spend detail' });
    expect(returnBox({ card: null, boardName: 'Developer Experience', pathname: '/b/brd_1/settings' })).toEqual({ title: 'Developer Experience', sub: 'Board settings' });
    expect(returnBox({ card: null, boardName: null, pathname: '/inbox' })).toEqual({ title: 'Inbox', sub: 'All boards' });
    expect(returnBox({ card: null, boardName: null, pathname: '/crew/people' })).toEqual({ title: 'Crew', sub: 'People' });
    expect(returnBox({ card: null, boardName: null, pathname: '/settings' })).toEqual({ title: 'Settings', sub: 'Labels · Connections' });
  });
  it('explains what happened, and why, in a line', () => {
    expect(whatHappened('accounts.superjackfruit.com')).toBe('Your sign-in with accounts.superjackfruit.com ended, so it could not be renewed in the background. Your place is saved: after you sign in, you come back here.');
    expect(reasonLine('login_required')).toBe('Reason: refresh refused (login_required)');
    expect(reasonLine('no_refresh')).toBe('Reason: no background renewal for this sign-in (no_refresh)');
    expect(reasonLine('plane_unavailable')).toBe('Reason: sign-in service unavailable (plane_unavailable)');
    expect(reasonLine('unauthorized_after_renew')).toBe('Reason: the session was refused after renewal (unauthorized_after_renew)');
    expect([toastSub(true), toastSub(false)]).toEqual(['You stay on this card.', 'You stay on this page.']);
  });
});
