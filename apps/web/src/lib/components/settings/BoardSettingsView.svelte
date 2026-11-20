<!-- apps/web/src/lib/components/settings/BoardSettingsView.svelte -->
<script lang="ts">
  /**
   * Board settings, the Settings composition for one board: the way back, the page head (the one
   * `[data-signature]` slot, as on Settings), then tabs with counts: Stages (the pipeline editor, Save pipeline), Schedules
   * (a table, New schedule), Labels (the labels this board's cards carry, counted here), Spending caps
   * (facts, changed in Spend), GitHub (the webhook, Save GitHub settings) and Name and profiles (its name, Rename; its agent
   * profiles, Add). One action per section; each section saves on its own.
   */
  import './settings.css';
  import { PAGE_KEYS } from '$lib/keys';
  import KeysLine from '$lib/components/shell/KeysLine.svelte';
  import { untrack } from 'svelte';
  import { Button, FactList, SectionHeader, Tabs } from '@superjackfruitlabs/vibekit-ui';
  import SkeletonRows from '$lib/components/parts/SkeletonRows.svelte';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { autogrow } from '$lib/autogrow';
  import { viewport } from '$lib/viewport.svelte';
  import { ScheduleModel } from '$lib/components/board/schedule-model.svelte';
  import { LabelsModel } from '$lib/components/workspace/labels-model.svelte';
  import StageRow from './StageRow.svelte';
  import SchedulesTable from './SchedulesTable.svelte';
  import LabelsTable from './LabelsTable.svelte';
  import { SettingsModel } from './settings-model.svelte';
  import { BOARD_SETTINGS_LEDE, BOARD_SETTINGS_TABS, capWords, ghState, grantNote, labelUse, pipelineMeta, saveState, type BoardSettingsTab } from './settings-words';
  import type { BoardSettingsViewProps } from './types';

  let { board, onChanged, initial = 'stages', ontab }: BoardSettingsViewProps = $props();
  // svelte-ignore state_referenced_locally
  let tab = $state<BoardSettingsTab>(initial);
  const model = new SettingsModel(() => ({ board, onChanged }));
  $effect(() => model.startClock());
  const schedules = new ScheduleModel(untrack(() => board.boardId ?? ''));
  const labels = new LabelsModel();
  // Loaded during init (ssr is off): the busy marks are held before the first paint.
  void schedules.refresh();
  void labels.refresh();

  const gh = $derived(ghState(board.github));
  const use = $derived(labelUse(board.cards));
  const counts = $derived<Partial<Record<BoardSettingsTab, number>>>({
    stages: model.draft.length,
    schedules: schedules.loaded ? schedules.schedules.length : undefined,
    labels: labels.labels?.filter((l) => (use[l.id] ?? 0) > 0).length,
  });
  const items = $derived(BOARD_SETTINGS_TABS.map((t) => ({ value: t.id, label: t.label, count: counts[t.id] })));
  const order = (t: BoardSettingsTab) => BOARD_SETTINGS_TABS.findIndex((x) => x.id === t) + 1;
  const heading = $derived(viewport.phone ? 'h2' : 'h1');
  function choose(t: BoardSettingsTab): void { tab = t; ontab?.(t); }
</script>

{#snippet savePipeline()}
  <Button variant="primary" type="button" disabled={model.unsaved === 0} busy={model.savingStages} onclick={() => void model.saveStages()}>Save pipeline</Button>
{/snippet}
{#snippet pipelineState()}
  {pipelineMeta(model.draft.length)} {#if model.unsaved === 0}<span class="saved"><LineIcon name="check" size={16} />Saved</span>{:else}<span class="unsaved">{saveState(model.unsaved)}</span>{/if}
{/snippet}
{#snippet ghMeta()}{#if gh.saved}<span class="saved"><LineIcon name="check" size={16} />{gh.text}</span>{:else}<span class="unsaved">{gh.text}</span>{/if}{/snippet}
{#snippet nameState()}{#if model.nameDirty}<span class="unsaved">Unsaved change</span>{:else}<span class="saved"><LineIcon name="check" size={16} />Saved</span>{/if}{/snippet}

{#snippet panel(t: BoardSettingsTab)}
  {#if t === 'stages'}
    <section class="set-sec">
      <SectionHeader n={order('stages')} title="Stages" meta={pipelineState} action={savePipeline} />
      <div class="set-stages">{#each model.draft as stage, i (stage.key)}<StageRow {stage} index={i} {model} />{/each}</div>
      {#if model.stagesError}<p class="set-error" role="alert">{model.stagesError}</p>{/if}
      <form class="row-form" onsubmit={(e) => { e.preventDefault(); model.addStage(); }}>
        <div class="field" style:flex="1 1 240px"><label for="st-add">Add a stage</label><input class="input" id="st-add" placeholder="Stage name" bind:value={model.newStageName} /></div>
        <Button variant="secondary" type="submit">Add</Button>
        <p class="hint" style:flex-basis="100%">A stage's key is made from its name and can't change later. To rename a key, add a stage and remove the old one. Agents holding a stage's capability claim its cards; with an approval gate a person approves before a card leaves. A stage holding cards cannot be removed until they are moved, and the last stage cannot be removed.</p>
      </form>
    </section>
  {:else if t === 'schedules'}
    <SchedulesTable model={schedules} stages={board.stages} n={order('schedules')} />
  {:else if t === 'labels'}
    <LabelsTable model={labels} scope="board" cards={board.cards} boardName={board.name} n={order('labels')} />
  {:else if t === 'caps'}
    <section class="set-sec">
      <SectionHeader n={order('caps')} title="Spending caps" meta="What this board and each of its cards may spend before work stops for a person." />
      <FactList label="Spending caps" items={[{ term: 'Board cap', value: capWords(board.usage?.budgetUsd) }, { term: 'Per-card cap', value: capWords(board.usage?.cardUsdCap) }]} />
      <div class="set-acts"><Button variant="secondary" href="/b/{board.boardId}/operate/telemetry">Change caps in Spend</Button></div>
    </section>
  {:else if t === 'github'}
    <section class="set-sec">
      <SectionHeader n={order('github')} title="GitHub" meta={ghMeta} />
      <ol class="steps">
        <li>In your repository open Settings → Webhooks → Add webhook.</li>
        <li>Paste the payload URL and the secret below. Content type: <span class="code">application/json</span>.</li>
        <li>Turn on “Open a card for each new GitHub issue” and save.</li>
      </ol>
      <div class="field">
        <label for="gh-url">Payload URL</label>
        <div class="copyfield"><textarea class="input grow" id="gh-url" rows="1" readonly use:autogrow={model.webhookUrl} value={model.webhookUrl}></textarea><Button variant="secondary" type="button" onclick={() => void model.copy('url')}>{model.copied === 'url' ? 'Copied' : 'Copy'}</Button></div>
      </div>
      <div class="field">
        <label for="gh-sec">Secret <span class="t-meta">· {board.github.webhookConfigured ? 'set' : 'not set'}</span></label>
        <div class="copyfield">
          <input class="input" id="gh-sec" placeholder="Generate or paste a secret" bind:value={model.githubSecret} />
          <Button variant="secondary" type="button" onclick={() => model.genSecret()}>Generate</Button>
          <Button variant="quiet" aria-label="Copy secret" type="button" disabled={model.githubSecret === ''} onclick={() => void model.copy('secret')}>{model.copied === 'secret' ? 'Copied' : 'Copy'}</Button>
        </div>
      </div>
      <label class="check"><input type="checkbox" bind:checked={model.issueTrigger} /><span>Open a card for each new GitHub issue</span></label>
      <p class="set-line">{grantNote(board.github.triggerGrantCount)}</p>
      {#if model.ghError}<p class="set-error" role="alert">{model.ghError}</p>{/if}
      <div class="set-acts"><Button variant="primary" type="button" busy={model.ghBusy} onclick={() => void model.saveGithub()}>Save GitHub settings</Button></div>
    </section>
  {:else}
    <section class="set-sec">
      <SectionHeader n={order('board')} title="Name" meta={nameState} />
      <form class="row-form" onsubmit={(e) => { e.preventDefault(); void model.saveName(); }}>
        <div class="field" style:flex="1 1 260px"><label for="bd-name">Board name</label><input class="input" id="bd-name" bind:value={model.nameInput} /></div>
        <Button variant="secondary" type="submit" disabled={!model.nameDirty} busy={model.nameBusy}>Rename</Button>
        {#if model.nameError}<p class="set-error" role="alert" style:flex-basis="100%">{model.nameError}</p>{/if}
      </form>
    </section>
    <section class="set-sec">
      <SectionHeader title="Agent profiles" meta="Named run settings (model and so on) an agent can claim with." />
      {#if model.profilesState === 'loading'}<SkeletonRows label="Loading agent profiles…" rows={2} />{:else if model.profilesState === 'failed'}<p class="set-empty">Couldn't load the agent profiles.</p>{:else if model.profiles.length === 0}<p class="set-empty">No profiles yet.</p>{:else}
        <FactList label="Agent profiles" items={model.profiles.map((p) => ({ term: p.key, value: p.model ?? 'the agent’s own model' }))} />
      {/if}
      <form class="row-form" aria-label="Add an agent profile" onsubmit={(e) => { e.preventDefault(); void model.addProfile(); }}>
        <div class="field" style:flex="1 1 140px"><label for="ap-k">Key</label><input class="input" id="ap-k" placeholder="e.g. careful" bind:value={model.pKey} /></div>
        <div class="field" style:flex="1 1 140px"><label for="ap-m">Model</label><input class="input" id="ap-m" placeholder="Model name" bind:value={model.pModel} /></div>
        <Button variant="secondary" type="submit" busy={model.profileBusy}>Add</Button>
        {#if model.profileError}<p class="set-error" role="alert" style:flex-basis="100%">{model.profileError}</p>{/if}
      </form>
    </section>
  {/if}
{/snippet}

<div class="page set scr-settings">
  <!-- The way back is an action, not the headline block, so it sits outside the signature (§11.6). -->
  <a class="set-back" href="/b/{board.boardId}"><LineIcon name="chev-left" size={16} />Back to the board</a>
  <div class="set-head" data-signature>
    <p class="set-eyebrow">Board settings</p>
    <svelte:element this={heading} class="set-title">{board.name}</svelte:element>
    <p class="set-lede">{BOARD_SETTINGS_LEDE}</p>
  </div>
  <Tabs label="Board settings" mode="panels" {items} value={tab} onchange={choose} {panel} />
  <p class="set-foot"><KeysLine keys={PAGE_KEYS} /></p>
  <span class="sr" role="status">{model.busyWords}</span>
</div>
