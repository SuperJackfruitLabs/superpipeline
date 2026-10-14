<!-- apps/web/src/lib/components/workspace/ColourPicker.svelte -->
<script lang="ts">
  /** One hidden native colour input shared by every swatch on a panel; `open(onPick)` shows it. */
  let input: HTMLInputElement;
  let pick: ((colour: string) => void) | null = null;
  // The input has a name for whichever label it is open for: "Colour for clean-room".
  let label = $state('a label');
  export function open(onPick: (colour: string) => void, forLabel = 'a label'): void {
    pick = onPick;
    label = forLabel;
    if (typeof input.showPicker === 'function') input.showPicker(); else input.click();
  }
</script>

<input class="sr" type="color" tabindex="-1" aria-label="Colour for {label}" aria-hidden="true" bind:this={input} onchange={(e) => pick?.(e.currentTarget.value)} />
