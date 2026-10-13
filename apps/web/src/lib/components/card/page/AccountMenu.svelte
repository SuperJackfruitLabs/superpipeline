<!-- apps/web/src/lib/components/card/page/AccountMenu.svelte -->
<script lang="ts">
  /** The card page's account control: a vibekit Menu with one item, Sign out. */
  import { Menu } from '@superjackfruit/vibekit';
  import Icon from '$lib/components/parts/Icon.svelte';
  import { signOut } from '$lib/components/shell/account';

  let { triggerClass, label, initials, caret = false }: { triggerClass: string; label: string; initials: string; caret?: boolean } = $props();
</script>

<Menu {label} items={[{ label: 'Sign out', onselect: signOut }]}>
  {#snippet trigger(props)}<button {...props} class={triggerClass} type="button" aria-label={label}>{initials}{#if caret}<Icon name="chev" size={14} />{/if}</button>{/snippet}
</Menu>
