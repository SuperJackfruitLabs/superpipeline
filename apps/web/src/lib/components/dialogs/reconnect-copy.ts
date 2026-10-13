import type { Vibe } from '@superjackfruit/vibekit';
import type { RenewReason } from '$lib/api';

export const RC_LEAD: Readonly<Record<Vibe, string>> = {
  daylight: 'Your sign-in ran out and we could not renew it quietly. Sign in and you will land right back on this card.',
  paper: 'Your sign-in has expired, and it could not be renewed in the background. Once you sign in, you return to this card.',
  studio: 'SESSION EXPIRED. Background renewal failed. Sign in to return to this card.',
  quiet: 'You are signed out. We could not renew your sign-in. After you sign in, this card opens again.',
};
export const rcLead = (vibe: Vibe, onCard: boolean): string => (onCard ? RC_LEAD[vibe] : RC_LEAD[vibe].replace('this card', 'this page'));

const TABS: Record<string, string> = { 'needs-you': 'Needs you', agents: 'Agents', capabilities: 'Capabilities', labels: 'Labels', people: 'People', connections: 'Connections' };

/** "You will come back to": the open card, else the board and the view, else the Workspace tab. */
export function returnBox(x: { card: { title: string; stageName: string } | null; boardName: string | null; pathname: string }): { title: string; sub: string } {
  if (x.card) return { title: x.card.title, sub: `${x.boardName ?? ''} · ${x.card.stageName}` };
  const ws = /^\/workspace(?:\/([a-z-]+))?/.exec(x.pathname);
  if (ws) return { title: 'Workspace', sub: TABS[ws[1] ?? 'needs-you'] ?? 'Workspace' };
  const view = /\/operate\/telemetry\/?$/.test(x.pathname) ? 'Spend detail' : /\/operate\/?$/.test(x.pathname) ? 'Operate' : /\/settings\/?$/.test(x.pathname) ? 'Board settings' : 'Board';
  return { title: x.boardName ?? 'Superpipeline', sub: view };
}

export const whatHappened = (issuer: string): string =>
  `Your sign-in with ${issuer} ended, so it could not be renewed in the background. Your place is saved: after you sign in, you come back here.`;

const REASON_TEXT: Readonly<Record<RenewReason, string>> = {
  login_required: 'refresh refused',
  no_refresh: 'no background renewal for this sign-in',
  plane_unavailable: 'sign-in service unavailable',
  unauthorized_after_renew: 'the session was refused after renewal',
};
export const reasonLine = (r: RenewReason): string => `Reason: ${REASON_TEXT[r]} (${r})`;
export const toastSub = (onCard: boolean): string => (onCard ? 'You stay on this card.' : 'You stay on this page.');
