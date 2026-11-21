<!-- apps/web/src/lib/components/card/page/CardPageBar.svelte -->
<script lang="ts">
  /**
   * The card page's window bar (amendments §7.4): the page has no shell, so this is its way home,
   * back to the board, to the appearance picker and to sign out. Page chrome, not the card: the card
   * itself is CardView, below it.
   */
  import { Button } from '@superjackfruitlabs/vibekit-ui';
  import { app } from '$lib/stores/app.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import BrandMark from '$lib/components/BrandMark.svelte';
  import { initials, personName } from '$lib/components/dialogs/person';
  import { vibeWords } from '$lib/components/settings/account-settings-words';
  import AccountMenu from './AccountMenu.svelte';

  let { boardName, boardHref }: { boardName: string; boardHref: string } = $props();
  const name = $derived(personName(app.user, app.members) || 'there');
</script>

<nav class="cv-pagebar" aria-label="Card window">
  <a class="cv-pagebar__home" href="/" aria-label="Superpipeline home"><BrandMark class="size-6" /></a>
  <Button variant="quiet" href={boardHref}>Back to the board</Button>
  <span class="cv-meta">{boardName}</span>
  <span class="cv-pagebar__end">
    <Button variant="tool" aria-label="Appearance: {vibeWords(appearance.value.vibe)}, {appearance.phase} sky" aria-haspopup="dialog" onclick={() => (appearance.pickerOpen = true)}>Appearance</Button>
    <AccountMenu triggerClass="vk-button vk-button--tool" label="Account, {name}. Menu has Sign out" initials={initials(name)} />
  </span>
</nav>
