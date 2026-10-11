<script lang="ts">
  /**
   * An agent, as the vibe draws it (vibekit spec "Agent faces"): a face with its mood, a round
   * portrait, a square with a status light, or the name only. The face is generated from the id
   * unless the agent has a chosen picture (iconUrl). The name is always the accessible name.
   */
  import { Face, type Mood } from '@superjackfruit/vibekit';
  import type { FaceVariant } from '$lib/layouts';
  import { initialOf } from '$lib/names';

  let {
    agentId,
    name,
    iconUrl = null,
    mood = 'resting',
    size = 24,
    variant = 'mood',
    withName = false,
  }: { agentId: string; name: string; iconUrl?: string | null; mood?: Mood; size?: number; variant?: FaceVariant; withName?: boolean } = $props();
</script>

<span class="agent-face inline-flex min-w-0 items-center gap-1.5" data-variant={variant}>
  {#if variant === 'mood'}
    <Face id={agentId} label={name} {mood} {size} src={iconUrl ?? undefined} />
  {:else if variant === 'portrait'}
    {#if iconUrl}
      <img src={iconUrl} alt={name} width={size} height={size} class="shrink-0 rounded-full object-cover" style="width:{size}px;height:{size}px" />
    {:else}
      <span role="img" aria-label={name} class="font-display grid shrink-0 place-items-center rounded-full" style="width:{size}px;height:{size}px;font-size:{Math.round(size * 0.45)}px;background:var(--vk-color-raised);color:var(--vk-color-text)">{initialOf(name)}</span>
    {/if}
  {:else if variant === 'light'}
    <span class="relative inline-block shrink-0" style="width:{size}px;height:{size}px">
      <Face id={agentId} label={name} {mood} {size} src={iconUrl ?? undefined} />
      <span class="status-led absolute -right-0.5 -bottom-0.5 size-2 rounded-full" data-mood={mood} data-blink={mood === 'needs'} aria-hidden="true"></span>
    </span>
  {/if}
  {#if withName || variant === 'name'}<span class="agent-name truncate">{name}</span>{/if}
</span>
