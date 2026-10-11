<script lang="ts">
  import type { StageSummary } from './card-summary';

  /** The stage facts every lane header shows today, for the layouts that have no lanes. */
  let { stages, variant }: { stages: StageSummary[]; variant: 'lines' | 'strip' | 'table' } = $props();
  const blockedTip = (s: StageSummary) => `${s.blocked} of ${s.count} card${s.count === 1 ? '' : 's'} here ${s.blocked === 1 ? 'is' : 'are'} blocked — held back by an unresolved same-board blocker, excluded from claim`;
</script>

{#snippet facts(s: StageSummary)}
  <span class={s.atLimit ? 'text-signal-text' : 'text-muted-foreground'}>{s.count}{#if s.wipLimit !== null}/{s.wipLimit}{/if}</span>
  {#if s.blocked > 0}<span class="text-signal-text" title={blockedTip(s)}>⛔ {s.blocked} blocked</span>{/if}
  {#if s.gate}<span class="eyebrow text-signal-text" title="Approval gate">gate</span>{/if}
  {#if s.manager}<span class="eyebrow" title="Manager routing">mgr</span>{/if}
  {#if s.owner.undeclared}
    <span class="text-signal-text" title={s.owner.caveat}>⚠ {s.owner.label} — nobody declares it</span>
  {:else}
    <span class="text-muted-foreground">{s.owner.label}</span>
    {#if s.owner.declaredBy.length > 0}<span class="text-muted-foreground" title={s.owner.declaredBy.join(', ')}>· {s.owner.declaredBy.length === 1 ? s.owner.declaredBy[0] : `${s.owner.declaredBy.length} agents`}</span>{/if}
  {/if}
  {#if s.empty}<span class="text-muted-foreground">empty</span>{/if}
{/snippet}

{#if variant === 'table'}
  <table class="w-full text-left text-sm">
    <caption class="sr-only">Stages</caption>
    <thead><tr><th scope="col">Stage</th><th scope="col">Cards and stage facts</th></tr></thead>
    <tbody>{#each stages as s (s.key)}<tr><th scope="row" class="py-1 pr-3 font-semibold">{s.name}</th><td class="flex flex-wrap gap-x-2 py-1">{@render facts(s)}</td></tr>{/each}</tbody>
  </table>
{:else}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex: the strip scrolls sideways on a phone, so it must be keyboard reachable -->
  <ol class={variant === 'strip' ? 'flex gap-1 overflow-x-auto' : 'space-y-1'} aria-label="Stages" tabindex={variant === 'strip' ? 0 : undefined}>
    {#each stages as s, i (s.key)}
      <li class={variant === 'strip' ? 'bg-surface border-border min-w-[9rem] shrink-0 rounded-[var(--vk-radius-sm)] border p-2 text-xs' : 'flex flex-wrap items-baseline gap-x-2 text-sm'}>
        {#if variant === 'lines' && i > 0}<span aria-hidden="true">→</span>{/if}
        <span class="font-semibold">{s.name}</span>
        <span class="flex flex-wrap gap-x-2">{@render facts(s)}</span>
      </li>
    {/each}
  </ol>
{/if}
