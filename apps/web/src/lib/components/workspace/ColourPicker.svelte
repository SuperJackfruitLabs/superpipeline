<!-- apps/web/src/lib/components/workspace/ColourPicker.svelte -->
<script lang="ts">
  /** One hidden native colour input shared by every swatch on a panel; `open(onPick)` shows it. */
  let input: HTMLInputElement;
  let pick: ((colour: string) => void) | null = null;
  export function open(onPick: (colour: string) => void): void {
    pick = onPick;
    if (typeof input.showPicker === 'function') input.showPicker(); else input.click();
  }
</script>

<input class="sr" type="color" tabindex="-1" aria-hidden="true" bind:this={input} onchange={(e) => pick?.(e.currentTarget.value)} />
