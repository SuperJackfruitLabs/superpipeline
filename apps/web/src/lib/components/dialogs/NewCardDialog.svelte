<script lang="ts">
  /**
   * The new card composer (SP-Dlg-NewCard), on vibekit's sectioned Dialog. Title and brief are
   * written by hand: agent drafting (D-1) is a follow-up, so there is no draft button, no "drafted"
   * note and no brief tag (docs/follow-ups/agent-drafted-new-card.md). It opens on
   * `app.requestCompose()`: the N key, the shell's New card button and the palette.
   */
  import { untrack } from 'svelte';
  import { Button, Dialog, Field, Segmented } from '@superjackfruit/vibekit';
  import { app } from '$lib/stores/app.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import { getBoard, type Stage } from '$lib/api';
  import Icon from '$lib/components/parts/Icon.svelte';
  import LabelPicker from './LabelPicker.svelte';
  import BoardPickButton from './BoardPickButton.svelte';
  import { MOD_KEY, NC_LEAD, NC_LEAD_PERSON, PRIORITY_OPTIONS } from './dialog-copy';
  import { dispatchFoot, ownerShort } from './who-picks-up';
  import './css/nc.css';
  import './pickers.css';

  let open = $state(false);
  let sentence = $state('');
  let title = $state('');
  let brief = $state('');
  let stageKey = $state('');
  let projectId = $state('');
  let due = $state('');
  let priority = $state<string>('0');
  let labelIds = $state<string[]>([]);
  let saving = $state(false);
  let failed = $state(false);
  let boardId = $state<string | null>(null);
  let boardName = $state('');
  let stages = $state<Stage[]>([]);

  const byOrder = (a: Stage, b: Stage) => a.order - b.order;
  const labelById = $derived(new Map(app.labels.map((l) => [l.id, l])));
  const projects = $derived([...app.projects].sort((a, b) => a.name.localeCompare(b.name)));
  const stageOptions = $derived(stages.map((s) => ({ value: s.key, label: `${s.name} · ${ownerShort(s, app.agents)}` })));
  const projectOptions = $derived([{ value: '', label: 'No project' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]);
  const stage = $derived(stages.find((s) => s.key === stageKey) ?? null);
  const foot = $derived(stage ? dispatchFoot(stage, boardName, app.agents) : null);
  const empty = $derived(title.trim() === '');
  /** A person works this stage (#11): no "agent" in the brief's heading or the lead. */
  const forPerson = $derived(stage?.ownerKind === 'human');

  let seen = untrack(() => app.composeRequest);
  $effect(() => {
    const n = app.composeRequest;
    if (n === seen) return;
    seen = n;
    untrack(() => openWith(app.composeSentence));
  });
  $effect(() => {
    app.composeOpen = open;
  });

  function openWith(s: string): void {
    if (!app.board || !app.boardId) return;
    sentence = s; title = ''; brief = ''; projectId = ''; due = ''; priority = '0'; labelIds = [];
    failed = false; saving = false;
    boardId = app.boardId;
    boardName = app.board.name ?? '';
    stages = [...app.board.stages].sort(byOrder);
    stageKey = stages[0]?.key ?? '';
    open = true;
  }
  function close(): void { open = false; }

  /** Changing the board reloads its stages and starts at its first; labels and project are kept. */
  async function pickBoard(id: string): Promise<void> {
    const b = await getBoard(id);
    boardId = id;
    boardName = b.name ?? '';
    stages = [...b.stages].sort(byOrder);
    stageKey = stages[0]?.key ?? '';
  }

  async function dispatch(): Promise<void> {
    if (empty || saving) return;
    saving = true;
    failed = false;
    const ok = await app.dispatchCard(title.trim(), {
      priority: Number(priority), description: brief, due, stageKey, labelIds: [...labelIds], projectId: projectId || null, boardId,
    });
    saving = false;
    if (ok) close(); else failed = true;
  }
  function onkey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void dispatch(); }
  }
</script>

{#snippet eyebrow()}<span class="eyebrow nc-eyebrow">New card</span><span class="nc-boardpick"><BoardPickButton {boardId} {boardName} onpick={(id) => void pickBoard(id)} /></span>{/snippet}

<Dialog bind:open title="What needs doing?" {eyebrow} width="800px" frame="sectioned" close="Close without saving" class="nc" onclose={close}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="nc-content" data-dlg="nc" onkeydown={onkey}>
    <p class="nc-lead">{(forPerson ? NC_LEAD_PERSON : NC_LEAD)[appearance.value.vibe]}</p>
    <label class="vk-visually-hidden" for="nc-sentence">Describe it in a sentence</label>
    <textarea class="nc-sentence" id="nc-sentence" rows="2" bind:value={sentence} data-autofocus></textarea>
    <div class="nc-grid">
      <div class="nc-col">
        <Field id="nc-t" label="Card title" bind:value={title} />
        <div class="vk-field">
          <label class="vk-field__label" for="nc-b">{forPerson ? 'What this card asks' : 'Brief for the agent'}</label>
          <p class="vk-field__hint" id="nc-bh">What done looks like, and anything it should not do.</p>
          <div class="nc-brief-wrap">
            <textarea class="nc-brief" id="nc-b" aria-describedby="nc-bh" rows="9" bind:value={brief}></textarea>
          </div>
        </div>
      </div>
      <div class="nc-col">
        <Field id="nc-s" label="Starts in stage" control="select" options={stageOptions} bind:value={stageKey} />
        <div class="nc-row2">
          <Field id="nc-p" label="Project (optional)" control="select" options={projectOptions} bind:value={projectId} />
          <div class="vk-field">
            <label class="vk-field__label" for="nc-d">Due (optional)</label>
            <div class="nc-due"><input class="vk-field__input" id="nc-d" type="date" bind:value={due} />{#if due !== ''}<button class="link small" type="button" onclick={() => (due = '')}>Clear</button>{/if}</div>
          </div>
        </div>
        <fieldset class="vk-field nc-fieldset">
          <legend class="vk-field__label nc-legend">Priority</legend>
          <div class="nc-prio"><Segmented size="sm" label="Priority" options={[...PRIORITY_OPTIONS]} bind:value={priority} /></div>
        </fieldset>
        <div class="vk-field">
          <span class="vk-field__label" id="nc-l">Labels</span>
          <div class="nc-labels" role="group" aria-labelledby="nc-l">
            {#each labelIds as id (id)}
              {@const l = labelById.get(id)}
              <span class="nc-label">{l?.name ?? id}<button type="button" aria-label="Remove label {l?.name ?? id}" onclick={() => (labelIds = labelIds.filter((x) => x !== id))}><Icon name="close" size={14} /></button></span>
            {/each}
            <LabelPicker labels={app.labels} chosen={labelIds} onadd={(id) => (labelIds = [...labelIds, id])} />
          </div>
        </div>
      </div>
    </div>
    {#if failed && app.error}<p role="alert" class="nc-where">{app.error}</p>{/if}
    <span class="vk-visually-hidden" role="status">{saving ? 'Dispatching…' : ''}</span>
  </div>
  {#snippet lead()}<span class="nc-goes small muted"><Icon name="plan" size={16} /><span>{#if foot}{foot.before}<strong>{foot.stage}</strong>{foot.after}{/if}</span></span>{/snippet}
  {#snippet actions()}
    <span class="nc-hint small muted"><span class="kbd">{MOD_KEY}</span> <span class="kbd">↵</span> to dispatch</span>
    <Button variant="secondary" onclick={close}>Cancel</Button>
    <Button aria-disabled={empty || saving ? 'true' : undefined} onclick={() => void dispatch()}>Dispatch</Button>
  {/snippet}
</Dialog>

<style>
  /* Product content inside vibekit's sectioned body: the reference's 16px rhythm (.nc-body gap). */
  /* The reference artboard's type (.art: 16px / 1.45), which vibekit's body (1.5) does not set. */
  :global(.vk-dialog.nc .nc-content) { display: flex; flex-direction: column; gap: 16px; font-size: var(--vk-text-md); line-height: 1.45; }
  /* The eyebrow words carry the reference's .eyebrow type (ported in nc.css); vibekit's eyebrow case and spacing stay off them. */
  :global(.vk-dialog.nc .nc-eyebrow) { display: block; text-transform: none; }
  /* The board button sits under the eyebrow; the reference's head ends 4px under it, then the body's 4px, then the title. */
  :global(.vk-dialog.nc .nc-boardpick) { display: block; padding-bottom: 4px; text-transform: none; letter-spacing: normal; font-style: normal; }
  /* The lead sits 6px under the title (the reference keeps both in one block); vibekit's body starts 8px under the head. */
  :global(.vk-dialog.nc .nc-content > .nc-lead) { margin-top: -2px; }
  :global(.vk-dialog.nc .nc-fieldset) { border: 0; padding: 0; margin: 0; }
  :global(.vk-dialog.nc .nc-legend) { margin-bottom: 8px; padding: 0 2px; }
  :global(.vk-dialog.nc .nc-goes) { display: flex; align-items: center; gap: 8px; line-height: 1.45; }
  :global(.vk-dialog.nc .nc-goes > svg) { flex: 0 0 auto; }
  :global(.vk-dialog.nc .nc-goes strong) { color: var(--vk-color-text); }
  :global(.vk-dialog.nc .nc-hint) { line-height: 1.45; }
  /* #3, #4: Project and Due each take the whole row, so "No project" and the full date beside the calendar button fit in every vibe. */
  :global(.vk-dialog.nc .nc-row2) { grid-template-columns: minmax(0, 1fr); }
  /* #3, #4 on a phone: the two columns stack, so Project and Due get the dialog's full width. */
  @media (max-width: 640px) { :global(.vk-dialog.nc .nc-grid) { grid-template-columns: minmax(0, 1fr); } }
  /* #2: the head (title, board, Close) and the foot stay on screen; only the body scrolls. */
  :global(.vk-dialog.nc) { overflow: hidden; }
  :global(.vk-dialog.nc > .vk-overlay__head), :global(.vk-dialog.nc > .vk-overlay__actions) { flex: none; }
  :global(.vk-dialog.nc > .vk-overlay__body) { flex: 1 1 auto; min-height: 0; overflow: auto; }
</style>
