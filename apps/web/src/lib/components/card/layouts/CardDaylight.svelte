<!-- apps/web/src/lib/components/card/layouts/CardDaylight.svelte -->
<script lang="ts">
  /**
   * Daylight's card drawer (SP-Card-Daylight): a conversation. Head (board · stage, title, stage
   * strip, state chips, facts), then the pinned brief, the agent's words and the reply, then five
   * sections — The brief (open), What happened, Links and references, Talk, Cost and delivery.
   * Every section key is drawn once (`data-section`); an empty one is a hidden marker.
   */
  import { tick } from 'svelte';
  import './card-daylight.css';
  import '../daylight-states.css';
  import { Button, Drawer, Face, Field, IconButton, StageTrack, StateLabel } from '@superjackfruit/vibekit';
  import { CARD_LAYOUTS } from '$lib/layouts';
  import CardMoveMenu from '$lib/components/board/CardMoveMenu.svelte';
  import { app } from '$lib/stores/app.svelte';
  import { displayAgent, displayPrincipal } from '$lib/names';
  import { clockHM, whenLabel } from '$lib/when';
  import { isControlRow, isNarrative, visibleActivities } from '$lib/activity-groups';
  import Icon from '$lib/components/parts/Icon.svelte';
  import HandoffView from '../HandoffView.svelte';
  import RawJson from '../RawJson.svelte';
  import ToolCallDetails from '../ToolCallDetails.svelte';
  import LibraryArtifact from '../LibraryArtifact.svelte';
  import CardEditForm from '../CardEditForm.svelte';
  import DeliveryPanel from '../DeliveryPanel.svelte';
  import LinkAddForm from '../LinkAddForm.svelte';
  import TokenText from '../TokenText.svelte';
  import SpecValueView from '../SpecValueView.svelte';
  import GateDaylight from '../gate/GateDaylight.svelte';
  import QuestionDaylight from '../question/QuestionDaylight.svelte';
  import CardStateDaylight from '../state/CardStateDaylight.svelte';
  import { specGroups, specRowCount } from '../spec-groups';
  import { refLabel, referenceSource } from '../references';
  import { safeHref } from '../spec-details';
  import { sessionIdOf } from '../tokens';
  import { attemptWord, eventSentence, eventVerb, pillTone, stopLine, stripAria, stripKind, waitingWord } from '../state-words';
  import {
    askedByTitle, attemptsLine, briefMeta, briefSummary, costSummary, emptyNoteCaption, handoffLine, initials,
    linksSummary, ownerChip, planNone, planProgress, projectLine, provenanceLine, relatedLine, replySub, RESUME_PLACEHOLDER,
    subtasksLine, talkSummary, usd, whatHappenedSummary,
  } from '../card-words';
  import { askedHeading } from '../card-words';
  import { focusInPlace, openAtTop } from '../open-at-top';
  import type { CardLayoutProps } from './types';

  let { model: m, vibe, gate, question, pageHref, onClose }: CardLayoutProps = $props();

  const card = $derived(m.card!);
  const lead = $derived(m.lead!);
  const editing = $derived(m.edit.editing);
  let moving = $state(false);
  const name = (id: string | null) => (id ? displayAgent(id, m.agents) : '');
  const agentName = $derived(m.agent.name || 'the agent');
  const lastName = $derived(name(m.lastAgentId));
  const ownerName = $derived(displayPrincipal(card.ownerUserId, app.members));
  const q = $derived(m.provenance);
  const kind = $derived(stripKind(lead, m.archived));
  const tone = $derived(pillTone(card, lead));
  const groups = $derived(specGroups(card.spec, { criteriaHeading: 'Acceptance criteria' }));
  const rowCount = $derived(specRowCount(groups));
  const sid = $derived(sessionIdOf(lead.sentence));
  const runs = $derived([...m.activityGroups].reverse());
  const attemptOf = (runId: string) => m.attempts.find((a) => a.runId === runId);
  const stageNameOf = (key: string | null) => m.stages.find((s) => s.key === key)?.name ?? key ?? 'Unknown stage';
  const stopped = $derived(['stopped', 'failed', 'budget'].includes(lead.kind) && !m.archived);
  const planDone = $derived(m.plan?.filter((s) => s.done).length ?? 0);
  const LINK_LABEL = { blockedBy: 'Blocked by', resolvedBlockedBy: 'Blocked by (resolved)', blocks: 'Blocks', relates: 'Relates to', supersedes: 'Supersedes', advisory: 'On other boards (advisory)' } as const;

  // The pinned brief folds while the agent needs you; re-decided only when the card or that changes.
  let rawOpen = $state(false);
  let briefOpen = $state(false);
  let briefFor = '';
  $effect(() => {
    const k = `${card.id}:${lead.needsYou}`;
    if (k !== briefFor) { briefFor = k; briefOpen = !lead.needsYou; }
  });

  // Which sections are open, remembered per card for the tab's life.
  type Sec = 'brief' | 'happened' | 'links' | 'talk' | 'cost';
  const DEFAULT_OPEN: Record<Sec, boolean> = { brief: true, happened: false, links: false, talk: false, cost: false };
  let open = $state<Record<Sec, boolean>>({ ...DEFAULT_OPEN });
  let openFor = '';
  $effect(() => {
    const id = card.id;
    if (id === openFor) return;
    openFor = id;
    try {
      open = { ...DEFAULT_OPEN, ...(JSON.parse(sessionStorage.getItem(`sp:card-open:${id}`) ?? '{}') as Partial<Record<Sec, boolean>>) };
    } catch {
      open = { ...DEFAULT_OPEN };
    }
  });
  function saveOpen(): void {
    try { sessionStorage.setItem(`sp:card-open:${card.id}`, JSON.stringify(open)); } catch { /* private window: forget it */ }
  }

  $effect(() => m.comments.attach());
  // vibekit Field keeps its textarea to itself; the attachment hands it to the resume model, which focuses it.
  const noteRef = (el: Element) => { m.resume.noteEl = el as HTMLTextAreaElement; return () => { if (m.resume.noteEl === el) m.resume.noteEl = undefined; }; };
  function commentKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void m.comments.submit(); }
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

{#snippet sec(id: Sec, title: string, sum: string, body: import('svelte').Snippet)}
  <details class="dd-sec" bind:open={open[id]} ontoggle={saveOpen}>
    <summary><h3>{title}</h3><span class="sum">{sum}</span><span class="tw"><Icon name="chevron-right" size={18} /></span></summary>
    <div class="dd-secbody">{@render body()}</div>
  </details>
{/snippet}

{#snippet tools()}
  <Button variant="tool" href={pageHref} target="_blank" rel="noopener" aria-label="Open in new window">{#snippet icon()}<Icon name="open-window" size={18} />{/snippet}Open in new window</Button>
  <span style="position: relative;">
    <IconButton label="Move {card.title} to another stage" expanded={moving} onclick={() => (moving = !moving)}>{#snippet icon()}<Icon name="move" size={20} />{/snippet}</IconButton>
    <CardMoveMenu {card} stages={m.stages} bare bind:open={moving} />
  </span>
{/snippet}

{#snippet aside()}
  {#if editing}{@render hidden('editButton')}{:else}<IconButton label="Edit card" data-section="editButton" onclick={() => m.edit.start()}>{#snippet icon()}<Icon name="edit" size={20} />{/snippet}</IconButton>{/if}
{/snippet}

<Drawer open={true} head="stacked" title={card.title} eyebrow="{m.boardName} · {m.stageName}" eyebrowTone={lead.needsYou && !m.archived ? 'needs' : 'muted'} width={CARD_LAYOUTS.daylight.width} {tools} {aside} onclose={onClose}>
<!-- data-autofocus: the Drawer opens with focus at the card itself, not on its first tool (the reference is drawn unfocused). -->
<div class="dd-card" tabindex="-1" data-autofocus {@attach openAtTop}>
  <header class="dd-head">
    {#if editing}
      <div data-section="editForm"><CardEditForm model={m} /></div>
      {@render hidden('status')}{@render hidden('facts')}
    {:else}
      {@render hidden('editForm')}
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <StageTrack stages={m.stages.map((s) => s.name)} current={m.stageIndex} state={stopped ? 'stopped' : 'current'} label={stripAria(m.stageIndex, m.stages.length, m.stageName, kind, 'drawer')} />
        <span class="dd-small">{stopLine(lead, m.stageIndex, m.stages)}</span>
      </div>
      <div class="dd-row" style="gap: var(--vk-space-2);" data-section="status">
        <StateLabel form="pill" state={tone} label={waitingWord(card, lead, m.ageHours, 'desktop')} />
        {#if m.chip}
          <span class="dd-chip">
            {#if m.delegate.id}<Face id={m.delegate.name} label={m.delegate.name} mood={m.delegate.mood} size={24} />{:else}<Face id={lastName} label={lastName} mood="resting" size={24} />{/if}
            <span>{m.chip}</span>
          </span>
        {/if}
        <span class="dd-chip"><span class="dd-initials" aria-hidden="true">{initials(ownerName)}</span><span>{ownerChip(ownerName)}</span></span>
        {#if q?.known}
          <span class="dd-chip" class:dd-chip--plain={!q.byAgent} title={askedByTitle(m.queuedByName, q.byAgent, q.grantSize)}>
            {#if q.byAgent}<Face id={m.queuedByName} label={m.queuedByName} mood="working" size={24} />{/if}<span>Asked by {m.queuedByName}</span>
          </span>
        {/if}
        {#if app.user && card.ownerUserId !== app.user.userId && !m.archived}
          <button class="vk-button vk-button--quiet" type="button" disabled={m.assigning} onclick={() => m.assignToMe()}>{m.assigning ? 'Assigning…' : 'Assign to me'}</button>
        {/if}
      </div>
      <div class="dd-facts" data-section="facts">
        {#each m.facts as f (f.term)}<span>{f.term} <b>{f.value}</b></span>{/each}
        <span class="dd-meta">card {m.shortId}<button class="dd-copy" type="button" aria-label="Copy card id {m.shortId}" onclick={() => m.copyId()}><Icon name={m.copied === 'id' ? 'check' : 'copy'} size={14} /></button></span>
      </div>
    {/if}
  </header>

  <!-- `dw-body` stays as the e2e suite's hook for "no sideways scroll". -->
  <div class="dd-body dw-body" style="overflow-wrap: anywhere">
    {#if m.localError}<div class="ds-alert" role="alert" data-section="error"><Icon name="alert" size={18} /><div>{m.localError}</div></div>{:else}{@render hidden('error')}{/if}
    {#if m.archived}<CardStateDaylight kind="archived" model={m} />{/if}

    <details class="dd-pinned" bind:open={briefOpen}>
      <summary aria-label={askedHeading(m.stages[m.stageIndex], agentName)}><Icon name="pushpin" size={18} /><span>{askedHeading(m.stages[m.stageIndex], agentName)}</span><span class="more">{briefMeta(!!card.spec?.description, m.counts.criteria, briefOpen)}</span></summary>
      <div style="padding: 0 var(--vk-space-4) var(--vk-space-4); display: flex; flex-direction: column; gap: var(--vk-space-3);">
        {#if card.spec?.description}<p class="dd-p" data-section="description" style="white-space: pre-line">{String(card.spec.description)}</p>{:else}{@render hidden('description')}{/if}
        {#if m.acceptanceCriteria?.length}
          <b>Acceptance criteria</b>
          <ul class="dd-ul" data-section="criteria">{#each m.acceptanceCriteria as c, i (i)}<li>{c}</li>{/each}</ul>
        {:else}{@render hidden('criteria')}{/if}
      </div>
    </details>

    {#if !m.detailLoaded}
      <CardStateDaylight kind="loading" model={m} />
      {@render hidden('resume')}
    {:else if m.archived}
      <CardStateDaylight kind="restore" model={m} />
      {@render hidden('resume')}
    {:else if question}
      <QuestionDaylight model={question.model} elicitation={question.elicitation} agent={question.agent} {vibe} />
      {@render hidden('resume')}
    {:else if gate}
      <GateDaylight {...gate} agent={m.agent} {lead} {vibe} />
      {@render hidden('resume')}
    {:else if lead.kind === 'done'}
      <CardStateDaylight kind="done" model={m} />
      {@render hidden('resume')}
    {:else}
      {#if lead.sentence}
        <div class="dd-msg">
          <Face id={agentName} label={agentName} mood={m.agent.mood} size={40} ring="mood" />
          <div class="dd-bubble" class:plain={!lead.needsYou}>
            <span class="dd-who">{agentName}{lead.needsYou ? ' · needs you' : ''}</span>
            <p class="dd-say"><TokenText text={lead.sentence} cls="dd-id" /></p>
            <div class="dd-time">
              {#if lead.at}<span>{whenLabel(lead.at, new Date())}</span>{/if}
              {#if sid}<button class="vk-button vk-button--quiet" type="button" style="min-height: 44px; font-size: var(--vk-text-sm); margin: -10px 0px;" onclick={() => m.copySessionId(sid)}><Icon name={m.copied === 'session' ? 'check' : 'copy'} size={14} /> Copy session id</button>{/if}
            </div>
          </div>
        </div>
      {/if}
      {#if stopped && m.resume.show}
        <form class="dd-reply" aria-labelledby="reply-h" data-section="resume" onsubmit={(e) => { e.preventDefault(); void m.resume.submit(); }}>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <h3 id="reply-h">Send it back to work</h3>
            <p class="dd-sub">{replySub(card, agentName)}</p>
          </div>
          <div class="dd-grid2">
            <Field id="dd-resume-at" label="Resume at stage" control="select" bind:value={m.resume.target}
              options={m.resume.targets.filter((t) => t.allowed).map((t) => ({ value: t.key, label: `${t.n} · ${t.name}${t.current ? ' (this stage)' : ''}` }))} />
            <Field id="dd-note" {@attach noteRef} label="What changed, or what should the agent do differently? It reads this." control="textarea" maxlength={8000}
              hint={m.resume.error ? undefined : m.resume.hint} error={m.resume.error || undefined} placeholder={RESUME_PLACEHOLDER} bind:value={m.resume.note} />
          </div>
          <div class="dd-actions">
            <button class="vk-button vk-button--primary" type="submit" aria-disabled={m.resume.busy ? 'true' : undefined}><Icon name="send" size={18} /> Send back to work</button>
            <span class="vk-visually-hidden" role="status">{m.resume.busy ? 'Sending…' : ''}</span>
            <span class="dd-small">{emptyNoteCaption(agentName)}</span>
          </div>
        </form>
      {:else}{@render hidden('resume')}{/if}
    {/if}

    <div>
      {#snippet briefBody()}
        {#if groups.length}
          <div class="dd-groups" data-section="details" data-testid="spec-details">
            {#each groups as g (g.label)}
              <div class="dd-group">
                <h4>{g.label}</h4>
                <dl class="dd-dl">
                  {#each g.rows as r (r.key)}<div><dt>{r.label}</dt><dd data-testid="spec-value-{r.key}"><SpecValueView value={r.value} v={{ more: 'dd-more', id: 'dd-id', link: 'dd-link', matrixLinks: true }} /></dd></div>{/each}
                </dl>
              </div>
            {/each}
          </div>
          <div class="dd-row" style="gap: var(--vk-space-5);">
            <button class="dd-rawbtn" type="button" aria-expanded={rawOpen} onclick={() => (rawOpen = !rawOpen)}>{rawOpen ? 'Hide raw JSON' : 'View raw JSON'}</button>
            {#if rawOpen}<button class="vk-button vk-button--quiet" type="button" style="font-size: var(--vk-text-sm);" onclick={() => m.copySpec()}><Icon name={m.copied === 'spec' ? 'check' : 'copy'} size={18} /> Copy</button>{/if}
          </div>
          {#if rawOpen}<RawJson value={card.spec} bare />{/if}
        {:else}<p class="dd-small" data-section="details" style="margin: 0px;">No other details.</p>{/if}
        <div class="dd-twocol">
          <div data-section="plan" style="display: flex; flex-direction: column; gap: var(--vk-space-2);">
            <div class="dd-row" style="justify-content: space-between;"><b>Agent plan</b><span class="dd-small">{m.plan ? planProgress(planDone, m.plan.length) : 'none yet'}</span></div>
            {#if m.plan}
              <div class="dd-meter"><i style="width: {Math.round((100 * planDone) / m.plan.length)}%;"></i></div>
              <ul class="dd-plan">{#each m.plan as step, i (i)}<li class:done={step.done}><Icon name={step.done ? 'check' : 'chevron-right'} size={14} /><span>{step.text}</span></li>{/each}</ul>
            {:else}<p class="dd-small" style="margin: 0px;">{planNone(m.agent.name)}</p>{/if}
          </div>
          <div data-section="project" style="display: flex; flex-direction: column; gap: var(--vk-space-2);">
            <b>Project</b>
            {#if m.project.editing}
              <div class="dd-projform" data-project-form>
              <Field id="dd-project" label="Project" control="select" bind:value={m.project.projectId} onchange={() => void m.project.onProjectChange()}
                options={[{ value: '', label: 'No project' }, ...app.projects.map((p) => ({ value: p.id, label: p.name }))]} />
              <Field id="dd-milestone" label="Milestone" control="select" bind:value={m.project.milestoneId} disabled={m.project.projectId === ''}
                options={[{ value: '', label: 'No milestone' }, ...m.project.milestones.map((ms) => ({ value: ms.id, label: ms.name }))]} />
              {#if m.project.error}<p class="vk-field__error" role="alert">{m.project.error}</p>{/if}
              <div class="dd-row"><button class="vk-button vk-button--primary" type="button" disabled={m.project.saving} onclick={() => m.project.save()}>{m.project.saving ? 'Saving…' : 'Save'}</button><button class="vk-button vk-button--quiet" type="button" onclick={() => m.project.cancel()}>Cancel</button></div>
              </div>
            {:else}
              <span style="font-size: var(--vk-text-sm); line-height: 1.45;">{m.projectName ? projectLine(m.projectName, m.milestoneName) : 'No project.'}</span>
              <button class="vk-button vk-button--secondary" type="button" style="align-self: flex-start;" onclick={() => m.project.start()}>{m.projectName ? 'Change project' : 'Assign to a project'}</button>
            {/if}
          </div>
        </div>
      {/snippet}
      {@render sec('brief', 'The brief', briefSummary(rowCount, !!m.plan, !!m.projectName, 'drawer'), briefBody)}

      {#snippet happenedBody()}
        <div data-section="activity" style="display: contents">
          <div class="dd-row" style="justify-content: space-between;">
            {#if q?.known}<span class="dd-small">{provenanceLine({ queuedByName: m.queuedByName, byAgent: q.byAgent, covers: m.grantCovers }, m.delegate.id ? m.delegate.name : null)}</span>{/if}
          </div>
          {#if runs.length === 0}<p class="dd-small" style="margin: 0px;">No recorded activity yet — this card hasn't been worked.</p>{/if}
          {#each runs as g, ri (g.runId)}
            {@const a = attemptOf(g.runId)}
            {@const who = name(g.agentId) || 'An agent'}
            {@const latestNeeds = ri === 0 && lead.needsYou}
            {@const tools = m.toolsShown(g.runId)}
            {@const view = visibleActivities(g.activities, isNarrative, tools, isControlRow)}
            {@const entry = m.stageByRun.get(g.runId)}
            {@const isOpen = m.isRunOpen(g.runId, ri === 0)}
            <div class="dd-run" data-attempt={g.runId}>
              <button class="dd-runhead" type="button" data-attempt-head={g.runId} aria-expanded={isOpen} aria-controls="dd-run-{g.runId}" onclick={() => m.toggleRun(g.runId, ri === 0)}><Face id={who} label={who} mood={latestNeeds ? 'needs' : 'resting'} size={24} /><b>{stageNameOf(g.stageKey)} · {who}</b><span class:dd-who={latestNeeds}>{a ? attemptWord(a) : (g.outcome ?? 'working')}</span><span>attempt {(m.attempts.findIndex((x) => x.runId === g.runId) + 1) || runs.length - ri}</span><span class="dd-small">{g.counts.total} events · {g.counts.error} errors</span><span class="tw" aria-hidden="true"><Icon name="chevron-right" size={18} /></span></button>
              {#if isOpen}
              <div id="dd-run-{g.runId}">
              <ul class="dd-ev">
                {#each view.rows as ev (ev.seq)}
                  <li>
                    <Face id={who} label={who} mood={ev.signal === 'stop' ? 'needs' : 'working'} size={24} />
                    <span class:stop={ev.signal === 'stop'}><span class="k">{eventVerb(ev)}</span> {eventSentence(ev)}<ToolCallDetails parameter={ev.parameter} result={ev.result} cls="dd-raw" /></span>
                    <span class="t">{clockHM(ev.ts)}</span>
                  </li>
                {/each}
              </ul>
              {#if tools || (g.counts.action > 0 && !view.shownBecauseNoNarrative)}<div style="padding: 0 var(--vk-space-4) var(--vk-space-3);"><button class="vk-button vk-button--quiet" type="button" style="font-size: var(--vk-text-sm);" data-attempt-tools={g.runId} aria-pressed={tools} onclick={() => m.toggleTools(g.runId)}>{tools ? 'Hide tool calls' : 'Show tool calls'}</button></div>{/if}
              {#if entry?.failureReason}<p class="dd-small" style="margin: 0 var(--vk-space-4) var(--vk-space-3);">{entry.failureReason}</p>
              {:else if entry && entry.handoff && typeof entry.handoff === 'object' && Object.keys(entry.handoff).length}<div style="padding: 0 var(--vk-space-4) var(--vk-space-3);"><HandoffView handoff={entry.handoff} testid="handed-on-{g.runId}" /></div>{/if}
              </div>
              {/if}
            </div>
          {/each}
        </div>
        {#if m.decidedGates.length}
          <div data-section="decisions"><b>Decisions</b><ul class="dd-ul">{#each m.decidedGates as d (d.id)}<li>{d.decision ?? d.status} at {stageNameOf(d.stageKey)}{d.decidedBy ? ` by ${displayPrincipal(d.decidedBy, app.members)}` : ''}{d.comment ? ` — ${d.comment}` : ''}</li>{/each}</ul></div>
        {:else}{@render hidden('decisions')}{/if}
        {#if m.counts.handoff}
          <div data-section="handoff"><b>Handoff from {m.stages[m.stageIndex - 1]?.name ?? 'the last stage'}</b><HandoffView handoff={m.handoff} testid="carried-handoff" /></div>
          {#if m.attempts.length}<div class="dd-small" data-section="attempts">{attemptsLine(m.attempts, name)}</div>{:else}{@render hidden('attempts')}{/if}
        {:else}
          <div class="dd-small"><span data-section="handoff">{handoffLine({ handoff: null, stageIndex: m.stageIndex, stages: m.stages, queuedByName: m.queuedByName || 'someone', createdAt: card.createdAt })}</span>{#if m.attempts.length} · <span data-section="attempts">{attemptsLine(m.attempts, name)}</span>{:else}{@render hidden('attempts')}{/if}</div>
        {/if}
      {/snippet}
      {@render sec('happened', 'What happened', whatHappenedSummary(m.counts.runs, m.counts.decisions), happenedBody)}

      {#snippet linksBody()}
        <div data-section="links">
          {#if m.hasAnyLink}
            {#each Object.entries(LINK_LABEL) as [key, label] (key)}
              {@const rows = m.linkGroups[key as keyof typeof LINK_LABEL] as Array<{ title: string; remove: import('$lib/components/link-groups').RemoveArgs }>}
              {#if rows.length}<b>{label}</b><ul class="dd-ul">{#each rows as row (row.title + key)}<li>{row.title} <button class="dd-more" type="button" disabled={m.links.removing.size > 0} onclick={() => m.links.remove(row.remove)}>Remove</button></li>{/each}</ul>{/if}
            {/each}
          {:else}
            <b>Relates to</b><p class="dd-small" style="margin: 4px 0px 0px;">Nothing blocks this card and it blocks nothing.</p>
          {/if}
          {#if m.links.listError}<p class="vk-field__error" role="alert">{m.links.listError}</p>{/if}
        </div>
        <button class="vk-button vk-button--secondary" type="button" style="align-self: flex-start;" onclick={() => m.links.openAdd()}><Icon name="link" size={18} /> Add link</button>
        <LinkAddForm model={m} />
        <div data-section="subtasks"><b>Sub-tasks</b> <span class="dd-small">{subtasksLine(card.openChildCount, m.children.length)}</span>
          {#if m.children.length}<ul class="dd-ul">{#each m.children as c (c.id)}<li><button class="dd-more" type="button" onclick={() => app.openCard(c.id)}>{c.title}</button></li>{/each}</ul>{/if}
        </div>
        <div data-section="references"><b>References</b>
          {#if m.refs.length}
            <ul class="dd-ul">
              {#each m.otherRefs as r (r.id)}<li>{#if safeHref(r.url)}<a class="dd-link" href={safeHref(r.url)!} target="_blank" rel="noreferrer">{r.title ?? refLabel(r)}</a>{:else}{r.title ?? refLabel(r)}{/if} <span class="dd-small">· {referenceSource(r)}</span></li>{/each}
              {#each m.libraryRefs as l, i (l.ref.id)}<li><LibraryArtifact itemId={l.itemId} version={l.version} title={l.ref.title || l.itemId} open={i === 0} /></li>{/each}
            </ul>
          {:else}<p class="dd-small" style="margin: 4px 0px 0px;">None yet.</p>{/if}
        </div>
        <div data-section="related"><b>Related prior work</b><p class="dd-p dd-small">{relatedLine(m.related.phase, m.related.items.length)}</p>
          {#if m.related.items.length}<ul class="dd-ul">{#each m.related.items as r (r.itemId)}<li>{#if safeHref(r.url)}<a class="dd-link" href={safeHref(r.url)!}>{r.title}</a>{:else}{r.title}{/if} <span class="dd-small">· {r.snippet}</span></li>{/each}</ul>{/if}
        </div>
      {/snippet}
      {@render sec('links', 'Links and references', linksSummary({ links: m.counts.links, children: m.counts.children, openChildren: m.counts.openChildren, refs: m.counts.refs, related: m.related.items.length }, 'drawer'), linksBody)}

      {#snippet talkBody()}
        <div data-section="comments" style="display: contents">
          {#if m.comments.comments.length}
            <ul class="dd-ul">{#each m.comments.comments as c (c.id)}<li><b>{m.authorName(c.author)}</b> <span style="white-space: pre-wrap; overflow-wrap: anywhere">{c.deletedAt ? 'Comment deleted' : c.body}</span></li>{/each}</ul>
          {:else}<p class="dd-small" style="margin: 0px;">No comments yet. The agent that works this card reads them.</p>{/if}
          <Field id="dd-comment" label="Add a comment" control="textarea" maxlength={8192} placeholder="⌘ or Ctrl + Enter posts it" bind:value={m.comments.draft} onkeydown={commentKey} />
          {#if m.comments.error}<p class="vk-field__error" role="alert">{m.comments.error}</p>{/if}
          <button class="vk-button vk-button--secondary" type="button" style="align-self: flex-start;" aria-disabled={m.comments.posting ? 'true' : undefined} onclick={() => { if (!m.comments.posting) void m.comments.submit(); }}>Comment</button>
          <span class="vk-visually-hidden" role="status">{m.comments.posting ? 'Posting…' : ''}</span>
        </div>
      {/snippet}
      {@render sec('talk', 'Talk', talkSummary(m.comments.comments.length), talkBody)}

      {#snippet costBody()}
        <div data-section="cost" style="display: contents">
          <div><span style="font: 700 2rem/1 var(--vk-font-display);">{usd(card.costUsd)}</span> <span class="dd-small">· {m.estimate?.estimatedUsd ? `of ${usd(m.estimate.estimatedUsd)} estimated` : 'no estimate yet'}</span></div>
          <div class="dd-meter"><i style="width: {m.costPct}%;"></i></div>
        </div>
        {#if m.counts.deliveryActive}<div data-section="delivery"><DeliveryPanel model={m} /></div>{:else}<p class="dd-small" data-section="delivery" style="margin: 0px;">No approved delivery on this card.</p>{/if}
      {/snippet}
      {@render sec('cost', 'Cost and delivery', costSummary(card.costUsd, m.estimate?.estimatedUsd ?? null, m.deliveryGate?.delivery?.mode ?? null), costBody)}
    </div>

    <div class="dd-foot" data-section="cardActions">
      {#if !m.archived}<button class="vk-button vk-button--secondary" type="button" disabled={m.archiving} onclick={() => m.archive()}><Icon name="archive" size={18} /> {m.archiving ? 'Archiving…' : 'Archive card'}</button>{/if}
      <Button variant="quiet" onclick={() => m.remove()}>{#snippet icon()}<Icon name="trash" size={18} />{/snippet}Delete card</Button>
    </div>
  </div>
</div>
</Drawer>
