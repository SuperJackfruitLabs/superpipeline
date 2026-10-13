<!-- apps/web/src/lib/components/card/layouts/CardStudio.svelte -->
<script lang="ts">
  /**
   * Studio's card drawer (SP-Card-Studio, the annual report): the bar, the kicker and title are
   * vibekit's Drawer; under them come six figures, the stage ramp, 01 why it stopped, 02 who and
   * what, 03 send it back, and 04 the card in full as five tabs. The gate and the question replace
   * 01 and 03. Every section key is drawn once (`data-section`); tabs are counted tab by tab.
   */
  import { tick } from 'svelte';
  import '../page/card-page-studio.css';
  import '../studio/card-studio.css';
  import '../studio/card-states-studio.css';
  import { Button, Drawer, Face, StageTrack } from '@superjackfruit/vibekit';
  import { CARD_LAYOUTS } from '$lib/layouts';
  import { displayAgent } from '$lib/names';
  import { clockHM } from '$lib/when';
  import { isControlRow, isNarrative, visibleActivities } from '$lib/activity-groups';
  import Icon from '$lib/components/parts/Icon.svelte';
  import CardEditForm from '../CardEditForm.svelte';
  import DeliveryPanel from '../DeliveryPanel.svelte';
  import LinkAddForm from '../LinkAddForm.svelte';
  import HandoffView from '../HandoffView.svelte';
  import RawJson from '../RawJson.svelte';
  import ToolCallDetails from '../ToolCallDetails.svelte';
  import SpecValueView from '../SpecValueView.svelte';
  import GateStudioFrame from '../gate/GateStudioFrame.svelte';
  import GateStudioBar from '../gate/GateStudioBar.svelte';
  import QuestionStudioFrame from '../question/QuestionStudioFrame.svelte';
  import QuestionStudioBar from '../question/QuestionStudioBar.svelte';
  import CardStateStudio from '../state/CardStateStudio.svelte';
  import { specGroups, specRowCount } from '../spec-groups';
  import { referenceSource, refLabel } from '../references';
  import { safeHref } from '../spec-details';
  import { sessionIdOf, splitTokens } from '../tokens';
  import { eventVerb, STOP_SENTENCE, stripAria, stripKind } from '../state-words';
  import { handoffLine, initials, planNone, projectLine, RESUME_PLACEHOLDER, usd } from '../card-words';
  import {
    commentsCount, figAge, linksSentence, outcomeWord, quoteHeader, quoteWhen, runEnded, stageNo, studioClock, studioKicker, studioNoteHint,
    studioProvenance, tabCounts, whereWord,
  } from '../studio/studio-format';
  import { focusInPlace, openAtTop } from '../open-at-top';
  import type { CardLayoutProps } from './types';

  let { model: m, vibe, phase, gate, question, pageHref, onClose }: CardLayoutProps = $props();
  const uid = $props.id();
  let nowIso = $state(new Date().toISOString());
  $effect(() => {
    const t = setInterval(() => (nowIso = new Date().toISOString()), 30_000);
    return () => clearInterval(t);
  });

  const card = $derived(m.card!);
  const lead = $derived(m.lead!);
  const editing = $derived(m.edit.editing);
  const needs = $derived(lead.needsYou && !m.archived);
  const name = (id: string | null) => (id ? displayAgent(id, m.agents) : '');
  const agentName = $derived(m.agent.name || 'the agent');
  const lastName = $derived(name(m.lastAgentId));
  const ownerName = $derived(m.ownerName);
  const q = $derived(m.provenance);
  const kind = $derived(stripKind(lead, m.archived));
  const groups = $derived(specGroups(card.spec, { criteriaHeading: 'Acceptance criteria' }));
  const rows = $derived(groups.flatMap((g) => g.rows.map((r, i) => ({ ...r, group: g.label, first: i === 0, span: g.rows.length }))));
  const sid = $derived(sessionIdOf(lead.sentence));
  const runs = $derived([...m.activityGroups].reverse());
  const age = $derived(figAge(m.ageHours ?? 0));
  const clock = $derived(studioClock(nowIso, phase));
  const stopped = $derived(['stopped', 'failed', 'budget'].includes(lead.kind) && !m.archived);
  const tabs = $derived(tabCounts({ rows: specRowCount(groups), runs: m.counts.runs, links: m.counts.links + m.counts.children + m.counts.refs, comments: m.comments.comments.length, costUsd: card.costUsd }));
  const stageClass = $derived(`c${Math.min(m.stageIndex + 1, 7)}`);

  let tab = $state<'spec' | 'log' | 'links' | 'talk' | 'cost'>('spec');
  let rawOpen = $state(false);
  let subAdd = $state(false);
  let refAdd = $state(false);
  $effect(() => { void card.id; tab = 'spec'; });
  $effect(() => m.comments.attach());
  function onTabKey(e: KeyboardEvent): void {
    const order = tabs.map((t) => t.id);
    const i = order.indexOf(tab);
    const to = e.key === 'ArrowRight' ? (i + 1) % order.length : e.key === 'ArrowLeft' ? (i + order.length - 1) % order.length : e.key === 'Home' ? 0 : e.key === 'End' ? order.length - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    tab = order[to]!;
    document.getElementById(`${uid}-${tab}`)?.focus();
  }

  let gateKeys: ((e: KeyboardEvent) => boolean) | null = null;
  function onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement;
    if (t.closest('input, textarea, select, [contenteditable="true"]')) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && t.id === `${uid}-note`) { e.preventDefault(); void m.resume.submit(); }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.shiftKey && e.key.toLowerCase() === 'o') { e.preventDefault(); window.open(pageHref, '_blank', 'noopener'); return; }
    if (e.shiftKey) return;
    if (e.key.toLowerCase() === 'e') { e.preventDefault(); m.edit.start(); return; }
    if (gateKeys?.(e)) e.preventDefault();
  }
  function back(e: MouseEvent): void {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onClose();
  }

  // Change project (O9): the inline form takes focus where it is, never scrolling the card.
  let projectWas = false;
  $effect(() => {
    const editing = m.project.editing;
    if (editing && !projectWas) void tick().then(() => focusInPlace(document.querySelector('[data-project-form] select')));
    projectWas = editing;
  });
</script>

{#snippet hidden(key: string)}<span hidden data-section={key}></span>{/snippet}
{#snippet hd(no: number, id: string, title: string, right: import('svelte').Snippet | null)}
  <div class="hd"><span class="no">{stageNo(no - 1)}</span><h2 {id}>{title}</h2><span class="r">{#if right}{@render right()}{/if}</span></div>
{/snippet}

{#snippet backBar()}
  <a class="cw-crumb" href="/b/{m.boardId}" onclick={back}><Icon name="back" size={16} strokeWidth={1.75} />{m.boardName}</a>
  <span class="cw-id">Card {m.shortId}<button type="button" aria-label="Copy card id {m.shortId}" onclick={() => m.copyId()}><Icon name={m.copied === 'id' ? 'check' : 'copy'} size={14} strokeWidth={1.75} /></button></span>
{/snippet}
{#snippet tools()}
  <time class="cw-time" aria-label={clock.aria}>{clock.text}</time>
  <Button variant="tool" href={pageHref} target="_blank" rel="noopener" aria-keyshortcuts="Shift+O" aria-label="Open in new window, Shift O">{#snippet icon()}<Icon name="open-window" size={15} strokeWidth={1.75} />{/snippet}Open <span class="kbd" aria-hidden="true">⇧O</span></Button>
{/snippet}
{#snippet kicker()}<span class="vk-overlay__mark chip {stageClass}" style="display: inline-block; width: 10px; height: 10px; background: var(--vk-stage-{Math.min(m.stageIndex + 1, 7)});"></span>{studioKicker({ board: m.boardName, i: m.stageIndex, stage: m.stageName })}{/snippet}
{#snippet aside()}
  <Button variant="tool" aria-label="Edit card" aria-keyshortcuts="E" data-section="editButton" pressed={editing} onclick={() => m.edit.start()}>{#snippet icon()}<Icon name="edit" size={15} strokeWidth={1.75} />{/snippet}Edit <span class="kbd" aria-hidden="true">E</span></Button>
{/snippet}

<Drawer open={true} head="stacked" title={card.title} eyebrow={kicker} eyebrowTone={needs ? 'needs' : 'muted'} back={backBar} {tools} {aside} width={CARD_LAYOUTS.studio.width} onclose={onClose}>
<!-- svelte-ignore a11y_no_static_element_interactions: the drawer's keyboard shortcuts; every action also has a button -->
<div class="ar cw" data-vibe="studio" tabindex="-1" data-autofocus {@attach openAtTop} onkeydown={onKey}>
  {#if m.localError}<p class="ss-err" role="alert" data-section="error">{m.localError}</p>{:else}{@render hidden('error')}{/if}
  {#if m.archived}<CardStateStudio kind="archived" model={m} />{/if}
  {#if editing}<div data-section="editForm"><CardEditForm model={m} /></div>{:else}{@render hidden('editForm')}{/if}

  <div class="ar-figs" data-section="facts">
    <div><b>{m.stageIndex + 1}<small>of {m.stages.length}</small></b><span>Stage</span></div>
    <div><b>{card.attemptCount}</b><span>Attempts</span></div>
    {#if needs}<div class="sig"><b>{age.value}<small>{age.unit}</small></b><span>Waiting on you</span></div>{:else}<div><b>{age.value}<small>{age.unit}</small></b><span>In {m.stageName}</span></div>{/if}
    <div><b class:z={card.costUsd === 0}>{usd(card.costUsd)}</b><span>{m.estimate?.estimatedUsd ? `Cost · of ${usd(m.estimate.estimatedUsd)}` : 'Cost · no estimate'}</span></div>
    <div><b class:z={m.counts.links === 0}>{m.counts.links}</b><span>Blocks</span></div>
    <div><b class:z={m.counts.openChildren === 0}>{m.counts.openChildren}<small>of {m.counts.children}</small></b><span>Sub-tasks open</span></div>
  </div>
  <StageTrack stages={m.stages.map((s) => s.name)} current={m.stageIndex} state={needs && stopped ? 'stopped' : 'current'} form="card" label={stripAria(m.stageIndex, m.stages.length, m.stageName, kind, 'drawer')} />

  <div class="cw-cols">
    <div>
      {#if !m.detailLoaded}
        <CardStateStudio kind="loading" model={m} />
        {@render hidden('resume')}
      {:else if question}
        <section class="ar-sec" aria-labelledby="{uid}-s1">{@render hd(1, `${uid}-s1`, 'Question', null)}<QuestionStudioFrame elicitation={question.elicitation} agent={question.agent} /></section>
      {:else if gate}
        <section class="ar-sec" aria-labelledby="{uid}-s1">{@render hd(1, `${uid}-s1`, 'Waiting for your review', null)}<GateStudioFrame gate={gate.gate} agent={m.agent} {lead} {vibe} /></section>
      {:else if m.archived}
        <CardStateStudio kind="reason" model={m} />
      {:else}
        {#snippet copySid()}attempt {card.attemptCount}{/snippet}
        <section class="ar-sec" aria-labelledby="{uid}-s1">
          {@render hd(1, `${uid}-s1`, stopped ? 'Why it stopped' : 'What the agent said', copySid)}
          {#if lead.sentence}
            <div class="ar-q" role="status">
              <h3><Face id={agentName} label={agentName} mood={lead.needsYou ? 'needs' : 'working'} size={24} ring={needs ? 'mood' : undefined} />{needs && stopped ? quoteHeader(agentName, 'stopped') : agentName}{#if lead.at}<span class="mono">{quoteWhen(lead.at, new Date())}</span>{/if}</h3>
              <blockquote>{#each splitTokens(lead.sentence) as p, i (i)}{#if p.token}<code>{p.text}</code>{#if p.text === sid}<sup class="fn">1</sup>{/if}{:else}{p.text}{/if}{/each}</blockquote>
              {#if sid}<div class="ar-pfn"><span class="k">1</span><span>Session <code>{sid}</code></span><button class="ar-lk" type="button" style="padding-right: 0px;" onclick={() => m.copySessionId(sid)}><Icon name="copy" size={14} strokeWidth={1.75} />Copy session id</button></div>{/if}
            </div>
          {/if}
        </section>
      {/if}
    </div>

    <div>
      <section class="ar-sec" aria-labelledby="{uid}-s2">
        {@render hd(2, `${uid}-s2`, 'Who and what', null)}
        <dl class="cd-who" data-section="status">
          <dt>State</dt><dd><span class="cd-pill" class:needs={needs}><span class="u" class:needs={needs}></span>{m.archived ? 'Archived' : lead.needsYou ? 'Waiting on you' : card.state === 'working' ? 'Working' : 'Queued'}</span></dd>
          <dt>Agent</dt><dd>{#if m.delegate.id}<Face id={m.delegate.name} label={m.delegate.name} mood="working" size={20} />{m.delegate.name}{:else}Unclaimed {#if lastName}<span class="muted">({lastName} ran attempt {card.attemptCount})</span>{/if}{/if}</dd>
          <dt>Owner</dt><dd><span class="ar-ini" aria-hidden="true" style="width: 20px; height: 20px; font-size: 8px;">{initials(ownerName)}</span><b>{ownerName}</b></dd>
          {#if q?.known}<dt>Asked by</dt><dd title={q.byAgent ? 'An agent with dispatch authority on this board' : undefined}>{#if q.byAgent}<Face id={m.queuedByName} label={m.queuedByName} mood="working" size={20} />{/if}<b>{m.queuedByName}</b></dd>{/if}
          <dt>Priority</dt><dd>{card.priority > 0 ? `P${card.priority}` : 'none'}</dd>
          <dt>Due</dt><dd>{card.dueAt ? card.dueAt.slice(0, 10) : 'none'}</dd>
          <dt>Labels</dt><dd>{m.labels.length ? m.labels.map((l) => l.name).join(', ') : 'none'}</dd>
        </dl>
      </section>

      {#if m.detailLoaded && question}
        <section class="ar-sec" aria-labelledby="{uid}-s3">{@render hd(3, `${uid}-s3`, 'Your answer', null)}<QuestionStudioBar model={question.model} elicitation={question.elicitation} agent={question.agent} /></section>
        {@render hidden('resume')}
      {:else if m.detailLoaded && gate}
        <section class="ar-sec" aria-labelledby="{uid}-s3">{@render hd(3, `${uid}-s3`, 'Your decision', null)}<GateStudioBar boardId={gate.boardId} gate={gate.gate} error={gate.error} onResponse={gate.onResponse} conflict={gate.conflict} onRefresh={gate.onRefresh} registerKeys={(h) => (gateKeys = h)} /></section>
        {@render hidden('resume')}
      {:else if m.detailLoaded && m.archived}
        <CardStateStudio kind="restore" model={m} />
        {@render hidden('resume')}
      {:else if m.detailLoaded && stopped && m.resume.show}
        <section class="ar-sec" aria-labelledby="{uid}-s3">
          {@render hd(3, `${uid}-s3`, 'Send it back to work', null)}
          <form class="cw-form" aria-labelledby="{uid}-s3" data-section="resume" onsubmit={(e) => { e.preventDefault(); if (!m.resume.busy) void m.resume.submit(); }}>
            <div class="ar-field"><label for="{uid}-at">Resume at stage</label><select id="{uid}-at" class="ar-sel" bind:value={m.resume.target}>{#each m.resume.targets.filter((t) => t.allowed) as t (t.key)}<option value={t.key}>{stageNo(t.n - 1)} {t.name}{t.current ? ' (this stage)' : ''}</option>{/each}</select></div>
            <div class="ar-field"><label for="{uid}-note">Note to {agentName}: what changed, or what to do differently</label><textarea id="{uid}-note" class="ar-ta" maxlength="8000" aria-describedby="{uid}-hint" aria-invalid={m.resume.error ? 'true' : undefined} placeholder={RESUME_PLACEHOLDER} bind:this={m.resume.noteEl} bind:value={m.resume.note}></textarea></div>
            <div class="row"><span id="{uid}-hint" class="ar-hint">{m.resume.error ?? studioNoteHint(m.resume.note.length, agentName, false)}</span><button class="ar-btn" type="submit" aria-disabled={m.resume.busy ? 'true' : undefined}><Icon name="send" size={15} strokeWidth={1.75} />Send back to work <span class="kbd" aria-hidden="true">⌘↵</span></button><span class="vk-visually-hidden" role="status">{m.resume.busy ? 'Sending…' : ''}</span></div>
          </form>
        </section>
      {:else}{@render hidden('resume')}{/if}
    </div>
  </div>

  <section class="ar-sec" aria-labelledby="{uid}-s4">
    {@render hd(4, `${uid}-s4`, 'The card in full', null)}
    <div class="cd-tabs" role="tablist" aria-label="Card sections">
      {#each tabs as t (t.id)}
        <button class="ar-tab" type="button" role="tab" id="{uid}-{t.id}" aria-controls="{uid}-panel" aria-selected={tab === t.id} tabindex={tab === t.id ? 0 : -1} onclick={() => (tab = t.id)} onkeydown={onTabKey}>{t.label} <span class="mono">{t.count}</span></button>
      {/each}
      <span class="end" aria-hidden="true"><span class="kbd">←</span><span class="kbd">→</span></span>
    </div>
    <div id="{uid}-panel" role="tabpanel" aria-labelledby="{uid}-{tab}" class="cd-panel">
      {#if tab === 'spec'}
        <div class="cd-two">
          <div>{#if card.spec?.description}<h3 class="cd-h">Description</h3><p class="cd-p" data-section="description" style="white-space: pre-line">{String(card.spec.description)}</p>{:else}{@render hidden('description')}{/if}</div>
          <div>{#if m.acceptanceCriteria?.length}<h3 class="cd-h">Acceptance criteria <span class="mono">{m.acceptanceCriteria.length}</span></h3><ol class="cd-ol" data-section="criteria">{#each m.acceptanceCriteria as c, i (i)}<li><span>{c}</span></li>{/each}</ol>{:else}{@render hidden('criteria')}{/if}</div>
        </div>
        {#if m.plan}<div data-section="plan"><h3 class="cd-h">Agent plan</h3>{#if m.plan}<ol class="cd-ol">{#each m.plan as st, i (i)}<li><span>{st.done ? '✓ ' : ''}{st.text}</span></li>{/each}</ol>{:else}<p class="cd-p">{planNone(m.agent.name)}</p>{/if}</div>{:else}<span hidden data-section="plan"></span>{/if}
        <div data-section="details" data-testid="spec-details">
          <div class="cd-acts" style="justify-content: space-between;"><h3 class="cd-h" style="margin: 0px;">Details <span class="mono">{specRowCount(groups)} fields</span></h3><span class="cd-acts"><button class="ar-lk" type="button" aria-expanded={rawOpen} onclick={() => (rawOpen = !rawOpen)}>{rawOpen ? 'Hide raw JSON' : 'View raw JSON'}</button>{#if rawOpen}<button class="ar-lk" type="button" onclick={() => m.copySpec()}><Icon name={m.copied === 'spec' ? 'check' : 'copy'} size={14} strokeWidth={1.75} />Copy</button>{/if}</span></div>
          <table class="cd-dt">
            <caption class="sr">Brief details, {specRowCount(groups)} fields</caption>
            <tbody>{#each rows as r (r.key)}<tr class:g={r.first}>{#if r.first}<th scope="rowgroup" rowspan={r.span}>{r.group}</th>{/if}<th scope="row">{r.label}</th><td data-testid="spec-value-{r.key}"><SpecValueView value={r.value} v={{ more: 'ar-lk', id: 'mono', link: 'ttl', matrixLinks: true }} /></td></tr>{/each}</tbody>
          </table>
          {#if rawOpen}<RawJson value={card.spec} bare />{/if}
        </div>
        <div class="cd-acts" data-section="project">
          {#if m.project.editing}
            <span class="cd-acts" data-project-form><select class="ar-sel" aria-label="Project" bind:value={m.project.projectId} onchange={() => void m.project.onProjectChange()}><option value="">No project</option>{#each m.projects as p (p.id)}<option value={p.id}>{p.name}</option>{/each}</select>
            <button class="ar-lk" type="button" aria-disabled={m.project.saving ? 'true' : undefined} onclick={() => { if (!m.project.saving) void m.project.save(); }}>Save</button><span class="vk-visually-hidden" role="status">{m.project.saving ? 'Saving…' : ''}</span><button class="ar-lk" type="button" onclick={() => m.project.cancel()}>Cancel</button></span>
          {:else}
            <span><span class="kick">Project</span> {m.projectName ? projectLine(m.projectName, m.milestoneName) : 'none'}</span><button class="ar-lk" type="button" onclick={() => m.project.start()}>{m.projectName ? 'Change project' : 'Assign to a project'}</button>
          {/if}
        </div>
      {:else if tab === 'log'}
        <div data-section="activity" style="display: contents">
          {#if q?.known}<p class="cd-p"><span class="kick">Provenance</span> {studioProvenance(m.queuedByName, q.byAgent, m.grantCovers, !!m.delegate.id)}</p>{/if}
          <table class="cd-dt">
            <thead><tr><th scope="col" style="width: 40px;">Run</th><th scope="col">Agent</th><th scope="col" style="width: 74px;">Outcome</th><th scope="col" style="width: 36px;">Ev</th><th scope="col" style="width: 92px;">Ended</th></tr></thead>
            <tbody>{#each runs as g, ri (g.runId)}{@const a = m.attempts.find((x) => x.runId === g.runId)}{@const who = name(g.agentId) || 'An agent'}{@const no = (m.attempts.findIndex((x) => x.runId === g.runId) + 1) || runs.length - ri}{@const isOpen = m.isRunOpen(g.runId, ri === 0)}<tr><td class="m"><button class="ar-run" type="button" data-attempt-head={g.runId} aria-expanded={isOpen} aria-controls="{uid}-run-{g.runId}" aria-label="Run {no}, {isOpen ? 'hide' : 'show'} its log" onclick={() => m.toggleRun(g.runId, ri === 0)}>#{no}</button></td><td><span class="ag"><Face id={who} label={who} mood={ri === 0 && needs ? 'needs' : 'resting'} size={20} />{who}</span></td><td class:sigt={ri === 0 && needs}>{a ? outcomeWord(a) : 'Running'}</td><td class="m">{g.counts.total}</td><td class="m">{a?.endedAt ? runEnded(a.endedAt) : '—'}</td></tr>{/each}</tbody>
          </table>
          {#each runs as g, ri (g.runId)}
            {#if m.isRunOpen(g.runId, ri === 0)}
              {@const tools = m.toolsShown(g.runId)}
              {@const view = visibleActivities(g.activities, isNarrative, tools, isControlRow)}
              <div id="{uid}-run-{g.runId}">
                <div class="cd-acts" style="justify-content: space-between;"><h3 class="cd-h" style="margin: 0px;">{ri === 0 ? 'Latest run' : `Run #${(m.attempts.findIndex((x) => x.runId === g.runId) + 1) || runs.length - ri}`} <span class="mono">{m.stages.find((s) => s.key === g.stageKey)?.name ?? g.stageKey} · {g.counts.error} errors</span></h3>{#if tools || (g.counts.action > 0 && !view.shownBecauseNoNarrative)}<button class="ar-lk" type="button" data-attempt-tools={g.runId} aria-pressed={tools} onclick={() => m.toggleTools(g.runId)}>{tools ? 'Hide tool calls' : 'Show tool calls'}</button>{/if}</div>
                <table class="cd-dt cd-ev"><tbody>{#each view.rows as ev, ei (ev.seq)}<tr><td class="m" style={ei === 0 ? 'width: 52px;' : undefined}>{clockHM(ev.ts)}</td><td><span class:sigt={ev.signal === 'stop'}>{eventVerb(ev)}.</span> {ev.signal === 'stop' && ri === 0 ? STOP_SENTENCE : ev.body}<ToolCallDetails parameter={ev.parameter} result={ev.result} cls="cd-details" /></td></tr>{/each}</tbody></table>
              </div>
            {/if}
          {/each}
        </div>
        {#if m.counts.handoff}<div data-section="handoff"><span class="kick">Handoff</span><HandoffView handoff={m.handoff} testid="carried-handoff" /></div>
        {:else}<p class="cd-p" data-section="handoff"><span class="kick">Handoff</span> {handoffLine({ handoff: null, stageIndex: m.stageIndex, stages: m.stages, queuedByName: m.queuedByName || 'someone', createdAt: card.createdAt })}</p>{/if}
        {#if m.decidedGates.length}<p class="cd-p" data-section="decisions"><span class="kick">Decisions</span> {m.decidedGates.length ? m.decidedGates.map((d) => `${d.decision ?? d.status} at ${m.stages.find((s) => s.key === d.stageKey)?.name ?? d.stageKey}`).join('; ') : 'None yet.'}</p>{:else}<span hidden data-section="decisions"></span>{/if}
      {:else if tab === 'links'}
        <div class="cd-acts" style="justify-content: space-between;"><span class="cd-p">{m.counts.links + m.counts.children + m.counts.refs} in all</span><button class="ar-lk" type="button" onclick={() => m.links.openAdd()}><Icon name="link" size={14} strokeWidth={1.75} />Add link</button></div>
        <LinkAddForm model={m} />
        <table class="cd-dt cd-refs">
          <thead><tr><th scope="col" style="width: 84px;">Kind</th><th scope="col">Card or reference</th><th scope="col" style="width: 76px;">Where</th><th scope="col" style="width: 44px;"><span class="sr">Actions</span></th></tr></thead>
          <tbody>
            {#each [...m.linkGroups.blockedBy, ...m.linkGroups.blocks, ...m.linkGroups.relates] as row, i (row.title)}<tr data-section={i === 0 ? 'links' : undefined}><td>Card</td><td>{row.title}</td><td>This board</td><td><button class="ar-lk" type="button" aria-disabled={m.links.removing.size > 0 ? 'true' : undefined} onclick={() => { if (m.links.removing.size === 0) void m.links.remove(row.remove); }}>Remove</button></td></tr>{/each}
            {#each m.otherRefs as r, i (r.id)}<tr data-section={i === 0 ? 'references' : undefined}><td>Reference</td><td>{#if safeHref(r.url)}<a class="ttl" href={safeHref(r.url)!} target="_blank" rel="noreferrer">{r.title ?? refLabel(r)}</a>{:else}{r.title ?? refLabel(r)}{/if} <span class="muted mono">{referenceSource(r)}</span></td><td>{whereWord(r.url)}</td><td></td></tr>{/each}
          </tbody>
        </table>
        <div class="cd-acts">
          {#if subAdd}<label class="sr" for="{uid}-sub">New sub-task title</label><input id="{uid}-sub" class="ar-ta" style="min-height: 44px; height: 44px; resize: none;" type="text" placeholder="Add a sub-task" bind:value={m.subtasks.title} onkeydown={(e) => { if (e.key === 'Enter') void m.subtasks.add(); }} /><button class="ar-btn2" type="button" aria-disabled={m.subtasks.adding ? 'true' : undefined} onclick={() => { if (!m.subtasks.adding) void m.subtasks.add(); }}>Add</button><span class="vk-visually-hidden" role="status">{m.subtasks.adding ? 'Adding…' : ''}</span>
          {:else}<button class="ar-lk" type="button" onclick={() => (subAdd = true)}>Add a sub-task</button>{/if}
          {#if refAdd}<label class="sr" for="{uid}-ref">Attach a link or Superlibrary item</label><input id="{uid}-ref" class="ar-ta" style="min-height: 44px; height: 44px; resize: none;" type="url" placeholder="Paste a link to attach" bind:value={m.refsForm.url} onkeydown={(e) => { if (e.key === 'Enter') void m.refsForm.add(); }} /><button class="ar-btn2" type="button" onclick={() => m.refsForm.add()}>Add</button>
          {:else}<button class="ar-lk" type="button" onclick={() => (refAdd = true)}>Attach a link</button>{/if}
        </div>
        {#if !m.hasAnyLink}{@render hidden('links')}{/if}
        {#if m.otherRefs.length === 0}{@render hidden('references')}{/if}
        <p class="cd-p"><span data-section="subtasks">Sub-tasks {card.openChildCount} open of {m.children.length}</span> · <span data-section="related">{linksSentence(card.openChildCount, m.children.length, m.related.items.length).split(' · ')[1]}</span></p>
      {:else if tab === 'talk'}
        <div data-section="comments" style="display: contents">
          {#if m.comments.comments.length}{#each m.comments.comments as c (c.id)}<p class="cd-p"><b>{m.authorName(c.author)}</b> <span style="white-space: pre-wrap">{c.deletedAt ? 'Comment deleted' : c.body}</span></p>{/each}{:else}<p class="cd-p">{commentsCount(0)}. The agent that works this card reads them.</p>{/if}
          <div class="ar-field"><label for="{uid}-comment">Add a comment</label><textarea id="{uid}-comment" class="ar-ta" maxlength="8192" placeholder="⌘ or Ctrl + Enter posts it" bind:value={m.comments.draft} onkeydown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void m.comments.submit(); } }}></textarea></div>
          {#if m.comments.error}<p class="cd-p" role="alert">{m.comments.error}</p>{/if}
          <div><button class="ar-btn2" type="button" aria-disabled={m.comments.posting ? 'true' : undefined} onclick={() => { if (!m.comments.posting) void m.comments.submit(); }}>Comment</button><span class="vk-visually-hidden" role="status">{m.comments.posting ? 'Posting…' : ''}</span></div>
        </div>
      {:else}
        <div data-section="cost" style="display: contents">
          <div class="ar-figs" style="grid-auto-flow: row; border-bottom: 0px;"><div><b class:z={card.costUsd === 0}>{usd(card.costUsd)}</b><span>{m.estimate?.estimatedUsd ? `of ${usd(m.estimate.estimatedUsd)}` : 'no estimate yet'}</span></div></div>
          <div class="cd-meter" aria-hidden="true">{#each [0, 1, 2, 3] as i (i)}<i class:off={m.costPct <= i * 25}></i>{/each}</div>
        </div>
        <table class="cd-dt" data-section="attempts"><thead><tr><th scope="col" style="width: 64px;">Attempt</th><th scope="col">Agent</th><th scope="col" style="width: 60px;">Spent</th><th scope="col">Outcome</th></tr></thead><tbody>{#each m.attempts as a, i (a.runId)}<tr><td class="m">{i + 1}</td><td>{name(a.agentId)}</td><td class="m">{usd(a.costUsd)}</td><td>{outcomeWord(a)}</td></tr>{/each}</tbody></table>
        {#if m.counts.deliveryActive}<div data-section="delivery"><DeliveryPanel model={m} /></div>{:else}<p class="cd-p" data-section="delivery">Delivery: none approved on this card.</p>{/if}
      {/if}
    </div>
  </section>

  <div class="cw-foot" data-section="cardActions">
    {#if !m.archived}<button class="ar-btn2" type="button" aria-disabled={m.archiving ? 'true' : undefined} onclick={() => { if (!m.archiving) void m.archive(); }}><Icon name="archive" size={15} strokeWidth={1.75} />Archive card</button><span class="vk-visually-hidden" role="status">{m.archiving ? 'Archiving…' : ''}</span>{/if}
    <Button variant="quiet" onclick={() => m.remove()}>Delete card</Button>
  </div>
</div>
</Drawer>
