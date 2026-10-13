<!-- apps/web/src/lib/components/card/layouts/CardPhoneStudio.svelte -->
<script lang="ts">
  /** SP-Phone-Card-Studio: bar, figures, track, readout, command box, five tabs. */
  import '../phone/pc-studio.css';
  import { Button, Face } from '@superjackfruit/vibekit';
  import type { CardLayoutProps } from './types';
  import PhoneIcon from '$lib/components/parts/PhoneIcon.svelte';
  import StudioPhonePanes from '../phone/StudioPhonePanes.svelte';
  import PhoneEditForm from '../phone/PhoneEditForm.svelte';
  import GateStudioFrame from '../gate/GateStudioFrame.svelte';
  import GateStudioBar from '../gate/GateStudioBar.svelte';
  import QuestionStudioFrame from '../question/QuestionStudioFrame.svelte';
  import QuestionStudioBar from '../question/QuestionStudioBar.svelte';
  import CardStateStudio from '../state/CardStateStudio.svelte';
  import { codeTokens, phoneCardView, resumeOptions, studioCaption, studioClock, studioFigs, studioWhen, trackStagesLabel, triesWord, usdShort } from '../phone/phone-card-words';
  import { sentenceCase } from '$lib/words';

  let { model, vibe, phase, gate, question, pageHref, onClose }: CardLayoutProps = $props();

  type Tab = 'spec' | 'log' | 'links' | 'talk' | 'cost';
  const TABS: Tab[] = ['spec', 'log', 'links', 'talk', 'cost'];
  const TAB_NAME: Record<Tab, string> = { spec: 'Spec', log: 'Log', links: 'Links', talk: 'Talk', cost: 'Cost' };
  let tab = $state<Tab>('spec');
  let lastCard = '';
  $effect(() => { if (model.card && model.card.id !== lastCard) { lastCard = model.card.id; tab = 'spec'; } });

  const v = $derived(phoneCardView(model, { members: model.members, agents: model.agents, cardCap: model.cardUsdCap, nowMs: Date.now() }));
  const c = $derived(model.card!);
  const lead = $derived(model.lead!);
  const clock = $derived(studioClock(new Date().toISOString(), phase));
  const cap = $derived(studioCaption(model.stages, model.stageIndex, lead.kind));
  const figs = $derived(studioFigs({ stageIndex: model.stageIndex, stageCount: model.stages.length, attempts: c.attemptCount, kind: lead.kind, ageHours: model.ageHours, cost: c.costUsd, estimateUsd: model.estimate?.estimatedUsd ?? null, blocks: model.linkGroups.blocks.length, openSub: model.counts.openChildren, totalSub: model.counts.children }));
  const counts = $derived<Record<Tab, string>>({ spec: String(v.fieldsCount), log: `${model.counts.runs} ${model.counts.runs === 1 ? 'run' : 'runs'}`, links: String(model.counts.links + model.counts.children + model.counts.refs), talk: String(v.comments), cost: usdShort(c.costUsd) });
  const no = (i: number) => String(i + 1).padStart(2, '0');

  function onTabKey(e: KeyboardEvent, i: number): void {
    const to = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i + TABS.length - 1) % TABS.length : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    tab = TABS[to];
    (document.getElementById(`t-${TABS[to]}`) as HTMLButtonElement | null)?.focus();
  }
  async function copyId(): Promise<void> { await model.copyId(); }
</script>

<div class="ar ph pcard--studio" data-vibe="studio">
  <div class="pc-bar">
    <button class="back" type="button" onclick={onClose}><PhoneIcon name="back-studio" form="plain" size={16} />{model.boardName}</button>
    <button class="sid" type="button" aria-label="Copy card id {c.id}" onclick={copyId}>{model.shortId} <PhoneIcon name="copy-studio" form="plain" size={13} /></button>
    <span class="clk" aria-label={clock.aria}>{clock.text}</span>
    <a class="ph-ib" href={pageHref} aria-label="Open as a page" title="Open as a page"><PhoneIcon name="open-studio" form="plain" size={18} /></a>
    <button class="ph-ib" type="button" aria-label="Close (Esc)" onclick={onClose}><PhoneIcon name="close" form="plain" size={18} /></button>
  </div>
  <div class="pc-in">
    <header class="pc-hd">
      <span class="kick" style="display: inline-flex; align-items: center; gap: 8px;"><span class="chip c{model.stageIndex + 1}"></span>Stage {no(model.stageIndex)} · {model.stageName}</span>
      <div class="tl">
        <h2 id="drawer-title" class:sr={model.edit.editing}>{c.title}</h2>
        <button class="ar-ib" type="button" aria-label="Edit card" data-section="editButton" onclick={() => model.edit.start()}><PhoneIcon name="pen" form="plain" size={16} /></button>
      </div>
    </header>
    {#if model.localError}<p class="note" role="alert" data-section="error">{model.localError}</p>{:else}<div data-section="error" hidden></div>{/if}
    {#if model.edit.editing}<PhoneEditForm {model} />{:else}<div data-section="editForm" hidden></div>{/if}

    <dl class="pc-figs" data-section="facts">
      {#each figs as f (f.dt)}<div><dt>{f.dt}</dt><dd class:z={f.z}>{f.value}{#if f.small}<small>{f.small}</small>{/if}</dd></div>{/each}
    </dl>
    <div class="pc-trk">
      <div role="img" aria-label={trackStagesLabel(model.stages, model.stageIndex, lead.kind, model.archived)}><ol class="ar-track" aria-hidden="true">
        {#each model.stages as s, i (s.key)}
          {#if i < model.stageIndex}<li class="done"><span class="b c{i + 1}"></span><span>{no(i)} {s.name}<span class="sr">, done</span></span></li>
          {:else if i === model.stageIndex}<li class="cur" class:sig={lead.needsYou && !model.archived} aria-current="step"><span class="b c{i + 1}"></span><span>{no(i)} {s.name}{lead.needsYou ? ' · stopped' : ''}</span></li>
          {:else}<li><span class="b c{i + 1}"></span><span>{no(i)} {s.name}</span></li>{/if}
        {/each}
      </ol></div>
      <p><b>{cap.bold}</b>{cap.tail}</p>
    </div>

    {#if model.archived}
      <CardStateStudio kind="archived" {model} /><div data-section="resume" hidden></div>
    {:else if !model.detailLoaded}
      <CardStateStudio kind="loading" {model} /><div data-section="resume" hidden></div>
    {:else if gate}
      <h3 class="pc-flag">Waiting for your review</h3>
      <GateStudioFrame gate={gate.gate} agent={model.agent} {lead} {vibe} footnote={1} />
      <GateStudioBar boardId={gate.boardId} gate={gate.gate} error={gate.error} onResponse={gate.onResponse} /><div data-section="resume" hidden></div>
    {:else if question}
      <h3 class="pc-flag">Question</h3>
      <QuestionStudioFrame elicitation={question.elicitation} agent={question.agent} />
      <QuestionStudioBar model={question.model} elicitation={question.elicitation} agent={question.agent} /><div data-section="resume" hidden></div>
    {:else}
      {#if lead.sentence}
        <section class="ar-q" aria-label="Readout">
          <h3><Face id={model.agent.id ?? v.lastAgent?.id ?? c.id} label={v.speaker} mood={lead.needsYou && !model.archived ? 'needs' : model.agent.mood} size={24} />{v.speaker}{lead.needsYou ? ' · Stopped · needs decision' : ''}{#if lead.at}<span class="mono">{studioWhen(lead.at)}</span>{/if}</h3>
          <blockquote>{#each codeTokens(sentenceCase(lead.sentence)) as p, i (i)}{#if p.code}<code>{p.text}</code>{:else}{p.text}{/if}{/each}</blockquote>
        </section>
      {/if}
      {#if v.live && model.resume.show}
        <section class="pc-cmd" aria-labelledby="cmd-h" data-section="resume">
          <p class="h"><span id="cmd-h">Resume · blocked</span><span class="mono">{triesWord(c.attemptCount)}</span></p>
          <div class="ar-field">
            <label for="resume-at">Resume at stage</label>
            <select id="resume-at" class="ar-sel" bind:value={model.resume.target}>{#each resumeOptions(model.resume.targets) as o (o.value)}<option value={o.value} disabled={o.disabled}>{o.label}</option>{/each}</select>
          </div>
          <div class="ar-field">
            <label for="resume-note">Note to {v.speaker}: what changed? It reads this.</label>
            <input id="resume-note" class="ar-in" type="text" maxlength="8000" bind:value={model.resume.note} aria-invalid={model.resume.error ? 'true' : undefined} />
            {#if model.resume.error}<p class="note" role="alert">{model.resume.error}</p>{/if}
          </div>
          <Button variant="primary" class="ar-btn" type="button" aria-disabled={model.resume.busy ? 'true' : undefined} onclick={() => { if (!model.resume.busy) void model.resume.submit(); }}>{#snippet icon()}<PhoneIcon name="send" form="plain" size={15} />{/snippet}Send back to work</Button><span class="sr" role="status">{model.resume.busy ? 'Sending…' : ''}</span>
        </section>
      {:else}<div data-section="resume" hidden></div>{/if}
    {/if}

    <div class="pc-srow" data-section="status">
      <span class="cd-pill" class:needs={lead.needsYou && !model.archived}><span class="u" class:needs={lead.needsYou && !model.archived}></span>{v.stateWord}</span>
      <span>{v.claim}</span>
      <span class="muted">owner · {v.ownerName}</span>
      {#if v.queuer?.byAgent}<span class="chipx" title={v.grantTitle}><Face id={v.queuer.id} label={v.queuer.name} mood="resting" size={20} /> asked by {v.queuer.name}</span>{/if}
    </div>

    <div>
      <div class="pc-tabs" role="tablist" aria-label="Card sections">
        {#each TABS as t, i (t)}
          <button class="ar-tab" type="button" role="tab" id="t-{t}" aria-controls="p-pane" aria-selected={tab === t} tabindex={tab === t ? 0 : -1} onclick={() => (tab = t)} onkeydown={(e) => onTabKey(e, i)}>{TAB_NAME[t]}<b>{counts[t]}</b></button>
        {/each}
      </div>
      <div class="pc-pane" id="p-pane" role="tabpanel" aria-label={TAB_NAME[tab]} style="padding-top: 16px;">
        <StudioPhonePanes {model} view={v} pane={tab} />
      </div>
    </div>
  </div>
  <footer class="pc-foot" aria-label="Card actions" data-section="cardActions">
    {#if model.archived}<Button variant="secondary" class="ar-btn2" type="button" onclick={() => model.restore()}>Archived — restore</Button>
    {:else}<Button variant="secondary" class="ar-btn2" type="button" aria-disabled={model.archiving ? 'true' : undefined} onclick={() => { if (!model.archiving) void model.archive(); }}>{#snippet icon()}<PhoneIcon name="archive-studio" form="plain" size={15} />{/snippet}Archive card</Button><span class="sr" role="status">{model.archiving ? 'Archiving…' : ''}</span>{/if}
    <Button variant="danger" onclick={() => model.remove()}>Delete card</Button>
  </footer>
</div>
