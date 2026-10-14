<!-- apps/web/src/lib/components/settings/BoardSettingsStudio.svelte -->
<script lang="ts">
  import SkeletonRows from '$lib/components/parts/SkeletonRows.svelte';
  import { autogrow } from '$lib/autogrow';
  import './board-settings-studio.css';
  import { viewport } from '$lib/viewport.svelte';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import StageRowStudio from './StageRowStudio.svelte';
  import ScheduleListStudio from './ScheduleListStudio.svelte';
  import { SettingsModel } from './settings-model.svelte';
  import { ghState, grantNote, pipelineMeta, saveState } from './settings-words';
  import type { SettingsLayoutProps } from './types';

  let { board, onChanged }: SettingsLayoutProps = $props();
  const model = new SettingsModel(() => ({ board, onChanged }));
  $effect(() => model.startClock());
  const gh = $derived(ghState(board.github));
</script>

<!-- The shell owns the one main. -->
<div class="st-main">
  <div class="st-head">
    <a class="ar-lk quiet" href="/b/{board.boardId}"><LineIcon name="chev-left" size={16} />Back to the board</a>
    <span class="kick">Board settings</span>
    <svelte:element this={viewport.phone ? 'h2' : 'h1'}>{board.name}</svelte:element>
    <p class="st-lede">Each section saves on its own. Budget caps live in <a href="/b/{board.boardId}/operate/telemetry">Operate → Spend</a>.</p>
  </div>
  <div class="st-split">
    <div class="st-stack">
      <section class="ar-sec" aria-labelledby="nm-h">
        <div class="hd"><span class="no">01</span><h2 id="nm-h">Name</h2><span class="r"><span class="st-state">{#if !model.nameDirty}<LineIcon name="check" size={16} />Saved{:else}Unsaved change{/if}</span></span></div>
        <form class="st-row" onsubmit={(e) => { e.preventDefault(); void model.saveName(); }}>
          <div class="ar-field" style="flex: 1 1 260px;"><label for="bd-name">Board name</label><input class="ar-in" id="bd-name" bind:value={model.nameInput} /></div>
          <button class="ar-btn2" type="submit" disabled={!model.nameDirty} aria-disabled={model.nameBusy ? 'true' : undefined}>{model.nameBusy ? 'Renaming…' : 'Rename'}</button>
          {#if model.nameError}<p class="st-note" role="alert">{model.nameError}</p>{/if}
        </form>
      </section>
      <section class="ar-sec" aria-labelledby="pl-h">
        <div class="hd">
          <span class="no">02</span><h2 id="pl-h">Pipeline</h2>
          <span class="r"><span class="st-state">{#if model.unsaved === 0}<LineIcon name="check" size={16} />{/if}{saveState(model.unsaved)}</span><button class="ar-btn" type="button" disabled={model.unsaved === 0} aria-disabled={model.savingStages ? 'true' : undefined} onclick={() => void model.saveStages()}>{model.savingStages ? 'Saving…' : 'Save pipeline'}</button></span>
        </div>
        <p class="st-sub">{pipelineMeta(model.draft.length)}</p>
        <ol class="st-list">{#each model.draft as stage, i (stage.key)}<StageRowStudio {stage} index={i} {model} />{/each}</ol>
        {#if model.stagesError}<p class="st-note" role="alert">{model.stagesError}</p>{/if}
        <form class="st-row st-add" onsubmit={(e) => { e.preventDefault(); model.addStage(); }}>
          <div class="ar-field" style="flex: 1 1 240px;"><label for="st-add">Add a stage</label><input class="ar-in" id="st-add" placeholder="Stage name" bind:value={model.newStageName} /></div>
          <button class="ar-btn2" type="submit"><LineIcon name="plus" size={16} />Add</button>
          <p class="ar-hint" style="flex-basis: 100%;">A stage's key is made from its name and can't change later. To rename a key, add a stage and remove the old one.</p>
        </form>
      </section>
    </div>
    <div class="st-stack">
      <section class="ar-sec" aria-labelledby="sc-h">
        <div class="hd"><span class="no">03</span><h2 id="sc-h">Schedules</h2></div>
        <p class="st-sub">Cards that open themselves on a cadence.</p>
        <ScheduleListStudio boardId={board.boardId!} stages={board.stages} />
      </section>
      <section class="ar-sec" aria-labelledby="gh-h">
        <div class="hd"><span class="no">04</span><h2 class="st-gh" id="gh-h"><LineIcon name="github" size={18} />GitHub</h2><span class="r">{#if gh.saved}<LineIcon name="check" size={16} />{/if}{gh.text}</span></div>
        <ol class="st-steps">
          <li><span class="k">1</span><span>In your repository open Settings → Webhooks → Add webhook.</span></li>
          <li><span class="k">2</span><span>Paste the payload URL and the secret below. Content type: <span class="code">application/json</span>.</span></li>
          <li><span class="k">3</span><span>Turn on “Open a card for each new GitHub issue” and save.</span></li>
        </ol>
        <div class="ar-field"><label for="gh-url">Payload URL</label><div class="st-copy"><textarea class="ar-in grow" id="gh-url" rows="1" readonly use:autogrow={model.webhookUrl} value={model.webhookUrl}></textarea><button class="ar-btn2" type="button" onclick={() => void model.copy('url')}><LineIcon name="copy" size={16} />{model.copied === 'url' ? 'Copied' : 'Copy'}</button></div></div>
        <div class="ar-field">
          <label for="gh-sec">Secret <span class="ar-hint">· {board.github.webhookConfigured ? 'set' : 'not set'}</span></label>
          <div class="st-copy">
            <input class="ar-in" id="gh-sec" placeholder="Generate or paste a secret" bind:value={model.githubSecret} />
            <button class="ar-btn2" type="button" onclick={() => model.genSecret()}>Generate</button>
            <button class="ar-btn2" aria-label="Copy secret" type="button" disabled={model.githubSecret === ''} onclick={() => void model.copy('secret')}><LineIcon name="copy" size={16} />{model.copied === 'secret' ? 'Copied' : 'Copy'}</button>
          </div>
        </div>
        <label class="st-check"><input type="checkbox" bind:checked={model.issueTrigger} /><span>Open a card for each new GitHub issue</span></label>
        <p class="st-note"><LineIcon name="info" size={20} /><span>{grantNote(board.github.triggerGrantCount)}</span></p>
        {#if model.ghError}<p class="st-note" role="alert">{model.ghError}</p>{/if}
        <div><button class="ar-btn" type="button" aria-disabled={model.ghBusy ? 'true' : undefined} onclick={() => void model.saveGithub()}>{model.ghBusy ? 'Saving…' : 'Save GitHub settings'}</button></div>
      </section>
      <section class="ar-sec" aria-labelledby="ap-h">
        <div class="hd"><span class="no">05</span><h2 id="ap-h">Agent profiles</h2></div>
        <p class="st-sub">Named run settings (model and so on) an agent can claim with.</p>
        {#if model.profilesState === 'loading'}<SkeletonRows label="Loading agent profiles…" rows={2} />{:else if model.profilesState === 'failed'}<p class="st-empty">Couldn't load the agent profiles.</p>{:else if model.profiles.length === 0}<p class="st-empty">No profiles yet.</p>{:else}
          <ul class="st-list">{#each model.profiles as p (p.key)}<li><span class="code">{p.key}</span>{p.model ? ` · ${p.model}` : ''}</li>{/each}</ul>
        {/if}
        <form class="st-row" onsubmit={(e) => { e.preventDefault(); void model.addProfile(); }}>
          <div class="ar-field" style="flex: 1 1 140px;"><label for="ap-k">Key</label><input class="ar-in" id="ap-k" placeholder="e.g. opus-careful" bind:value={model.pKey} /></div>
          <div class="ar-field" style="flex: 1 1 140px;"><label for="ap-m">Model</label><input class="ar-in" id="ap-m" placeholder="Model name" bind:value={model.pModel} /></div>
          <button class="ar-btn2" type="submit" aria-disabled={model.profileBusy ? 'true' : undefined}><LineIcon name="plus" size={16} />Add</button>
          {#if model.profileError}<p class="st-note" role="alert">{model.profileError}</p>{/if}
        </form>
      </section>
    </div>
  </div>
  <span class="sr" role="status">{model.busyWords}</span>
</div>
