<script lang="ts">
  /**
   * "Sign in again to keep going" (SP-Dlg-Reconnect): an alertdialog with no close, shown only after
   * a quiet renewal failed. vibekit 0.0.8 locks an alertdialog with no `onclose`: Esc and outside
   * clicks do not dismiss it, and `close={false}` draws no close button (Sign in again sits in the
   * body, before "What happened", where the reference puts it).
   */
  import { Button, Dialog } from '@superjackfruit/vibekit';
  import { page } from '$app/state';
  import { app } from '$lib/stores/app.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import { auth } from '$lib/auth-recovery.svelte';
  import { reconnect } from '$lib/reconnect';
  import Icon from '$lib/components/parts/Icon.svelte';
  import { initials, personName } from './person';
  import { rcLead, reasonLine, returnBox, whatHappened } from './reconnect-copy';
  import './css/rc.css';

  const expired = $derived(auth.state === 'expired');

  const card = $derived(app.openCardId ? app.cardById(app.openCardId) ?? null : null);
  const stageName = $derived(card ? app.board?.stages.find((s) => s.key === card.currentStageKey)?.name ?? card.currentStageKey : '');
  const back = $derived(returnBox({ card: card ? { title: card.title, stageName } : null, boardName: app.board?.name ?? null, pathname: page.url.pathname }));
  const who = $derived(personName(app.user, app.members));
  const lead = $derived(rcLead(appearance.value.vibe, card !== null));

</script>

<Dialog open={expired} role="alertdialog" close={false} width="540px" frame="sectioned" title="Sign in again to keep going" class="rc">
  {#snippet eyebrow()}<span class="rc-ic" aria-hidden="true"><Icon name="lock" size={22} /></span>{/snippet}
  <div class="rc-body">
    <p class="rc-lead">{lead}</p>
    <div class="rc-back"><Icon name="card" size={18} /><div><span class="small muted">You will come back to</span><b>{back.title}</b><span class="small muted">{back.sub}</span></div></div>
    <div class="rc-who"><span class="bd-avatar" aria-hidden="true">{initials(who)}</span>Signing in as <strong>{who}</strong></div>
    <Button class="rc-btn" href="/auth/login" data-autofocus onclick={(e: MouseEvent) => { e.preventDefault(); reconnect(); }}>Sign in again</Button>
    <details class="rc-why">
      <summary>What happened</summary>
      <p>{whatHappened(auth.issuer ?? page.url.host)}</p>
      <p class="mono rc-reason">{reasonLine(auth.reason ?? 'login_required')}</p>
    </details>
  </div>
</Dialog>
