<script lang="ts">
  /** Crew — who and what may act here: Agents, People, Capabilities. One shell; the tab page draws the frame for its vibe. */
  import { page } from '$app/state';
  import { appearance } from '$lib/appearance.svelte';
  import AppShell from '$lib/components/shell/AppShell.svelte';
  import { shellModel } from '$lib/components/shell/shell-model.svelte';
  import { needsPart } from '$lib/components/shell/shell-words';
  import { workspaceCounts } from '$lib/components/workspace/workspace-counts.svelte';
  import { CREW_NEW_LABEL, requestCrewNew, type CrewNewTab } from '$lib/components/workspace/crew-new';

  let { children } = $props();
  const vibe = $derived(appearance.value.vibe);
  const lead = $derived(page.params.tab === 'agents' ? 'Crew · Agents' : 'Crew');
  // Only Studio's crew references draw a status line.
  const status = $derived(vibe === 'studio' ? shellModel.pageStatus([lead, needsPart(shellModel.attentionCount)]) : null);
  // The masthead's primary action is the tab's New (the approved Crew mockups); the tab owns the dialog.
  const newTab = $derived((['agents', 'people', 'capabilities'] as const).find((t) => t === page.params.tab) as CrewNewTab | undefined);
  const primary = $derived(newTab ? { label: CREW_NEW_LABEL[newTab], onclick: () => requestCrewNew(newTab) } : undefined);
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void workspaceCounts.refresh();
</script>

<!-- The frame draws its own h1 (the masthead title becomes a plain line), so the page still has one. -->
<AppShell here="crew" section="crew" boardName={null} view={null} showing={null} {status} bleed={vibe === 'quiet'} ownHeading {primary}>
  {@render children()}
</AppShell>
