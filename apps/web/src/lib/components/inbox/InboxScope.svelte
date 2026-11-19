<!-- apps/web/src/lib/components/inbox/InboxScope.svelte -->
<script lang="ts">
  /**
   * Which boards the Inbox shows, said once (§7.3): vibekit QuickFilter, whose Studio form is
   * SmallMultiples (one square per card that needs you). All boards, the boards that need you, then
   * "N more boards", which opens the rest in place. The choice scopes the whole page and is held in
   * memory only (`inboxScope`). The form is the vibe's, so it sits in the signature slot (§11.6).
   * While the Inbox is counting it reserves the row and shows no number.
   */
  import { QuickFilter, type QuickFilterOption, type State } from '@superjackfruitlabs/vibekit-ui';
  import { app } from '$lib/stores/app.svelte';
  import { inboxScope, scopeChips } from './inbox-scope.svelte';

  let { pending = false }: { pending?: boolean } = $props();
  const ALL = 'all';
  const MORE = 'more';
  let moreOpen = $state(false);
  const s = $derived(scopeChips(app.boards, app.attention, inboxScope.boardId));
  const units = (n: number): State[] => Array.from({ length: Math.min(n, 24) }, () => 'needs');
  const options = $derived.by((): QuickFilterOption<string>[] => {
    const chips = moreOpen ? [...s.chips, ...s.more.map((b) => ({ id: b.id, label: b.name, count: 0 }))] : s.chips;
    const out: QuickFilterOption<string>[] = chips.map((c) => ({ value: c.id ?? ALL, label: c.label, count: c.count, tone: c.count > 0 ? 'needs' : undefined, units: units(c.count) }));
    if (s.more.length > 0) out.push({ value: MORE, label: moreOpen ? 'Fewer boards' : s.moreLabel, count: 0, units: [] });
    return out;
  });
  function choose(v: string): void {
    if (v === MORE) { moreOpen = !moreOpen; return; }
    inboxScope.choose(v === ALL ? null : v);
  }
</script>

<div class="ib-scope" data-signature>
  {#if pending}
    <div class="ib-scope__wait" aria-hidden="true"></div>
  {:else}
    <QuickFilter label="Show" {options} value={inboxScope.boardId ?? ALL} onchange={choose} />
  {/if}
</div>
