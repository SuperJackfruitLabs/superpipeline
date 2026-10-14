<script lang="ts">
  /**
   * Plan's two sections (nav v2): Boards and Projects. Projects belong to the workspace, so the
   * switch is Plan's, not a board's view. Daylight draws a Segmented control (its view switch's
   * form); the other vibes draw link tabs.
   */
  import { goto } from '$app/navigation';
  import { Segmented, Tabs } from '@superjackfruit/vibekit';
  import { shellModel as m } from './shell-model.svelte';
  import { PLAN_SECTIONS, type PlanSection } from './types';

  let { value, form = 'tabs', pill = false }: { value: PlanSection; form?: 'segmented' | 'tabs'; pill?: boolean } = $props();
  const hrefOf = (s: PlanSection): string => (s === 'projects' ? m.projectsHref : m.boardsHref);
  const go = (s: PlanSection): void => { if (s !== value) void goto(hrefOf(s)); };
  const options = PLAN_SECTIONS.map(([v, label]) => ({ value: v, label }));
  const items = $derived(PLAN_SECTIONS.map(([v, label]) => ({ value: v, label, href: hrefOf(v) })));
</script>

{#if form === 'segmented'}
  <Segmented label="Plan" {options} form={pill ? 'pill' : 'auto'} bind:value={() => value, (v) => go(v as PlanSection)} />
{:else}
  <Tabs label="Plan" {items} {value} onchange={(v) => go(v)} />
{/if}
