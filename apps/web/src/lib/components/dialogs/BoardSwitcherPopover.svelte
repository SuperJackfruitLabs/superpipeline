<script lang="ts">
  /**
   * The board switcher (SP-Dlg-BoardSwitcher): vibekit's CommandPalette in its switcher form, placed
   * under the shell's board control, with a raised copy of that control above the scrim as the
   * reference draws it. Boards that need you come first (this one first), then the rest by last use;
   * "last used" is `lastActivityAt` as calendar days in the viewer's zone. The palette's actions row
   * holds this board's Rename, Board settings and Delete board… (the ink outline is on the destructive
   * one); the footer holds the keys and New board.
   */
  import { createRawSnippet, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { Button, CommandPalette, Field, type PaletteGroup } from '@superjackfruit/vibekit';
  import { app } from '$lib/stores/app.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import { renameBoard } from '$lib/api';
  import NewBoardDialog from '$lib/components/NewBoardDialog.svelte';
  import Icon from '$lib/components/parts/Icon.svelte';
  import { SWITCHER_TRIGGERS } from '$lib/layouts';
  import { groupBoards, needsChip } from './switcher-model';
  import { boardCountText } from './switcher-model';
  import { relativeDay } from './relative-day';
  import './css/bs.css';

  /** Where the reference puts the panel under the raised control, per vibe (dialog top − anchor top). */
  const DROP: Record<string, number> = { daylight: 56, paper: 57, studio: 68, quiet: 52 };

  let query = $state('');
  let renaming = $state(false);
  let draftName = $state('');
  let creating = $state(false);
  let anchor = $state<{ left: number; top: number } | null>(null);
  let copy = $state<HTMLDivElement | null>(null);

  const vibe = $derived(appearance.value.vibe);
  const Trigger = $derived(SWITCHER_TRIGGERS[vibe]);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const chip = (text: string) => createRawSnippet(() => ({ render: () => `<span><span class="chip chip--needs">${text}</span></span>` }));

  const groups = $derived.by((): PaletteGroup[] => {
    const now = new Date();
    return groupBoards(app.boards, app.boardId, query).map((g) => ({
      heading: g.label,
      meta: g.right,
      items: g.boards.map((b) => ({
        id: b.id, label: b.name, hint: boardCountText(b.cardCount),
        badge: b.needsYouCount > 0 ? chip(needsChip(b.needsYouCount)) : undefined,
        current: b.id === app.boardId,
        meta: b.id === app.boardId ? 'You are here' : relativeDay(b.lastActivityAt, now, zone),
        onselect: () => void pick(b.id),
      })),
    }));
  });

  /** Lay the raised copy over the shell's own control, then hang the panel under it. */
  $effect(() => {
    if (!app.boardSwitcherOpen) { anchor = null; renaming = false; query = ''; return; }
    const real = document.querySelector<HTMLElement>('[data-bs-trigger], .vk-masthead__title[aria-haspopup]');
    // Paper and Quiet draw the name and "Change board" inline: the copy's control lines up with the words.
    const r = (real?.querySelector<HTMLElement>('.vk-masthead__change') ?? real)?.getBoundingClientRect();
    anchor = r ? { left: r.left, top: r.top } : { left: 32, top: 32 };
    void tick().then(() => {
      const t = copy?.querySelector<HTMLElement>('.bs-trigger');
      if (!t || !r || !anchor) return;
      const c = t.getBoundingClientRect();
      // Whole pixels, as the reference places it: a fractional top moves the copy's text off by a pixel.
      anchor = { left: Math.round(anchor.left + (r.left - c.left)), top: Math.round(anchor.top + (r.top - c.top)) };
    });
  });
  $effect(() => {
    const a = anchor;
    const s = document.documentElement.style;
    if (!a) { s.removeProperty('--sp-bs-x'); s.removeProperty('--sp-bs-y'); return; }
    s.setProperty('--sp-bs-x', `${a.left}px`);
    s.setProperty('--sp-bs-y', `${a.top + (DROP[vibe] ?? 56)}px`);
  });

  function close(): void { app.boardSwitcherOpen = false; }
  async function pick(id: string): Promise<void> {
    close();
    if (id !== app.boardId) await goto(`/b/${id}`);
  }
  async function saveRename(): Promise<void> {
    const name = draftName.trim();
    if (!app.boardId || name === '' || name === app.board?.name) { renaming = false; return; }
    await app.markBusy(renameBoard(app.boardId, name));
    await app.refresh();
    await app.loadBoards();
    renaming = false;
  }
  async function onDelete(): Promise<void> {
    const id = app.boardId;
    if (!id) return;
    const count = app.board?.cards.length ?? 0;
    const cards = count > 0 ? ` and its ${count} card${count === 1 ? '' : 's'}` : '';
    if (!confirm(`Delete "${app.board?.name}"${cards}? Its cards, runs and history go with it. This cannot be undone.`)) return;
    close();
    await app.deleteBoard(id);
    await goto('/');
  }
  function onRenameKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') { e.preventDefault(); void saveRename(); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); renaming = false; }
  }
</script>

{#if app.boardSwitcherOpen && anchor && app.board}
  <!-- The reference's raised trigger: a copy of the shell's control above the scrim. Decoration: the real one stays the control. -->
  <div class="bs-layer" aria-hidden="true" inert>
    <div class="bs-anchor {Trigger.anchorClass}" bind:this={copy} style:left="{anchor.left}px" style:top="{anchor.top}px">
      <Trigger.component name={app.board.name ?? ''} onclick={close} />
    </div>
  </div>
{/if}

<CommandPalette bind:open={app.boardSwitcherOpen} bind:query label="Find a board" form="switcher" width="520px" class="bs" {groups} actionsLabel="This board" empty={`No board matches “${query.trim()}”.`}>
  {#snippet actions()}
    <span class="small muted bs-this">This board:</span>
    {#if renaming}
      <Field id="bs-rename" label="Board name" labelHidden bind:value={draftName} onkeydown={onRenameKey} />
      <Button variant="secondary" size="sm" onclick={() => void saveRename()}>Save</Button>
    {:else}
      <button class="link" type="button" onclick={() => { renaming = true; draftName = app.board?.name ?? ''; }}><Icon name="pen" size={16} /> Rename</button>
      <a class="link" href="/b/{app.boardId}/settings" onclick={close}><Icon name="settings" size={16} />&nbsp;Board settings</a>
      <button class="bs-del" type="button" onclick={() => void onDelete()}><Icon name="trash" size={16} /> Delete board…</button>
    {/if}
  {/snippet}
  {#snippet footer()}
    <span class="grow"><span class="kbd">↑</span><span class="kbd">↓</span> move <span class="kbd">↵</span> open</span>
    <Button variant="secondary" onclick={() => { close(); creating = true; }}>{#snippet icon()}<Icon name="plus" size={18} />{/snippet}New board</Button>
  {/snippet}
</CommandPalette>

<NewBoardDialog open={creating} onClose={() => (creating = false)} onCreated={(id) => { creating = false; void goto(`/b/${id}`); }} />

<style>
  /* Placed under its trigger, as vibekit's switcher form asks the product to do (with class). */
  :global(.vk-dialog.bs) { inset: var(--sp-bs-y, 83px) auto auto var(--sp-bs-x, 128px); margin: 0; }
  /* Above the switcher's scrim (vibekit layers overlays from z 40 and publishes its top layer). */
  .bs-layer { position: fixed; inset: 0; z-index: calc(42 + 2 * var(--vk-layer-top, 0)); pointer-events: none; }
  :global(.vk-dialog.bs .bs-this) { margin-right: 4px; }
  :global(.vk-dialog.bs .vk-commandpalette__actions .vk-field) { flex: 1; min-width: 0; }
</style>
