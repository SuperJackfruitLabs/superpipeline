<script lang="ts">
  /**
   * The person's appearance. Every change applies and is saved at once (appearance.set); Done
   * only closes. Native radios throughout: arrow keys, labels and screen readers for free.
   * Each vibe's card is drawn inside its own data-vibe/data-theme so its swatches and sample are
   * that vibe's real tokens and display font, not a picture of them.
   */
  import { tick } from 'svelte';
  import { greeting, type Vibe } from '@superjackfruit/vibekit';
  import { appearance } from '$lib/appearance.svelte';

  const VIBE_CARDS: Array<{ id: Vibe; name: string; about: string }> = [
    { id: 'daylight', name: 'Daylight', about: 'Playful and sunlit' },
    { id: 'paper', name: 'Paper', about: 'Calm and editorial' },
    { id: 'studio', name: 'Studio', about: 'Precise' },
    { id: 'quiet', name: 'Quiet', about: 'Plain and focused' },
  ];
  const THEMES = [
    { id: 'sun', name: 'Follow the sun' },
    { id: 'light', name: 'Light' },
    { id: 'dark', name: 'Dark' },
  ] as const;
  const STRENGTHS = [
    { id: 'strong', name: 'Strong' },
    { id: 'subtle', name: 'Subtle' },
    { id: 'off', name: 'Off' },
  ] as const;
  const PHASE_NAMES = { dawn: 'Dawn', morning: 'Morning', noon: 'Midday', golden: 'Golden hour', dusk: 'Dusk', night: 'Night' } as const;

  let panel = $state<HTMLElement | null>(null);
  let opener: HTMLElement | null = null;
  let locNote = $state<string | null>(null);
  let locBusy = $state(false);

  $effect(() => {
    if (appearance.pickerOpen) {
      opener = document.activeElement as HTMLElement | null;
      void tick().then(() => panel?.focus());
    }
  });

  function close(): void {
    appearance.pickerOpen = false;
    opener?.focus?.();
  }

  async function flipLocation(): Promise<void> {
    // Off wins: while a request is pending the switch reads off, and a second press cancels it.
    if (locBusy || appearance.value.useLocation) {
      appearance.stopUsingLocation();
      locBusy = false;
      locNote = null;
      return;
    }
    locBusy = true;
    locNote = null;
    const r = await appearance.useLocation();
    if (r === 'cancelled') return;
    locBusy = false;
    locNote = r === 'denied' ? 'Location was not shared, so the sun follows your time zone.' : null;
  }

  const FOCUSABLE = 'button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])';
  /** The Tab order: a radio group is one stop (its checked member, else its first). */
  function tabStops(): HTMLElement[] {
    if (!panel) return [];
    const seen = new Set<string>();
    const stops: HTMLElement[] = [];
    for (const el of panel.querySelectorAll<HTMLElement>(FOCUSABLE)) {
      if (el instanceof HTMLInputElement && el.type === 'radio') {
        if (seen.has(el.name)) continue;
        seen.add(el.name);
        stops.push(panel.querySelector<HTMLElement>(`input[type="radio"][name="${el.name}"]:checked`) ?? el);
      } else stops.push(el);
    }
    return stops;
  }
  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab' || !panel) return;
    const f = tabStops();
    if (f.length === 0) return;
    const first = f[0]!, last = f[f.length - 1]!;
    const here = document.activeElement;
    if (e.shiftKey && (here === first || here === panel)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && here === last) { e.preventDefault(); first.focus(); }
  }
</script>

{#if appearance.pickerOpen}
  <div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
    <button class="absolute inset-0" style="background:var(--sp-scrim)" aria-label="Close appearance" tabindex="-1" onclick={close}></button>
    <div
      bind:this={panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="appearance-title"
      tabindex="-1"
      onkeydown={onKeydown}
      class="bg-surface border-border safe-bottom relative max-h-[100dvh] w-full overflow-y-auto border p-5 sm:max-w-[560px] sm:rounded-[var(--vk-radius-lg)]"
    >
      <h2 id="appearance-title" class="font-display text-xl">Appearance</h2>
      <p class="text-muted-foreground mt-1 text-sm">Applies to Superpipeline on this device.</p>

      <fieldset class="mt-5">
        <legend class="mb-2 text-sm font-semibold">Vibe</legend>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {#each VIBE_CARDS as v (v.id)}
            <label
              class="vibe-card flex min-h-[var(--vk-target-min)] cursor-pointer items-start gap-3 rounded-[var(--vk-radius-md)] border-2 p-3"
              data-vibe={v.id}
              data-theme={appearance.theme}
              style="background:var(--vk-color-bg);color:var(--vk-color-text);border-color:{appearance.value.vibe === v.id ? 'var(--vk-color-text)' : 'var(--vk-color-line)'}"
            >
              <input type="radio" name="vibe" value={v.id} checked={appearance.value.vibe === v.id} onchange={() => appearance.set({ vibe: v.id })} class="mt-1 size-5" />
              <span class="flex min-w-0 flex-col gap-1">
                <span style="font-family:var(--vk-font-display)" class="text-lg leading-tight">{v.name}</span>
                <span class="flex gap-1" aria-hidden="true">
                  {#each ['--vk-color-bg', '--vk-color-surface', '--vk-color-primary', '--vk-color-signal'] as sw (sw)}
                    <span class="size-4 rounded-full" style="background:var({sw});box-shadow:inset 0 0 0 1px var(--vk-color-line)"></span>
                  {/each}
                </span>
                <span class="text-sm" style="color:var(--vk-color-muted)">{v.about}</span>
              </span>
            </label>
          {/each}
        </div>
      </fieldset>

      <fieldset class="mt-5">
        <legend class="mb-2 text-sm font-semibold">Light or dark</legend>
        <div class="vk-segmented">
          {#each THEMES as t (t.id)}
            <label class="vk-segmented__item relative has-[:focus-visible]:shadow-[var(--vk-focus)]" data-state={appearance.value.theme === t.id ? 'checked' : 'unchecked'}>
              <input type="radio" name="theme" class="absolute inset-0 m-0 size-full cursor-pointer opacity-0" value={t.id} checked={appearance.value.theme === t.id} onchange={() => appearance.set({ theme: t.id })} />{t.name}
            </label>
          {/each}
        </div>
      </fieldset>

      <fieldset class="mt-5">
        <legend class="mb-2 text-sm font-semibold">Time of day</legend>
        <div class="vk-segmented">
          {#each STRENGTHS as s (s.id)}
            <label class="vk-segmented__item relative has-[:focus-visible]:shadow-[var(--vk-focus)]" data-state={appearance.value.timeStrength === s.id ? 'checked' : 'unchecked'}>
              <input type="radio" name="strength" class="absolute inset-0 m-0 size-full cursor-pointer opacity-0" value={s.id} checked={appearance.value.timeStrength === s.id} onchange={() => appearance.set({ timeStrength: s.id })} />{s.name}
            </label>
          {/each}
        </div>
        <p class="text-muted-foreground mt-1 text-sm">Quiet starts with this off.</p>
      </fieldset>

      <div class="mt-5 flex items-start justify-between gap-4">
        <div>
          <div id="loc-label" class="text-sm font-semibold">Use my location for the sun</div>
          <p id="loc-hint" class="text-muted-foreground text-sm">Your rough location stays on this device. It only works out sunrise and sunset.</p>
          {#if locNote}<p class="text-sm" role="status">{locNote}</p>{/if}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={appearance.value.useLocation || locBusy}
          aria-labelledby="loc-label"
          aria-describedby="loc-hint"
          onclick={() => void flipLocation()}
          class="border-border relative h-[var(--vk-target-min)] w-[72px] shrink-0 rounded-full border-2"
          style="background:{appearance.value.useLocation ? 'var(--vk-color-primary)' : 'var(--vk-color-raised)'}"
        >
          <span class="absolute top-1/2 size-7 -translate-y-1/2 rounded-full transition-[left] duration-[var(--vk-motion-fast)]" style="left:{appearance.value.useLocation ? '36px' : '4px'};background:var(--vk-color-surface);box-shadow:0 0 0 1px var(--vk-color-line)"></span>
        </button>
      </div>

      <p class="text-muted-foreground mt-5 text-sm">Now: {PHASE_NAMES[appearance.phase]} · {greeting(appearance.phase, appearance.value.vibe)}</p>

      <div class="mt-5 flex justify-end">
        <button type="button" class="vk-button vk-button--primary" onclick={close}>Done</button>
      </div>
    </div>
  </div>
{/if}
