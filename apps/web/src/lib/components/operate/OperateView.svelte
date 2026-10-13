<script lang="ts">
  /**
   * Operate — what needs me, what is running, what it cost, and what happened, for one board.
   * The model is built once here; the vibe's layout (layouts.ts) only draws it. The shell owns the page's one main; the layout draws the page's one h1 (the masthead title becomes a plain line).
   *
   * Scoped to one board (spec §3): the Durable Object is per board. What needs a person on every
   * board is one list at /workspace/needs-you, read through the one fan-out built for it
   * (`GET /v1/stale?attention=1`); the layouts link there.
   */
  import { app } from '$lib/stores/app.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import { OPERATE_LAYOUTS } from '$lib/layouts';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import { needsPart } from '$lib/components/shell/shell-words';
  import { plural } from '$lib/words';
  import { OperateStore } from './operate-model.svelte';
  import { CapsUi, OperateUi } from './operate-ui.svelte';
  import OperateDaylightSky from './layouts/OperateDaylightSky.svelte';

  const model = new OperateStore();
  const ui = new OperateUi(() => model);
  const caps = new CapsUi(() => model);
  const vibe = $derived(appearance.value.vibe);
  const Layout = $derived(OPERATE_LAYOUTS[vibe]);
  // Only Studio draws a status line on Operate (the other three references end with the page).
  const status = $derived(
    vibe !== 'studio' ? null : shellModel.pageStatus([
      plural(model.cardCount, 'card', 'cards'),
      needsPart(model.needs.length),
      `${model.running.length} running`,
      `${model.unread} unread`,
    ]),
  );
</script>

{#snippet sky()}<OperateDaylightSky {model} />{/snippet}

<AppShell here="operate" section="operate" boardName={app.board?.name ?? 'Untitled board'} view={null} showing={null} {status} sky={vibe === 'daylight' ? sky : undefined} bleed={vibe === 'quiet' || vibe === 'studio'} ownHeading>
  <div id="content" tabindex="-1" class="min-w-0"><Layout {model} {ui} {caps} /></div>
</AppShell>
