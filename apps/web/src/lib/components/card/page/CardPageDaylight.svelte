<!-- apps/web/src/lib/components/card/page/CardPageDaylight.svelte -->
<script lang="ts">
  /**
   * Daylight's card page (SP-CardPage-Daylight): a window bar on the sky, the head with people and
   * facts, then three columns — the conversation and Talk; what was asked, the brief and the links;
   * what happened and cost — and a foot with the card's actions. Every section key is drawn once
   * (`data-section`); an empty one is a hidden marker.
   */
  import './card-page-daylight.css';
  import '../daylight-states.css';
  import { Button, Face, Field, StageTrack, StateLabel } from '@superjackfruit/vibekit';
  import { app } from '$lib/stores/app.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import { displayAgent, displayPrincipal } from '$lib/names';
  import { clockHM, weekdayDayMonth, whenLabel } from '$lib/when';
  import { isControlRow, isNarrative, visibleActivities } from '$lib/activity-groups';
  import Icon from '$lib/components/parts/Icon.svelte';
  import BrandMark from '$lib/components/BrandMark.svelte';
  import CardEditForm from '../CardEditForm.svelte';
  import DeliveryPanel from '../DeliveryPanel.svelte';
  import LinkAddForm from '../LinkAddForm.svelte';
  import HandoffView from '../HandoffView.svelte';
  import LibraryArtifact from '../LibraryArtifact.svelte';
  import RawJson from '../RawJson.svelte';
  import ToolCallDetails from '../ToolCallDetails.svelte';
  import TokenText from '../TokenText.svelte';
  import SpecValueView from '../SpecValueView.svelte';
  import GateDaylight from '../gate/GateDaylight.svelte';
  import QuestionDaylight from '../question/QuestionDaylight.svelte';
  import CardStateDaylight from '../state/CardStateDaylight.svelte';
  import { specGroups, specRowCount } from '../spec-groups';
  import { referenceSource, refLabel } from '../references';
  import { safeHref } from '../spec-details';
  import { sessionIdOf } from '../tokens';
  import { attemptWord, eventSentence, eventVerb, pillTone, stopLine, stripAria, stripKind, waitingWord } from '../state-words';
  import {
    agentRole, briefSummary, criteriaCount, emptyNoteCaption, handoffLine, initials, linksSummary, pageSmall, planNone,
    planProgress, projectLine, provenanceLine, relatedLine, replySub, RESUME_PLACEHOLDER, subtasksLine, talkSummary, usd, whatHappenedSummary,
  } from '../card-words';
  import { askedHeading } from '../card-words';
  import AccountMenu from './AccountMenu.svelte';
  import type { CardPageProps } from '../layouts/types';

  let { model: m, vibe, phase, personName, gate, question, boardHref }: CardPageProps = $props();
  const card = $derived(m.card!);
  const lead = $derived(m.lead!);
  const editing = $derived(m.edit.editing);
  const name = (id: string | null) => (id ? displayAgent(id, m.agents) : '');
  const agentName = $derived(m.agent.name || 'the agent');
  const lastName = $derived(name(m.lastAgentId));
  const ownerName = $derived(displayPrincipal(card.ownerUserId, app.members));
  const q = $derived(m.provenance);
  const kind = $derived(stripKind(lead, m.archived));
  const tone = $derived(pillTone(card, lead));
  const groups = $derived(specGroups(card.spec, { criteriaHeading: 'Things to prove' }));
  const sid = $derived(sessionIdOf(lead.sentence));
  const runs = $derived([...m.activityGroups].reverse());
  const stageNameOf = (key: string | null) => m.stages.find((s) => s.key === key)?.name ?? key ?? 'Unknown stage';
  const attemptOf = (runId: string) => m.attempts.find((a) => a.runId === runId);
  const attemptNo = (runId: string) => m.attempts.findIndex((a) => a.runId === runId) + 1;
  const stopped = $derived(['stopped', 'failed', 'budget'].includes(lead.kind) && !m.archived);
  const planDone = $derived(m.plan?.filter((s) => s.done).length ?? 0);
  const copiedLink = $derived(m.copied === 'link');
  const delegated = $derived(!!m.delegate.id);
  const worker = $derived(delegated ? m.delegate.name : lastName);
  $effect(() => m.comments.attach());
  // vibekit Field keeps its textarea to itself; the attachment hands it to the resume model, which focuses it.
  const noteRef = (el: Element) => { m.resume.noteEl = el as HTMLTextAreaElement; return () => { if (m.resume.noteEl === el) m.resume.noteEl = undefined; }; };
  function commentKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void m.comments.submit(); }
  }
  let rawOpen = $state(false);
</script>

{#snippet hidden(key: string)}<span hidden data-section={key}></span>{/snippet}

<div class="dp">
  <div class="vk-sky dp-sky" data-phase={phase}>
    <div class="vk-sky__sun" style="top: 92px;"></div>
    <div class="vk-sky__content">
      <nav class="dp-bar" aria-label="Card window">
        <a class="dp-mark" href="/" aria-label="Superpipeline home"><BrandMark class="size-6" /></a>
        <a class="dp-pill" href={boardHref}><Icon name="back" size={18} /> {m.boardName} board</a>
        <span class="dp-idchip">card {m.shortId}<button class="dp-copy" type="button" aria-label="Copy card id {m.shortId}" onclick={() => m.copyId()}><Icon name={m.copied === 'id' ? 'check' : 'copy'} size={16} /></button></span>
        <span style="flex: 1 1 auto;"></span>
        <button class="dp-pill dp-pill--ghost" type="button" onclick={() => m.copyLink()}><Icon name={copiedLink ? 'check' : 'link'} size={18} /> {copiedLink ? 'Link copied' : 'Copy link to this card'}</button>
        <button class="dp-round" type="button" aria-label="Appearance: Daylight, {phase} sky" aria-haspopup="dialog" onclick={() => (appearance.pickerOpen = true)}><Icon name={appearance.theme === 'dark' ? 'moon' : 'sun'} size={20} /></button>
        <AccountMenu triggerClass="dp-acct" label="Account, {personName}. Menu has Sign out" initials={initials(personName)} />
      </nav>

      <header class="dp-head">
        <div style="display: flex; flex-direction: column; gap: var(--vk-space-4); min-width: 0px;">
          <div class="dp-from"><span>Opened from {m.boardName}</span><span aria-hidden="true">·</span><a href={boardHref}>Back to the board</a></div>
          <div class="dp-row" style="align-items: flex-start; flex-wrap: nowrap;">
            <h1 id="card-title" class="dp-title" style="flex: 1 1 0px; min-width: 0px;">{card.title}</h1>
            {#if editing}{@render hidden('editButton')}{:else}<button class="dp-round" type="button" aria-label="Edit card" data-section="editButton" style="flex: 0 0 auto; margin-top: 4px;" onclick={() => m.edit.start()}><Icon name="edit" size={20} /></button>{/if}
          </div>
          {#if editing}<div data-section="editForm"><CardEditForm model={m} /></div>{:else}{@render hidden('editForm')}{/if}
          <div style="display: flex; flex-direction: column; gap: var(--vk-space-2);">
            <StageTrack form="page" stages={m.stages.map((s) => s.name)} current={m.stageIndex} status={m.trackStatus} label={stripAria(m.stageIndex, m.stages.length, m.stageName, kind, 'drawer')} />
            <span style="font: 600 var(--vk-text-sm)/1.3 var(--vk-font-body);">{stopLine(lead, m.stageIndex, m.stages)}</span>
          </div>
        </div>

        <aside class="dp-people" aria-label="People on this card" data-section="status">
          <div class="dp-row" style="justify-content: space-between;"><StateLabel form="pill" state={tone} label={waitingWord(card, lead, m.ageHours, 'desktop')} />{#if card.attemptCount > 1}<span class="dp-small">Attempt {card.attemptCount}</span>{/if}</div>
          {#if worker}
            <div class="dp-person"><Face id={worker} label={worker} mood={delegated ? m.delegate.mood : 'resting'} size={32} ring="mood" /><span><b>{worker}</b><span class="dp-muted">{agentRole({ stageName: stageNameOf(m.attempts.at(-1)?.stageKey ?? card.currentStageKey), attempt: card.attemptCount, delegated })}</span></span></div>
          {/if}
          <div class="dp-person"><span class="dp-initials" aria-hidden="true">{initials(ownerName)}</span><span><b>{ownerName}</b><span class="dp-muted">{app.user?.userId === card.ownerUserId ? 'Owner · you' : 'Owner'}</span></span></div>
          {#if q?.known}
            <div class="dp-person" title={q.byAgent ? `${m.queuedByName}, an agent, with dispatch authority on this board` : undefined}>
              {#if q.byAgent}<Face id={m.queuedByName} label={m.queuedByName} mood="working" size={32} />{:else}<span class="dp-initials" aria-hidden="true">{initials(m.queuedByName)}</span>{/if}
              <span><b>{m.queuedByName}</b><span class="dp-muted">{q.byAgent ? 'Asked for this · an agent allowed to dispatch' : 'Asked for this'}</span></span>
            </div>
          {/if}
          {#if app.user && card.ownerUserId !== app.user.userId && !m.archived}
            <Button variant="quiet" aria-disabled={m.assigning ? 'true' : undefined} onclick={() => { if (!m.assigning) void m.assignToMe(); }}>Assign to me</Button>
            <span class="vk-visually-hidden" role="status">{m.assigning ? 'Assigning…' : ''}</span>
          {/if}
        </aside>

        <div class="dp-facts" data-section="facts">{#each m.facts as f (f.term)}<span>{f.term} <b>{f.value}</b></span>{/each}</div>
      </header>
    </div>
  </div>

  <main class="dp-main" id="content" aria-labelledby="card-title">
    <section class="dp-col" aria-labelledby="h-convo">
      <h2 id="h-convo" class="dp-h">The conversation <small>{pageSmall(lead, agentName)}</small></h2>
      {#if m.localError}<div class="ds-alert" role="alert" data-section="error"><Icon name="alert" size={18} /><div>{m.localError}</div></div>{:else}{@render hidden('error')}{/if}
      {#if !m.detailLoaded}<CardStateDaylight kind="loading" model={m} />{@render hidden('resume')}
      {:else if m.archived}<CardStateDaylight kind="archived" model={m} /><CardStateDaylight kind="restore" model={m} />{@render hidden('resume')}
      {:else if question}<QuestionDaylight model={question.model} elicitation={question.elicitation} agent={question.agent} {vibe} />{@render hidden('resume')}
      {:else if gate}<GateDaylight {...gate} agent={m.agent} {lead} {vibe} />{@render hidden('resume')}
      {:else if lead.kind === 'done'}<CardStateDaylight kind="done" model={m} />{@render hidden('resume')}
      {:else}
        {#if lead.sentence}
          <div class="dp-msg">
            <Face id={agentName} label={agentName} mood={m.agent.mood} size={48} ring="mood" />
            <div class="dp-bubble" style={lead.needsYou ? undefined : 'background: var(--vk-color-raised)'}>
              <span class="dp-who" style={lead.needsYou ? undefined : 'color: var(--vk-color-muted)'}>{agentName}{lead.needsYou ? ' · needs you' : ''}</span>
              <p class="dp-say"><TokenText text={lead.sentence} cls="dp-id" /></p>
              <div class="dp-time">
                {#if lead.at}<span>{whenLabel(lead.at, new Date())}</span>{/if}
                {#if sid}<Button variant="quiet" style="min-height: 44px; font-size: var(--vk-text-sm); margin: -10px 0px;" onclick={() => m.copySessionId(sid)}>{#snippet icon()}<Icon name={m.copied === 'session' ? 'check' : 'copy'} size={14} />{/snippet}Copy session id</Button>{/if}
              </div>
            </div>
          </div>
        {/if}
        {#if stopped && m.resume.show}
          <form class="dp-reply" aria-labelledby="reply-h" data-section="resume" onsubmit={(e) => { e.preventDefault(); if (!m.resume.busy) void m.resume.submit(); }}>
            <div style="display: flex; flex-direction: column; gap: 2px;"><h3 id="reply-h">Send it back to work</h3><p class="dp-sub">{replySub(card, agentName)}</p></div>
            <div class="dp-grid2">
              <Field id="dp-resume-at" label="Resume at stage" control="select" bind:value={m.resume.target}
                options={m.resume.targets.filter((t) => t.allowed).map((t) => ({ value: t.key, label: `${t.n} · ${t.name}${t.current ? ' (this stage)' : ''}` }))} />
              <Field id="dp-note" {@attach noteRef} label="What changed, or what should the agent do differently? It reads this." control="textarea" maxlength={8000} placeholder={RESUME_PLACEHOLDER}
                hint={m.resume.error ? undefined : m.resume.hint} error={m.resume.error || undefined} bind:value={m.resume.note} />
            </div>
            <div class="dp-actions">
              <Button type="submit" aria-disabled={m.resume.busy ? 'true' : undefined}>{#snippet icon()}<Icon name="send" size={18} />{/snippet}Send back to work</Button>
              <span class="vk-visually-hidden" role="status">{m.resume.busy ? 'Sending…' : ''}</span>
              <span class="dp-small">{emptyNoteCaption(agentName)}</span>
            </div>
          </form>
        {:else}{@render hidden('resume')}{/if}
      {/if}

      <section class="dp-card" aria-labelledby="h-talk" data-section="comments">
        <h2 id="h-talk" class="dp-h">Talk <small>{talkSummary(m.comments.comments.length)}</small></h2>
        {#if m.comments.comments.length}<ul class="dp-ul">{#each m.comments.comments as c (c.id)}<li><b>{m.authorName(c.author)}</b> <span style="white-space: break-spaces; overflow-wrap: anywhere">{c.deletedAt ? 'Comment deleted' : c.body}</span></li>{/each}</ul>{/if}
        <p class="dp-small" style="margin: 0px;">The agent that works this card reads every comment.</p>
        <Field id="dp-comment" label="Add a comment" control="textarea" maxlength={8192} style="min-height: 88px;" placeholder="⌘ or Ctrl + Enter posts it" bind:value={m.comments.draft} onkeydown={commentKey} />
        {#if m.comments.error}<p class="vk-field__error" role="alert">{m.comments.error}</p>{/if}
        <Button variant="secondary" style="align-self: flex-start;" aria-disabled={m.comments.posting ? 'true' : undefined} onclick={() => { if (!m.comments.posting) void m.comments.submit(); }}>{#snippet icon()}<Icon name="comment" size={18} />{/snippet}Comment</Button>
        <span class="vk-visually-hidden" role="status">{m.comments.posting ? 'Posting…' : ''}</span>
      </section>
    </section>

    <section class="dp-col" aria-labelledby="h-brief">
      <div class="dp-card">
        <h2 id="h-brief" class="dp-h"><Icon name="pushpin" size={18} /> {askedHeading(m.stages[m.stageIndex], agentName)}</h2>
        {#if card.spec?.description}<p class="dp-p" data-section="description" style="white-space: pre-line">{String(card.spec.description)}</p>{:else}{@render hidden('description')}{/if}
        {#if m.acceptanceCriteria?.length}
          <h3 class="dp-h" style="font-size: var(--vk-text-md);">Done when <small>{criteriaCount(m.acceptanceCriteria.length)}</small></h3>
          <ol class="dp-crit" data-section="criteria">{#each m.acceptanceCriteria as c, i (i)}<li><span class="n">{i + 1}</span><span>{c}</span></li>{/each}</ol>
        {:else}{@render hidden('criteria')}{/if}
      </div>

      <div class="dp-card">
        <h2 class="dp-h">The brief <small>{briefSummary(specRowCount(groups), !!m.plan, !!m.projectName, 'page')}</small></h2>
        {#if groups.length}
          <div data-section="details" data-testid="spec-details" style="display: contents">
            {#each groups as g (g.label)}
              <div class="dp-group"><h4>{g.label}</h4>
                <dl class="dp-dl dp-dl--stack">{#each g.rows as r (r.key)}<dt>{r.label}</dt><dd data-testid="spec-value-{r.key}"><SpecValueView value={r.value} v={{ clamp: 'dp-clamp', more: 'vk-button vk-button--quiet dp-more', matrixLinks: false }} /></dd>{/each}</dl>
              </div>
            {/each}
          </div>
          <div class="dp-row" style="gap: var(--vk-space-4);">
            <button class="dp-rawbtn" type="button" aria-expanded={rawOpen} onclick={() => (rawOpen = !rawOpen)}>{rawOpen ? 'Hide raw JSON' : 'View raw JSON'}</button>
            {#if rawOpen}<Button variant="quiet" style="font-size: var(--vk-text-sm);" onclick={() => m.copySpec()}>{#snippet icon()}<Icon name={m.copied === 'spec' ? 'check' : 'copy'} size={14} />{/snippet}Copy</Button>{/if}
          </div>
          {#if rawOpen}<RawJson value={card.spec} bare />{/if}
        {:else}<span hidden data-section="details"></span>{/if}
        {#if m.plan}<div data-section="plan" style="display: flex; flex-direction: column; gap: var(--vk-space-2);">
          <div class="dp-row" style="justify-content: space-between;"><b>Agent plan</b><span class="dp-small">{m.plan ? planProgress(planDone, m.plan.length) : 'none yet'}</span></div>
          {#if m.plan}<div class="dp-meter"><i style="width: {Math.round((100 * planDone) / m.plan.length)}%;"></i></div><ul class="dp-plan">{#each m.plan as st, i (i)}<li class:done={st.done}><Icon name={st.done ? 'check' : 'chevron-right'} size={14} /><span>{st.text}</span></li>{/each}</ul>
          {:else}<p class="dp-p dp-small">{planNone(m.agent.name)}</p>{/if}
        </div>{:else}<span hidden data-section="plan"></span>{/if}
        <div class="dp-row" style="justify-content: space-between;" data-section="project">
          {#if m.project.editing}
            <span style="flex: 1 1 16rem; min-width: 0px; display: flex; flex-direction: column; gap: var(--vk-space-2);">
              <Field id="dp-project" label="Project" labelHidden control="select" bind:value={m.project.projectId} onchange={() => void m.project.onProjectChange()} options={[{ value: '', label: 'No project' }, ...app.projects.map((p) => ({ value: p.id, label: p.name }))]} />
              <Field id="dp-milestone" label="Milestone" labelHidden control="select" bind:value={m.project.milestoneId} disabled={m.project.projectId === ''} options={[{ value: '', label: 'No milestone' }, ...m.project.milestones.map((ms) => ({ value: ms.id, label: ms.name }))]} />
              {#if m.project.error}<span class="vk-field__error" role="alert">{m.project.error}</span>{/if}
            </span>
            <Button aria-disabled={m.project.saving ? 'true' : undefined} onclick={() => { if (!m.project.saving) void m.project.save(); }}>Save</Button>
            <span class="vk-visually-hidden" role="status">{m.project.saving ? 'Saving…' : ''}</span>
            <Button variant="quiet" onclick={() => m.project.cancel()}>Cancel</Button>
          {:else}
            <span style="flex: 1 1 16rem; min-width: 0px;"><b>Project</b> <span class="dp-small">· {m.projectName ? projectLine(m.projectName, m.milestoneName) : 'none'}</span></span>
            <Button variant="secondary" onclick={() => m.project.start()}>{m.projectName ? 'Change project' : 'Assign to a project'}</Button>
          {/if}
        </div>
      </div>

      <div class="dp-card">
        <h2 class="dp-h">Links and references <small>{linksSummary({ links: m.counts.links, children: m.counts.children, openChildren: m.counts.openChildren, refs: m.counts.refs, related: m.related.items.length }, 'page')}</small></h2>
        <div data-section="links" style="display: contents">
          {#if m.hasAnyLink}
            <ul class="dp-links">{#each [...m.linkGroups.blockedBy, ...m.linkGroups.blocks, ...m.linkGroups.relates, ...m.linkGroups.resolvedBlockedBy] as row (row.title)}<li><span>{row.title}</span> <Button variant="quiet" aria-disabled={m.links.removing.size > 0 ? 'true' : undefined} onclick={() => { if (m.links.removing.size === 0) void m.links.remove(row.remove); }}>Remove</Button></li>{/each}</ul>
          {:else}<p class="dp-p dp-small">Nothing blocks this card and it blocks nothing.</p>{/if}
          {#if m.links.listError}<p class="vk-field__error" role="alert">{m.links.listError}</p>{/if}
          <Button variant="secondary" style="align-self: flex-start;" onclick={() => m.links.openAdd()}>{#snippet icon()}<Icon name="link" size={18} />{/snippet}Add link</Button>
          <LinkAddForm model={m} />
        </div>
        <div data-section="subtasks"><b>Sub-tasks</b> <span class="dp-small">· {subtasksLine(card.openChildCount, m.children.length)}</span>
          {#if m.children.length}<ul class="dp-ul">{#each m.children as c (c.id)}<li><a href="/b/{m.boardId}/c/{c.id}/page">{c.title}</a></li>{/each}</ul>{/if}
        </div>
        <div data-section="references"><b>References</b>
          {#if m.refs.length}
            <ul class="dp-ul dp-refs" style="margin-top: 6px;">
              {#each m.otherRefs as r (r.id)}<li>{#if safeHref(r.url)}<a href={safeHref(r.url)!} target="_blank" rel="noreferrer">{r.title ?? refLabel(r)}</a>{:else}<span>{r.title ?? refLabel(r)}</span>{/if}{#if r.subtitle}<span class="dp-small">{r.subtitle}</span>{/if}<small class="dp-small" style="font-family: var(--vk-font-mono);">{referenceSource(r)}</small></li>{/each}
              {#each m.libraryRefs as l, i (l.ref.id)}<li><LibraryArtifact itemId={l.itemId} version={l.version} title={l.ref.title || l.itemId} open={i === 0} /></li>{/each}
            </ul>
          {:else}<p class="dp-p dp-small" style="margin-top: 4px;">None yet.</p>{/if}
        </div>
        <div data-section="related"><b>Related prior work</b><p class="dp-p dp-small" style="margin-top: 4px;">{relatedLine(m.related.phase, m.related.items.length)}</p>
          {#if m.related.items.length}<ul class="dp-ul">{#each m.related.items as r (r.itemId)}<li>{#if safeHref(r.url)}<a href={safeHref(r.url)!}>{r.title}</a>{:else}{r.title}{/if} <span class="dp-small">· {r.snippet}</span></li>{/each}</ul>{/if}
        </div>
      </div>
    </section>

    <aside class="dp-col" aria-labelledby="h-log">
      <div class="dp-card">
        <h2 id="h-log" class="dp-h">What happened <small>{whatHappenedSummary(m.counts.runs, m.counts.decisions)}</small></h2>
        <div data-section="activity" style="display: contents">
          {#if q?.known}<p class="dp-small" style="margin: 0px;">{provenanceLine({ queuedByName: m.queuedByName, byAgent: q.byAgent, covers: m.grantCovers }, delegated ? m.delegate.name : null)}</p>{/if}
          
          {#each runs as g, ri (g.runId)}
            {@const a = attemptOf(g.runId)}
            {@const who = name(g.agentId) || 'An agent'}
            {@const latestNeeds = ri === 0 && lead.needsYou}
            {@const tools = m.toolsShown(g.runId)}
            {@const view = visibleActivities(g.activities, isNarrative, tools, isControlRow)}
            {@const hiddenCount = g.activities.length - visibleActivities(g.activities, isNarrative, false, isControlRow).rows.length}
            {@const isOpen = m.isRunOpen(g.runId, ri === 0)}
            <div class="dp-run">
              <button class="dp-runhead" type="button" data-attempt-head={g.runId} aria-expanded={isOpen} aria-controls={isOpen ? `dp-run-${g.runId}` : undefined} onclick={() => m.toggleRun(g.runId, ri === 0)}><Face id={who} label={who} mood={latestNeeds ? 'needs' : 'resting'} size={24} /><b>Attempt {attemptNo(g.runId) || runs.length - ri} · {stageNameOf(g.stageKey)}</b><span class:dp-who={latestNeeds}>{a ? attemptWord(a) : (g.outcome ?? 'working')}</span><span class="dp-small">{g.counts.total} events · {g.counts.error} errors{ri > 0 && a?.endedAt ? ` · ${clockHM(a.endedAt)}` : ''}</span></button>
              {#if isOpen}
              <div id="dp-run-{g.runId}">
              <ol class="dp-tl" style="padding: var(--vk-space-2) var(--vk-space-4) 0;">
                {#each view.rows as ev, ei (ev.seq)}
                  <li><Face id={who} label={who} mood={ev.signal === 'stop' ? 'needs' : 'thinking'} size={24} /><span class:stop={ev.signal === 'stop'}><span class="k">{eventVerb(ev)}</span> {eventSentence(ev)}<br /><span class="t">{clockHM(ev.ts)}{ei === view.rows.length - 1 ? ` ${weekdayDayMonth(ev.ts)}` : ''}</span><ToolCallDetails parameter={ev.parameter} result={ev.result} cls="dp-raw" /></span></li>
                {/each}
              </ol>
              {#if hiddenCount > 0 || tools}<div style="padding: 0 var(--vk-space-4) var(--vk-space-3);"><Button variant="quiet" style="font-size: var(--vk-text-sm);" data-attempt-tools={g.runId} pressed={tools} onclick={() => m.toggleTools(g.runId)}>{tools ? 'Hide tool calls' : `Show tool calls · ${hiddenCount} more events`}</Button></div>{/if}
              </div>
              {/if}
            </div>
          {/each}
        </div>
        {#if m.counts.handoff}
          <div class="dp-small" data-section="handoff"><b style="color: var(--vk-color-text);">Handoff from {m.stages[m.stageIndex - 1]?.name ?? 'the last stage'}</b><HandoffView handoff={m.handoff} testid="carried-handoff" /></div>
        {:else}
          <div class="dp-small" data-section="handoff"><b style="color: var(--vk-color-text);">Handoff from {m.stages[m.stageIndex - 1]?.name ?? 'the queue'}</b><br />{handoffLine({ handoff: null, stageIndex: m.stageIndex, stages: m.stages, queuedByName: m.queuedByName || 'someone', createdAt: card.createdAt })}</div>
        {/if}
        {#if m.decidedGates.length}<div class="dp-small" data-section="decisions"><b style="color: var(--vk-color-text);">Decisions</b><br />{#if m.decidedGates.length}{#each m.decidedGates as d (d.id)}{d.decision ?? d.status} at {stageNameOf(d.stageKey)}{d.decidedBy ? ` by ${displayPrincipal(d.decidedBy, app.members)}` : ''}{d.comment ? ` — ${d.comment}` : ''}. {/each}{:else}None yet.{/if}</div>{:else}<span hidden data-section="decisions"></span>{/if}
      </div>

      <div class="dp-card">
        <h2 class="dp-h">Cost and delivery</h2>
        <div data-section="cost" style="display: contents">
          <div><span class="dp-big">{usd(card.costUsd)}</span> <span class="dp-small">· {m.estimate?.estimatedUsd ? `of ${usd(m.estimate.estimatedUsd)} estimated` : 'no estimate yet'}</span></div>
          <div class="dp-meter"><i style="width: {m.costPct}%;"></i></div>
        </div>
        <dl class="dp-dl">
          <div data-section="attempts" style="display: contents">{#each m.attempts as a, i (a.runId)}<dt>Attempt {i + 1}</dt><dd>{name(a.agentId) || 'an agent'} · {usd(a.costUsd)} · {attemptWord(a)}</dd>{/each}</div>
          <div data-section="delivery" style="display: contents"><dt>Delivery</dt><dd>{#if m.counts.deliveryActive}<DeliveryPanel model={m} />{:else}None approved on this card.{/if}</dd></div>
        </dl>
      </div>
    </aside>
  </main>

  <footer class="dp-foot" data-section="cardActions">
    <hr />
    <Button variant="secondary" onclick={() => m.edit.start()}>{#snippet icon()}<Icon name="edit" size={18} />{/snippet}Edit card</Button>
    {#if !m.archived}
      <Button variant="secondary" aria-disabled={m.archiving ? 'true' : undefined} onclick={() => { if (!m.archiving) void m.archive(); }}>{#snippet icon()}<Icon name="archive" size={18} />{/snippet}Archive card</Button>
      <span class="vk-visually-hidden" role="status">{m.archiving ? 'Archiving…' : ''}</span>
    {/if}
    <Button variant="quiet" onclick={() => m.remove()}>{#snippet icon()}<Icon name="trash" size={18} />{/snippet}Delete card</Button>
    <span style="flex: 1 1 auto;"></span>
    <span class="dp-small">Opened from {m.boardName} · <a href={boardHref}>Back to the board</a></span>
  </footer>
</div>
