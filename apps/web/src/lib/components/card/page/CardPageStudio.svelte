<!-- apps/web/src/lib/components/card/page/CardPageStudio.svelte -->
<script lang="ts">
  /** Studio's card page (SP-CardPage-Studio): an annual-report page for one card. */
  import './card-page-studio.css';
  import { Button, faceSvg, StageTrack } from '@superjackfruit/vibekit';
  import { goto } from '$app/navigation';
  import { app } from '$lib/stores/app.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import { displayAgent, displayPrincipal } from '$lib/names';
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
  import { specGroups, specRowCount } from '../spec-groups';
  import { referenceSource, refLabel } from '../references';
  import { safeHref } from '../spec-details';
  import { sessionIdOf, splitTokens } from '../tokens';
  import { eventVerb, STOP_SENTENCE, stripAria, stripKind } from '../state-words';
  import { handoffLine, initials, planNone, projectLine, RESUME_PLACEHOLDER, usd } from '../card-words';
  import {
    commentsCount, cpKicker, figAge, linksSentence, outcomeWord, quoteWhen, runEnded, stageNo, statusItems, stoppedAfter, studioNoteHint,
    studioProvenance, whereWord,
  } from '../studio/studio-format';
  import AccountMenu from './AccountMenu.svelte';
  import type { CardPageProps } from '../layouts/types';

  let { model: m, vibe, gate, question, boardHref }: CardPageProps = $props();
  const card = $derived(m.card!);
  const lead = $derived(m.lead!);
  const editing = $derived(m.edit.editing);
  const name = (id: string | null) => (id ? displayAgent(id, m.agents) : '');
  const agentName = $derived(m.agent.name || 'the agent');
  const lastName = $derived(name(m.lastAgentId));
  const ownerName = $derived(displayPrincipal(card.ownerUserId, app.members));
  const userName = $derived(app.user?.name ?? app.user?.login ?? '');
  const q = $derived(m.provenance);
  const kind = $derived(stripKind(lead, m.archived));
  const groups = $derived(specGroups(card.spec, { criteriaHeading: 'Things to prove' }));
  const rows = $derived(groups.flatMap((g) => g.rows.map((r, i) => ({ ...r, group: g.label, first: i === 0, span: g.rows.length }))));
  const sid = $derived(sessionIdOf(lead.sentence));
  const runs = $derived([...m.activityGroups].reverse());
  const age = $derived(figAge(m.ageHours ?? 0));
  const face = (who: string, mood: 'needs' | 'resting' | 'working' | 'thinking' | 'done', size: number) => faceSvg(who, { mood, size, label: `${who}, ${mood === 'needs' ? 'needs you' : mood}` });
  const stopped = $derived(['stopped', 'failed', 'budget'].includes(lead.kind) && !m.archived);
  let rawOpen = $state(false);
  $effect(() => m.comments.attach());

  // Keyboard (spec §30): Shift+C copy link, G B back, E edit, C comment, ⌘↵ submits a textarea's form.
  let pendingG = 0;
  function onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && t instanceof HTMLTextAreaElement) { e.preventDefault(); t.form?.requestSubmit(); return; }
    if (t && (t.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey)) return;
    if (e.shiftKey && e.key.toLowerCase() === 'c') { e.preventDefault(); void m.copyLink(); return; }
    if (e.key === 'g') { pendingG = Date.now(); return; }
    if (e.key === 'b' && Date.now() - pendingG < 1000) { pendingG = 0; void goto(boardHref); return; }
    if (e.key === 'e') { m.edit.start(); return; }
    if (e.key === 'c') { e.preventDefault(); document.getElementById('cp-comment')?.focus(); }
  }
</script>

<svelte:window onkeydown={onKey} />
{#snippet hidden(key: string)}<span hidden data-section={key}></span>{/snippet}
{#snippet hd(no: number, id: string, title: string, right: import('svelte').Snippet | null)}
  <div class="hd"><span class="no">{stageNo(no - 1)}</span><h2 {id}>{title}</h2><span class="r">{#if right}{@render right()}{/if}</span></div>
{/snippet}

<div class="ar cp" data-vibe="studio">
  <header class="cp-top">
    <a class="mk" href="/" aria-label="Superpipeline home"><Icon name="mark" size={22} /></a>
    <nav class="cp-crumb" aria-label="Breadcrumb">
      <span>Superpipeline</span><span aria-hidden="true">/</span>
      <a href={boardHref}>{m.boardName} board</a><span aria-hidden="true">/</span>
      <span class="id">Card {m.shortId}<button type="button" aria-label="Copy card id {m.shortId}" onclick={() => m.copyId()}><Icon name={m.copied === 'id' ? 'check' : 'copy'} size={14} strokeWidth={1.75} /></button></span>
    </nav>
    <label class="ar-cmd"><span class="sr">Search or run a command</span><span class="box"><Icon name="search" size={18} strokeWidth={1.75} /><input type="search" placeholder="Search or run a command" aria-keyshortcuts="Meta+K" readonly onfocus={() => (app.cmdkOpen = true)} /><span class="kbd" aria-hidden="true">⌘K</span></span></label>
    <button class="cp-tb" type="button" aria-keyshortcuts="Shift+C" onclick={() => m.copyLink()}><Icon name={m.copied === 'link' ? 'check' : 'link'} size={15} strokeWidth={1.75} />{m.copied === 'link' ? 'Link copied' : 'Copy link to this card'} <span class="kbd" aria-hidden="true">⇧C</span></button>
    <button class="cp-ic" type="button" aria-label="Appearance" aria-haspopup="dialog" title="Appearance" onclick={() => (appearance.pickerOpen = true)}><Icon name={appearance.phase === 'night' ? 'moon' : 'sun'} size={20} strokeWidth={1.75} /></button>
    <AccountMenu triggerClass="cp-acct" label="Account, {userName}. Menu has Sign out" initials={initials(userName)} />
  </header>

  <main class="cp-body" id="content">
    {#if m.localError}<p class="cd-p" role="alert" data-section="error">{m.localError}</p>{:else}{@render hidden('error')}{/if}
    <div class="cp-from"><span>Opened from {m.boardName}</span><span aria-hidden="true">·</span><a href={boardHref} aria-keyshortcuts="G B"><Icon name="back" size={15} strokeWidth={1.75} />Back to the board</a><span class="kbd" aria-hidden="true">G B</span></div>
    <div class="cp-head">
      <div style="display: flex; flex-direction: column; gap: 12px; min-width: 0px;">
        <span class="kick" style="display: inline-flex; align-items: center; gap: 8px;"><span class="chip c{Math.min(m.stageIndex + 1, 7)}"></span>{cpKicker(m.shortId, m.stageIndex, m.stageName)}</span>
        <h1>{card.title}</h1>
      </div>
      <button class="ar-btn2" type="button" aria-keyshortcuts="E" data-section="editButton" aria-pressed={editing} onclick={() => m.edit.start()}><Icon name="edit" size={15} strokeWidth={1.75} />Edit <span class="kbd" aria-hidden="true">E</span></button>
    </div>
    {#if editing}<div data-section="editForm"><CardEditForm model={m} /></div>{:else}{@render hidden('editForm')}{/if}
    <div class="ar-figs" data-section="facts">
      <div><b>{m.stageIndex + 1}<small>of {m.stages.length}</small></b><span>Stage</span></div>
      <div><b>{card.attemptCount}</b><span>Attempts</span></div>
      {#if lead.needsYou && !m.archived}<div class="sig"><b>{age.value}<small>{age.unit}</small></b><span>Waiting on you</span></div>{/if}
      <div><b>{age.value}<small>{age.unit}</small></b><span>In {m.stageName}</span></div>
      <div><b class:z={card.costUsd === 0}>{usd(card.costUsd)}</b><span>{m.estimate?.estimatedUsd ? `Cost · of ${usd(m.estimate.estimatedUsd)}` : 'Cost · no estimate'}</span></div>
      <div><b class:z={m.counts.links === 0}>{m.counts.links}</b><span>Blocks</span></div>
      <div><b class:z={m.counts.openChildren === 0}>{m.counts.openChildren}<small>of {m.counts.children}</small></b><span>Sub-tasks open</span></div>
    </div>
    <StageTrack form="page" stages={m.stages.map((s) => s.name)} current={m.stageIndex} status={m.trackStatus} label={stripAria(m.stageIndex, m.stages.length, m.stageName, kind, 'drawer')} />
    <dl class="cp-people" data-section="status">
      <div><dt class="sr">State</dt><dd><span class="cd-pill" class:needs={lead.needsYou && !m.archived}><span class="u" class:needs={lead.needsYou && !m.archived}></span>{m.archived ? 'Archived' : lead.needsYou ? 'Waiting on you' : card.state === 'working' ? 'Working' : 'Queued'}</span></dd></div>
      <div><dt>Agent</dt><dd>{#if m.delegate.id}{@html face(m.delegate.name, 'working', 24)}<span>{m.delegate.name}</span>{:else}{#if lastName}{@html face(lastName, 'resting', 24)}{/if}<span>Unclaimed {#if lastName}<span class="muted" style="font-weight: 400;">({lastName} ran attempt {card.attemptCount})</span>{/if}</span>{/if}</dd></div>
      <div><dt>Owner</dt><dd><span class="ar-ini" aria-hidden="true" style="width: 24px; height: 24px; font-size: 10px;">{initials(ownerName)}</span>{ownerName}</dd></div>
      {#if q?.known}<div title={q.byAgent ? 'An agent with dispatch authority on this board' : undefined}><dt>Asked by</dt><dd>{#if q.byAgent}{@html face(q.queuedByName, 'working', 24)}{/if}{q.queuedByName}</dd></div>{/if}
      <div><dt>Priority</dt><dd>{card.priority > 0 ? `P${card.priority}` : 'none'}</dd></div>
      <div><dt>Due</dt><dd>{card.dueAt ? card.dueAt.slice(0, 10) : 'none'}</dd></div>
      <div><dt>Labels</dt><dd>{m.labels.length ? m.labels.map((l) => l.name).join(', ') : 'none'}</dd></div>
      <div><dt>Project</dt><dd>{m.projectName ?? 'none'}</dd></div>
    </dl>

    <div class="cp-cols">
      <div>
        {#if gate}
          <section class="ar-sec" aria-labelledby="cp-s1">{@render hd(1, 'cp-s1', 'Waiting for your review', null)}<GateStudioFrame gate={gate.gate} agent={m.agent} {lead} {vibe} /></section>
          <section class="ar-sec" aria-labelledby="cp-s2">{@render hd(2, 'cp-s2', 'Your decision', null)}<GateStudioBar boardId={gate.boardId} gate={gate.gate} error={gate.error} onResponse={gate.onResponse} conflict={gate.conflict} onRefresh={gate.onRefresh} /></section>
          {@render hidden('resume')}
        {:else if question}
          <section class="ar-sec" aria-labelledby="cp-s1">{@render hd(1, 'cp-s1', 'Question', null)}<QuestionStudioFrame elicitation={question.elicitation} agent={question.agent} /></section>
          <section class="ar-sec" aria-labelledby="cp-s2">{@render hd(2, 'cp-s2', 'Your answer', null)}<QuestionStudioBar model={question.model} elicitation={question.elicitation} agent={question.agent} /></section>
          {@render hidden('resume')}
        {:else}
          {#snippet copySid()}{#if sid}<button class="ar-lk" type="button" style="min-height: 0px;" onclick={() => m.copySessionId(sid)}><Icon name={m.copied === 'session' ? 'check' : 'copy'} size={14} strokeWidth={1.75} />Copy session id</button>{/if}{/snippet}
          <section class="ar-sec" aria-labelledby="cp-s1">
            {@render hd(1, 'cp-s1', stopped ? 'Why it stopped' : 'What the agent said', copySid)}
            {#if lead.sentence}
              <div class="ar-q cp-q" role="status">
                <h3>{@html face(agentName, lead.needsYou ? 'needs' : 'working', 24)}{agentName}{lead.needsYou ? ' · Stopped · needs you' : ''}{#if lead.at}<span class="mono">{quoteWhen(lead.at, new Date())}</span>{/if}</h3>
                <blockquote>{#each splitTokens(lead.sentence) as p, i (i)}{#if p.token}<code>{p.text}</code>{#if p.text === sid}<sup class="fn">1</sup>{/if}{:else}{p.text}{/if}{/each}</blockquote>
                {#if sid}<div class="ar-pfn"><span class="k">1</span><span>Session <code>{sid}</code></span><button class="ar-lk" type="button" style="padding-right: 0px;" aria-label="Copy session id" onclick={() => m.copySessionId(sid)}><Icon name="copy" size={14} strokeWidth={1.75} />Copy</button></div>{/if}
              </div>
            {/if}
          </section>
          {#if stopped && m.resume.show}
            {#snippet after()}{stoppedAfter(card.attemptCount)}{/snippet}
            <section class="ar-sec" aria-labelledby="cp-s2">
              {@render hd(2, 'cp-s2', 'Send it back to work', after)}
              <form class="cp-form" aria-labelledby="cp-s2" data-section="resume" onsubmit={(e) => { e.preventDefault(); if (!m.resume.busy) void m.resume.submit(); }}>
                <div class="ar-field"><label for="cp-at">Resume at stage</label><select id="cp-at" class="ar-sel" bind:value={m.resume.target}>{#each m.resume.targets.filter((t) => t.allowed) as t (t.key)}<option value={t.key}>{stageNo(t.n - 1)} {t.name}{t.current ? ' (this stage)' : ''}</option>{/each}</select></div>
                <div class="ar-field"><label for="cp-note">Note to {agentName}: what changed, or what to do differently</label><textarea id="cp-note" class="ar-ta" maxlength="8000" aria-describedby="cp-hint" aria-invalid={m.resume.error ? 'true' : undefined} placeholder={RESUME_PLACEHOLDER} bind:this={m.resume.noteEl} bind:value={m.resume.note}></textarea></div>
                <p id="cp-hint" class="ar-hint">{m.resume.error ?? studioNoteHint(m.resume.note.length, agentName, true)}</p>
                <div class="row"><button class="ar-btn" type="submit" aria-disabled={m.resume.busy ? 'true' : undefined}><Icon name="send" size={15} strokeWidth={1.75} />Send back to work <span class="kbd" aria-hidden="true">⌘↵</span></button><span class="vk-visually-hidden" role="status">{m.resume.busy ? 'Sending…' : ''}</span></div>
              </form>
            </section>
          {:else}{@render hidden('resume')}{/if}
        {/if}
        {#snippet talkR()}{commentsCount(m.comments.comments.length)} · <span class="kbd">C</span>{/snippet}
        <section class="ar-sec" aria-labelledby="cp-s3" data-section="comments">
          {@render hd(3, 'cp-s3', 'Talk', talkR)}
          {#if m.comments.comments.length}{#each m.comments.comments as c (c.id)}<p class="cd-p"><b>{m.authorName(c.author)}</b> <span style="white-space: pre-wrap">{c.deletedAt ? 'Comment deleted' : c.body}</span></p>{/each}{:else}<p class="cd-p">No comments yet. The agent that works this card reads them.</p>{/if}
          <div class="ar-field"><label for="cp-comment">Add a comment</label><textarea id="cp-comment" class="ar-ta" maxlength="8192" placeholder="⌘ or Ctrl + Enter posts it" bind:value={m.comments.draft} onkeydown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void m.comments.submit(); } }}></textarea></div>
          {#if m.comments.error}<p class="cd-p" role="alert">{m.comments.error}</p>{/if}
          <div><button class="ar-btn2" type="button" aria-disabled={m.comments.posting ? 'true' : undefined} onclick={() => { if (!m.comments.posting) void m.comments.submit(); }}>Comment</button><span class="vk-visually-hidden" role="status">{m.comments.posting ? 'Posting…' : ''}</span></div>
        </section>
      </div>

      <div>
        {#snippet specR()}{specRowCount(groups)} fields{/snippet}
        <section class="ar-sec" aria-labelledby="cp-s4">
          {@render hd(4, 'cp-s4', 'Spec', specR)}
          <div class="cd-two">
            <div>{#if card.spec?.description}<h3 class="cd-h">Description</h3><p class="cd-p" data-section="description">{String(card.spec.description)}</p>{:else}{@render hidden('description')}{/if}</div>
            <div>{#if m.acceptanceCriteria?.length}<h3 class="cd-h">Acceptance criteria <span class="mono">{m.acceptanceCriteria.length}</span></h3><ol class="cd-ol" data-section="criteria">{#each m.acceptanceCriteria as c, i (i)}<li><span>{c}</span></li>{/each}</ol>{:else}{@render hidden('criteria')}{/if}</div>
          </div>
          {#if m.plan}<div data-section="plan"><h3 class="cd-h">Agent plan</h3>{#if m.plan}<ol class="cd-ol">{#each m.plan as st, i (i)}<li><span>{st.done ? '✓ ' : ''}{st.text}</span></li>{/each}</ol>{:else}<p class="note cd-p">{planNone(m.agent.name)}</p>{/if}</div>{:else}<span hidden data-section="plan"></span>{/if}
          <div data-section="details">
            <div class="cd-acts" style="justify-content: space-between;"><h3 class="cd-h" style="margin: 0px;">Details <span class="mono">{specRowCount(groups)} fields</span></h3><span class="cd-acts"><button class="ar-lk" type="button" aria-expanded={rawOpen} onclick={() => (rawOpen = !rawOpen)}>{rawOpen ? 'Hide raw JSON' : 'View raw JSON'}</button>{#if rawOpen}<button class="ar-lk" type="button" onclick={() => m.copySpec()}><Icon name={m.copied === 'spec' ? 'check' : 'copy'} size={14} strokeWidth={1.75} />Copy</button>{/if}</span></div>
            <table class="cd-dt">
              <caption class="sr">Brief details, {specRowCount(groups)} fields</caption>
              <tbody>{#each rows as r (r.key)}<tr class:g={r.first}>{#if r.first}<th scope="rowgroup" rowspan={r.span}>{r.group}</th>{/if}<th scope="row">{r.label}</th><td data-testid="spec-value-{r.key}"><SpecValueView value={r.value} v={{ clamp: 'cd-clamp', more: 'ar-lk', matrixLinks: false }} /></td></tr>{/each}</tbody>
            </table>
            {#if rawOpen}<RawJson value={card.spec} bare />{/if}
          </div>
          <div class="cd-acts" data-section="project">
            {#if m.project.editing}
              <select class="ar-sel" aria-label="Project" bind:value={m.project.projectId} onchange={() => void m.project.onProjectChange()}><option value="">No project</option>{#each app.projects as p (p.id)}<option value={p.id}>{p.name}</option>{/each}</select>
              <button class="ar-lk" type="button" aria-disabled={m.project.saving ? 'true' : undefined} onclick={() => { if (!m.project.saving) void m.project.save(); }}>Save</button><span class="vk-visually-hidden" role="status">{m.project.saving ? 'Saving…' : ''}</span><button class="ar-lk" type="button" onclick={() => m.project.cancel()}>Cancel</button>
            {:else}
              <span style="flex: 1 1 16rem; min-width: 0px;"><span class="kick">Project</span> {m.projectName ? projectLine(m.projectName, m.milestoneName) : 'none'}</span><button class="ar-lk" type="button" onclick={() => m.project.start()}>{m.projectName ? 'Change project' : 'Assign to a project'}</button>
            {/if}
          </div>
        </section>
        {#snippet linksR()}{m.counts.links + m.counts.children + m.counts.refs} · <button class="ar-lk" type="button" style="min-height: 0px;" onclick={() => m.links.openAdd()}><Icon name="link" size={14} strokeWidth={1.75} />Add link</button>{/snippet}
        <section class="ar-sec" aria-labelledby="cp-s5">
          {@render hd(5, 'cp-s5', 'Links', linksR)}
          <LinkAddForm model={m} />
          <table class="cd-dt cd-refs">
            <thead><tr><th scope="col" style="width: 84px;">Kind</th><th scope="col">Card or reference</th><th scope="col" style="width: 76px;">Where</th><th scope="col" style="width: 44px;"><span class="sr">Actions</span></th></tr></thead>
            <tbody>
              {#each [...m.linkGroups.blockedBy, ...m.linkGroups.blocks, ...m.linkGroups.relates] as row, i (row.title)}<tr data-section={i === 0 ? 'links' : undefined}><td>Card</td><td>{row.title}</td><td>This board</td><td><button class="ar-lk" type="button" onclick={() => m.links.remove(row.remove)}>Remove</button></td></tr>{/each}
              {#each m.otherRefs as r, i (r.id)}<tr data-section={i === 0 ? 'references' : undefined}><td>Reference</td><td>{#if safeHref(r.url)}<a class="ttl" href={safeHref(r.url)!}>{r.title ?? refLabel(r)}</a>{:else}{r.title ?? refLabel(r)}{/if} <span class="muted mono">{referenceSource(r)}</span></td><td>{whereWord(r.url)}</td><td></td></tr>{/each}
            </tbody>
          </table>
          {#if !m.hasAnyLink}{@render hidden('links')}{/if}
          {#if m.otherRefs.length === 0}{@render hidden('references')}{/if}
          <p class="cd-p"><span data-section="subtasks">Sub-tasks {card.openChildCount} open of {m.children.length}</span> · <span data-section="related">{linksSentence(card.openChildCount, m.children.length, m.related.items.length).split(' · ')[1]}</span></p>
        </section>
      </div>

      <div>
        {#snippet logR()}{m.counts.runs} run{m.counts.runs === 1 ? '' : 's'}{/snippet}
        <section class="ar-sec" aria-labelledby="cp-s6">
          {@render hd(6, 'cp-s6', 'Log', logR)}
          <div data-section="activity" style="display: contents">
            {#if q?.known}<p class="cd-p"><span class="kick">Provenance</span> {studioProvenance(q.queuedByName, q.byAgent, m.grantCovers, !!m.delegate.id)}</p>{/if}
            <table class="cd-dt">
              <thead><tr><th scope="col" style="width: 40px;">Run</th><th scope="col">Agent</th><th scope="col" style="width: 74px;">Outcome</th><th scope="col" style="width: 36px;">Ev</th><th scope="col" style="width: 92px;">Ended</th></tr></thead>
              <tbody>{#each runs as g, ri (g.runId)}{@const a = m.attempts.find((x) => x.runId === g.runId)}{@const who = name(g.agentId) || 'An agent'}{@const no = (m.attempts.findIndex((x) => x.runId === g.runId) + 1) || runs.length - ri}{@const isOpen = m.isRunOpen(g.runId, ri === 0)}<tr><td class="m"><button class="ar-run" type="button" data-attempt-head={g.runId} aria-expanded={isOpen} aria-controls="cp-run-{g.runId}" aria-label="Run {no}, {isOpen ? 'hide' : 'show'} its log" onclick={() => m.toggleRun(g.runId, ri === 0)}>#{no}</button></td><td><span class="ag">{@html face(who, ri === 0 && lead.needsYou ? 'needs' : 'resting', 20)}{who}</span></td><td class:sigt={ri === 0 && lead.needsYou}>{a ? outcomeWord(a) : 'Running'}</td><td class="m">{g.counts.total}</td><td class="m">{a?.endedAt ? runEnded(a.endedAt) : '—'}</td></tr>{/each}</tbody>
            </table>
            {#each runs as g, ri (g.runId)}
              {#if m.isRunOpen(g.runId, ri === 0)}
                {@const tools = m.toolsShown(g.runId)}
                {@const view = visibleActivities(g.activities, isNarrative, tools, isControlRow)}
                <div id="cp-run-{g.runId}">
                  <div class="cd-acts" style="justify-content: space-between;"><h3 class="cd-h" style="margin: 0px;">{ri === 0 ? 'Latest run' : `Run #${(m.attempts.findIndex((x) => x.runId === g.runId) + 1) || runs.length - ri}`} <span class="mono">{m.stages.find((s) => s.key === g.stageKey)?.name ?? g.stageKey} · {g.counts.error} errors</span></h3>{#if tools || (g.counts.action > 0 && !view.shownBecauseNoNarrative)}<button class="ar-lk" type="button" data-attempt-tools={g.runId} aria-pressed={tools} onclick={() => m.toggleTools(g.runId)}>{tools ? 'Hide tool calls' : 'Show tool calls'}</button>{/if}</div>
                  <table class="cd-dt cd-ev"><tbody>{#each view.rows as ev, ei (ev.seq)}<tr><td class="m" style={ei === 0 ? 'width: 52px;' : undefined}>{clockHM(ev.ts)}</td><td><span class:sigt={ev.signal === 'stop'}>{eventVerb(ev)}.</span> {ev.signal === 'stop' && ri === 0 ? STOP_SENTENCE : ev.body}<ToolCallDetails parameter={ev.parameter} result={ev.result} cls="cd-details" /></td></tr>{/each}</tbody></table>
                </div>
              {/if}
            {/each}
          </div>
          {#if m.counts.handoff}<div data-section="handoff"><span class="kick">Handoff</span><HandoffView handoff={m.handoff} testid="carried-handoff" /></div>
          {:else}<p class="cd-p" data-section="handoff"><span class="kick">Handoff</span> {handoffLine({ handoff: null, stageIndex: m.stageIndex, stages: m.stages, queuedByName: q?.queuedByName ?? 'someone', createdAt: card.createdAt })}</p>{/if}
          {#if m.decidedGates.length}<p class="cd-p" data-section="decisions"><span class="kick">Decisions</span> {m.decidedGates.length ? m.decidedGates.map((d) => `${d.decision ?? d.status} at ${d.stageKey}`).join('; ') : 'None yet.'}</p>{:else}<span hidden data-section="decisions"></span>{/if}
        </section>
        {#snippet costR()}{usd(card.costUsd)}{/snippet}
        <section class="ar-sec" aria-labelledby="cp-s7">
          {@render hd(7, 'cp-s7', 'Cost', costR)}
          <div data-section="cost" style="display: contents">
            <div class="ar-figs" style="grid-auto-flow: row; border-bottom: 0px;"><div><b class:z={card.costUsd === 0}>{usd(card.costUsd)}</b><span>{m.estimate?.estimatedUsd ? `of ${usd(m.estimate.estimatedUsd)}` : 'no estimate yet'}</span></div></div>
            <div class="cd-meter" aria-hidden="true">{#each [0, 1, 2, 3] as i (i)}<i class:off={m.costPct <= i * 25}></i>{/each}</div>
          </div>
          <table class="cd-dt" data-section="attempts"><thead><tr><th scope="col" style="width: 64px;">Attempt</th><th scope="col">Agent</th><th scope="col" style="width: 60px;">Spent</th><th scope="col">Outcome</th></tr></thead><tbody>{#each m.attempts as a, i (a.runId)}<tr><td class="m">{i + 1}</td><td>{name(a.agentId)}</td><td class="m">{usd(a.costUsd)}</td><td>{outcomeWord(a)}</td></tr>{/each}</tbody></table>
          {#if m.counts.deliveryActive}<div data-section="delivery"><DeliveryPanel model={m} /></div>{:else}<p class="cd-p" data-section="delivery">Delivery: none approved on this card.</p>{/if}
        </section>
        <section class="ar-sec" aria-labelledby="cp-s8">
          {@render hd(8, 'cp-s8', 'Card actions', null)}
          <div class="cd-acts" data-section="cardActions">
            {#if !m.archived}<button class="ar-btn2" type="button" aria-disabled={m.archiving ? 'true' : undefined} onclick={() => { if (!m.archiving) void m.archive(); }}><Icon name="archive" size={15} strokeWidth={1.75} />Archive card</button><span class="vk-visually-hidden" role="status">{m.archiving ? 'Archiving…' : ''}</span>{/if}
            <Button variant="quiet" onclick={() => m.remove()}>Delete card</Button>
          </div>
        </section>
      </div>
    </div>
  </main>
  <footer class="ar-status">
    <span><span class="ar-live" style="font-size: 11px;"><i aria-hidden="true"></i>{app.connected || app.syncedAt ? 'Live' : 'Reconnecting'}</span></span>
    {#each statusItems({ shortId: m.shortId, i: m.stageIndex, n: m.stages.length, stageName: m.stageName, needsYou: lead.needsYou && !m.archived, ageHours: m.ageHours, syncedAt: app.syncedAt?.toISOString() ?? null }) as it (it.text)}<span class:sig={it.signal}>{it.text}</span>{/each}
    <span class="r"><span>E edit</span><span>{gate ? 'C request changes' : 'C comment'}</span><span>⌘↵ send</span><span>G B back to the board</span></span>
  </footer>
</div>
