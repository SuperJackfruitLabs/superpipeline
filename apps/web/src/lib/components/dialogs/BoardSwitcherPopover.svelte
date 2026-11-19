<script lang="ts">
  /**
   * The board switcher (SP-Dlg-BoardSwitcher): vibekit's CommandPalette in its switcher form, placed
   * under the shell's board control, with a raised copy of that control above the scrim: one form in
   * every vibe (`BoardPickButton`), as the composition contract asks. Boards that need you come first (this one first), then the rest by last use;
   * "last used" is `lastActivityAt` as calendar days in the viewer's zone. The palette's actions row
   * holds this board's Rename, Board settings and Delete board… (the ink outline is on the destructive
   * one); the footer holds the keys and New board.
   */
  import { createRawSnippet, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { Button, CommandPalette, Field, type PaletteGroup } from '@superjackfruitlabs/vibekit-ui';
  import { app } from '$lib/stores/app.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import BoardPickButton from './BoardPickButton.svelte';
  import { renameBoard } from '$lib/api';
  import NewBoardDialog from '$lib/components/NewBoardDialog.svelte';
  import Icon from '$lib/components/parts/Icon.svelte';
  import { groupBoards, needsChip } from './switcher-model';
  import { boardCountText } from './switcher-model';
  import { relativeDay } from './relative-day';
  import './css/bs.css';
  import './css/palclose.css';

  /** Where the reference puts the panel under the shell's control, per vibe (dialog top − control top). */
  const DROP: Record<string, number> = { daylight: 56, paper: 57, studio: 68, quiet: 52 };
  const SWITCHER_W = 520;
  const MARGIN = 16;

  let query = $state('');
  let renaming = $state(false);
  let draftName = $state('');
  let creating = $state(false);
  /** Where the raised copy sits (its name over the board's own name), and where the panel hangs from (the shell's control). */
  let anchor = $state<{ left: number; top: number } | null>(null);
  let control = $state<{ left: number; top: number } | null>(null);
  /** The board name's type in the masthead (the vibe's), worn by the copy's name so the two names are one. */
  let nameType = $state('');
  let copy = $state<HTMLDivElement | null>(null);

  const vibe = $derived(appearance.value.vibe);
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

  /** The first drawn text inside `el`: its box, and the element that sets its type. */
  function nameText(el: Element | null | undefined): { left: number; top: number; owner: Element } | null {
    if (!el) return null;
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!(n.textContent ?? '').trim() || !n.parentElement) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      const r = range.getBoundingClientRect();
      return { left: r.left, top: r.top, owner: n.parentElement };
    }
    return null;
  }
  function typeOf(el: Element): string {
    const cs = getComputedStyle(el);
    return [
      `--bs-name-family: ${cs.fontFamily}`, `--bs-name-size: ${cs.fontSize}`, `--bs-name-weight: ${cs.fontWeight}`,
      `--bs-name-style: ${cs.fontStyle}`, `--bs-name-stretch: ${cs.fontStretch}`, `--bs-name-ls: ${cs.letterSpacing}`,
      `--bs-name-variation: ${cs.fontVariationSettings}`, `--bs-name-features: ${cs.fontFeatureSettings}`,
    ].join('; ');
  }

  /**
   * Lay the raised copy over the shell's own control, then hang the panel under that control. The copy is one form in
   * every vibe (BoardPickButton); its name wears the masthead name's type and lies exactly over it, so the two never
   * show through each other as a doubled title. Paper and Quiet draw the name and "Switch board" inline: the name is
   * `.vk-masthead__name`, and the panel hangs under the words.
   */
  $effect(() => {
    if (!app.boardSwitcherOpen) { anchor = null; control = null; nameType = ''; renaming = false; query = ''; return; }
    const real = document.querySelector<HTMLElement>('[data-bs-trigger], .vk-masthead__title[aria-haspopup]');
    const r = (real?.querySelector<HTMLElement>('.vk-masthead__change') ?? real)?.getBoundingClientRect();
    // Locals, not the state just written: reading it back would make this effect depend on its own writes.
    const at = r ? { left: Math.round(r.left), top: Math.round(r.top) } : { left: 32, top: 32 };
    const name = nameText(real?.querySelector('.vk-masthead__name') ?? real);
    control = at;
    nameType = name ? typeOf(name.owner) : '';
    anchor = name ? { left: name.left, top: name.top } : at;
    void tick().then(() => {
      const c = name ? nameText(copy?.querySelector('.nc-board__name')) : null;
      if (!name || !c || !anchor) return;
      // Whole pixels, as the reference places it: a fractional top moves the copy's text off by a pixel.
      anchor = { left: Math.round(anchor.left + (name.left - c.left)), top: Math.round(anchor.top + (name.top - c.top)) };
    });
  });
  $effect(() => {
    const a = control;
    const s = document.documentElement.style;
    if (!a) { s.removeProperty('--sp-bs-x'); s.removeProperty('--sp-bs-y'); return; }
    // O10, #26: hang under the trigger, but never past a screen edge (16px margins); the panel is as wide as fits.
    const w = Math.min(SWITCHER_W, window.innerWidth - 2 * MARGIN);
    s.setProperty('--sp-bs-x', `${Math.max(MARGIN, Math.min(a.left, window.innerWidth - w - MARGIN))}px`);
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
    <div class="bs-anchor" bind:this={copy} style="{nameType}; left: {anchor.left}px; top: {anchor.top}px">
      <BoardPickButton boardId={app.boardId} boardName={app.board.name ?? ''} lead="" class="bs-trigger" onopen={close} />
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
    <button class="sp-palclose" type="button" aria-label="Close" onclick={close}><Icon name="close" size={20} /></button>
  {/snippet}
</CommandPalette>

<NewBoardDialog open={creating} onClose={() => (creating = false)} onCreated={(id) => { creating = false; void goto(`/b/${id}`); }} />

<style>
  /* Placed under its trigger, as vibekit's switcher form asks the product to do (with class). */
  :global(.vk-dialog.bs) { inset: var(--sp-bs-y, 83px) auto auto var(--sp-bs-x, 128px); margin: 0; }
  /* #26: no taller than the screen under it; the board list scrolls, the actions (Delete board…) and the foot stay in reach. */
  :global(.vk-dialog.bs) { width: min(520px, calc(100vw - 32px)); max-height: calc(100dvh - var(--sp-bs-y, 83px) - 16px); overflow: hidden; }

  /* Above the switcher's scrim (vibekit layers overlays from z 40 and publishes its top layer). */
  .bs-layer { position: fixed; inset: 0; z-index: calc(42 + 2 * var(--vk-layer-top, 0)); pointer-events: none; }
  :global(.vk-dialog.bs .bs-this) { margin-right: 4px; }
  :global(.vk-dialog.bs .vk-commandpalette__actions .vk-field) { flex: 1; min-width: 0; }
</style>
