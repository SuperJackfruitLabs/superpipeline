<script lang="ts">
  /**
   * The large Superpipeline mark (64px and up: the full translucent artwork) with the pack's
   * approved Channel animation (static/brand/README.md).
   *
   * `playIntro` plays it once, on the first loading screen of the page session, never again on a
   * later one and never on a route change. `replay()` plays it on demand. Nothing plays when the
   * person asked for less motion (the OS setting or `data-motion="reduce"`); the mark then sits at
   * rest. Compact marks (48px and under, the rail tile) are BrandMark and never animate.
   *
   * Decorative beside the product name unless `label` is given.
   */
  import { onMount } from 'svelte';
  import { claimIntro, loadLogoMotion, motionReduced, type LogoMotionInstance } from '$lib/logo-motion';

  let { size = 72, playIntro = false, label, class: className = '' }: { size?: number; playIntro?: boolean; label?: string; class?: string } = $props();

  let el: HTMLSpanElement;
  let logo: LogoMotionInstance | undefined;

  export async function replay(): Promise<string> {
    if (!logo) return 'not-ready';
    if (motionReduced(el)) return 'static';
    return (await logo.play()).status;
  }

  onMount(() => {
    let gone = false;
    void loadLogoMotion()
      .then((lib) => {
        if (gone) return;
        logo = lib.create(el, 'superpipeline');
        const svg = el.querySelector('svg');
        if (svg && label) svg.setAttribute('aria-label', label);
        if (playIntro && claimIntro() && !motionReduced(el)) void logo.play();
      })
      .catch(() => {});
    return () => {
      gone = true;
      logo?.destroy();
      logo = undefined;
    };
  });
</script>

<span
  bind:this={el}
  class="logo-motion {className}"
  style:width="{size}px"
  style:height="{size}px"
  aria-hidden={label ? undefined : 'true'}
  data-testid="logo-motion"
></span>

<style>
  .logo-motion {
    display: inline-block;
    flex: 0 0 auto;
  }
</style>
