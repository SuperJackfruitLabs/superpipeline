<!-- apps/web/src/lib/components/BoardSettings.svelte -->
<script lang="ts">
  import { Button } from '@superjackfruit/vibekit';
  import './settings/board-settings.css';
  import { viewport } from '$lib/viewport.svelte';
  import PageMain from '$lib/components/parts/PageMain.svelte';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import ScheduleList from '$lib/components/board/ScheduleList.svelte';
  import StageRow from './settings/StageRow.svelte';
  import { SettingsModel } from './settings/settings-model.svelte';
  import { ghState, grantNote, pipelineMeta, saveState } from './settings/settings-words';
  import type { SettingsLayoutProps } from './settings/types';

  let { board, onChanged }: SettingsLayoutProps = $props();
  const model = new SettingsModel(() => ({ board, onChanged }));
  $effect(() => model.startClock());
  const gh = $derived(ghState(board.github));
</script>

{#snippet ic_plus_16()}<LineIcon name="plus" size={16} />{/snippet}
{#snippet ic_copy_16()}<LineIcon name="copy" size={16} />{/snippet}

<PageMain scope="scr-settings">
  <div style="display: flex; flex-direction: column; gap: var(--vk-space-2);">
    <a class="t-meta back-link" href="/b/{board.boardId}"><LineIcon name="chev-left" size={16} />Back to the board</a>
    <p class="t-eyebrow">Board settings</p>
    <svelte:element this={viewport.phone ? 'h2' : 'h1'} class="t-h1">{board.name}</svelte:element>
    <p class="t-body" style="color: var(--vk-color-muted);">Each section saves on its own. Budget caps live in <a href="/b/{board.boardId}/operate/telemetry">Operate → Spend</a>.</p>
  </div>
  <div class="cols">
    <div class="colstack">
      <section class="panel" aria-labelledby="nm-h">
        <div class="sec-head">
          <h2 class="t-h2" id="nm-h">Name</h2>
          {#if model.nameDirty}<span class="unsaved state">Unsaved change</span>{:else}<span class="saved state"><LineIcon name="check" size={16} />Saved</span>{/if}
        </div>
        <form class="panel-body row-form" onsubmit={(e) => { e.preventDefault(); void model.saveName(); }}>
          <div class="field" style="flex: 1 1 260px;"><label for="bd-name">Board name</label><input class="input" id="bd-name" bind:value={model.nameInput} /></div>
          <Button variant="secondary" type="submit" disabled={!model.nameDirty} aria-disabled={model.nameBusy ? 'true' : undefined}>{model.nameBusy ? 'Renaming…' : 'Rename'}</Button>
          {#if model.nameError}<p class="note" role="alert" style="flex-basis: 100%;">{model.nameError}</p>{/if}
        </form>
      </section>
      <section class="panel" aria-labelledby="pl-h">
        <div class="sec-head">
          <div style="display: flex; flex-direction: column; gap: 2px;"><h2 class="t-h2" id="pl-h">Pipeline</h2><p class="t-meta">{pipelineMeta(model.draft.length)}</p></div>
          {#if model.unsaved === 0}<span class="saved state"><LineIcon name="check" size={16} />Saved</span>{:else}<span class="unsaved state">{saveState(model.unsaved)}</span>{/if}
          <Button variant="primary" type="button" disabled={model.unsaved === 0} aria-disabled={model.savingStages ? 'true' : undefined} onclick={() => void model.saveStages()}>{model.savingStages ? 'Saving…' : 'Save pipeline'}</Button>
        </div>
        <div>{#each model.draft as stage, i (stage.key)}<StageRow {stage} index={i} {model} />{/each}</div>
        {#if model.stagesError}<p class="note" role="alert" style="margin: 0 var(--vk-space-5);">{model.stagesError}</p>{/if}
        <form class="panel-body row-form" style="border-top: 1px solid var(--vk-color-line);" onsubmit={(e) => { e.preventDefault(); model.addStage(); }}>
          <div class="field" style="flex: 1 1 240px;"><label for="st-add">Add a stage</label><input class="input" id="st-add" placeholder="Stage name" bind:value={model.newStageName} /></div>
          <Button variant="secondary" type="submit" icon={ic_plus_16}>Add</Button>
          <p class="hint" style="flex-basis: 100%;">A stage's key is made from its name and can't change later. To rename a key, add a stage and remove the old one.</p>
        </form>
      </section>
    </div>
    <div class="colstack">
      <section class="panel" aria-labelledby="sc-h">
        <div class="sec-head"><div style="display: flex; flex-direction: column; gap: 2px;"><h2 class="t-h2" id="sc-h">Schedules</h2><p class="t-meta">Cards that open themselves on a cadence.</p></div></div>
        <ScheduleList boardId={board.boardId!} stages={board.stages} />
      </section>
      <section class="panel" aria-labelledby="gh-h">
        <div class="sec-head">
          <LineIcon name="github" size={22} /><h2 class="t-h2" id="gh-h">GitHub</h2>
          {#if gh.saved}<span class="saved state"><LineIcon name="check" size={16} />{gh.text}</span>{:else}<span class="unsaved state">{gh.text}</span>{/if}
        </div>
        <div class="panel-body" style="display: flex; flex-direction: column; gap: var(--vk-space-4);">
          <ol class="steps">
            <li>In your repository open Settings → Webhooks → Add webhook.</li>
            <li>Paste the payload URL and the secret below. Content type: <span class="code">application/json</span>.</li>
            <li>Turn on “Open a card for each new GitHub issue” and save.</li>
          </ol>
          <div class="field">
            <label for="gh-url">Payload URL</label>
            <div class="copyfield"><input class="input" id="gh-url" readonly value={model.webhookUrl} /><Button variant="secondary" type="button" onclick={() => void model.copy('url')} icon={ic_copy_16}>{model.copied === 'url' ? 'Copied' : 'Copy'}</Button></div>
          </div>
          <div class="field">
            <label for="gh-sec">Secret <span class="t-meta" style="font-weight: 400;">· {board.github.webhookConfigured ? 'set' : 'not set'}</span></label>
            <div class="copyfield">
              <input class="input" id="gh-sec" placeholder="Generate or paste a secret" bind:value={model.githubSecret} />
              <Button variant="secondary" type="button" onclick={() => model.genSecret()}>Generate</Button>
              <Button variant="quiet" aria-label="Copy secret" type="button" disabled={model.githubSecret === ''} onclick={() => void model.copy('secret')} icon={ic_copy_16}>{model.copied === 'secret' ? 'Copied' : 'Copy'}</Button>
            </div>
          </div>
          <label class="check"><input type="checkbox" bind:checked={model.issueTrigger} /><span>Open a card for each new GitHub issue</span></label>
          <p class="note"><LineIcon name="info" size={20} /><span>{grantNote(board.github.triggerGrantCount)}</span></p>
          {#if model.ghError}<p class="note" role="alert">{model.ghError}</p>{/if}
          <div><Button variant="primary" type="button" aria-disabled={model.ghBusy ? 'true' : undefined} onclick={() => void model.saveGithub()}>{model.ghBusy ? 'Saving…' : 'Save GitHub settings'}</Button></div>
        </div>
      </section>
      <section class="panel" aria-labelledby="ap-h">
        <div class="sec-head"><div style="display: flex; flex-direction: column; gap: 2px;"><h2 class="t-h2" id="ap-h">Agent profiles</h2><p class="t-meta">Named run settings (model and so on) an agent can claim with.</p></div></div>
        <div class="panel-body" style="display: flex; flex-direction: column; gap: var(--vk-space-3);">
          {#if model.profiles.length === 0}<p class="empty">No profiles yet.</p>{:else}
            <ul style="list-style: none; margin: 0; padding: 0;">{#each model.profiles as p (p.key)}<li class="t-body"><span class="code">{p.key}</span>{p.model ? ` · ${p.model}` : ''}</li>{/each}</ul>
          {/if}
          <form class="row-form" onsubmit={(e) => { e.preventDefault(); void model.addProfile(); }}>
            <div class="field" style="flex: 1 1 140px;"><label for="ap-k">Key</label><input class="input" id="ap-k" placeholder="e.g. opus-careful" bind:value={model.pKey} /></div>
            <div class="field" style="flex: 1 1 140px;"><label for="ap-m">Model</label><input class="input" id="ap-m" placeholder="Model name" bind:value={model.pModel} /></div>
            <Button variant="secondary" type="submit" aria-disabled={model.profileBusy ? 'true' : undefined} icon={ic_plus_16}>Add</Button>
            {#if model.profileError}<p class="note" role="alert" style="flex-basis: 100%;">{model.profileError}</p>{/if}
          </form>
        </div>
      </section>
    </div>
  </div>
  <span class="sr" role="status">{model.busyWords}</span>
</PageMain>
