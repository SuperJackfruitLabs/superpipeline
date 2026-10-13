<!-- apps/web/src/lib/components/card/layouts/CardPaper.svelte -->
<script lang="ts">
  /**
   * Paper's card drawer (SP-Card-Paper): a letter on a centred sheet. The head (way back, kicker,
   * `Re:` title, way out) is vibekit's Drawer; under it come two small-caps fact lines, the agent's
   * letter, the reply, and five enclosures. The gate, the question and the archived, done and
   * loading blocks take the letter's place. Every section key is drawn once (`data-section`).
   */
  import './card-paper.css';
  import '../paper-states.css';
  import { Button, Drawer, Face, Field } from '@superjackfruit/vibekit';
  import { CARD_LAYOUTS } from '$lib/layouts';
  import { app } from '$lib/stores/app.svelte';
  import { displayAgent, displayPrincipal } from '$lib/names';
  import { dayMonthLong } from '$lib/when';
  import { isControlRow, isNarrative, visibleActivities } from '$lib/activity-groups';
  import Icon from '$lib/components/parts/Icon.svelte';
  import RawJson from '../RawJson.svelte';
  import ToolCallDetails from '../ToolCallDetails.svelte';
  import LibraryArtifact from '../LibraryArtifact.svelte';
  import HandoffView from '../HandoffView.svelte';
  import CardEditForm from '../CardEditForm.svelte';
  import DeliveryPanel from '../DeliveryPanel.svelte';
  import LinkAddForm from '../LinkAddForm.svelte';
  import TokenText from '../TokenText.svelte';
  import SpecValueView from '../SpecValueView.svelte';
  import GatePaper from '../gate/GatePaper.svelte';
  import QuestionPaper from '../question/QuestionPaper.svelte';
  import CardStatePaper from '../state/CardStatePaper.svelte';
  import { specGroups, specRowCount } from '../spec-groups';
  import { refLabel, referenceSource } from '../references';
  import { safeHref } from '../spec-details';
  import { sessionIdOf } from '../tokens';
  import { attemptWord } from '../state-words';
  import { emptyNoteError, handoffLine, planNone, projectLine, relatedLine, RESUME_PLACEHOLDER, usd } from '../card-words';
  import {
    firstName, paperSalutation, paperAttemptLine, paperAttachedSummary, paperBack, paperBriefSummary, paperCorrespondenceSummary, paperDrawerProvenance,
    paperHappenedSummary, paperLogRow, paperLogTime, paperReplySub, paperStateWord, paperWaitingSummary, paperWhen, reTitle,
    resumeOptionLabel, signatureLine, PAPER_KICKER_DRAWER,
  } from '../paper-words';
  import type { CardLayoutProps } from './types';

  let { model: m, vibe, phase, personName, gate, question, pageHref, onClose }: CardLayoutProps = $props();

  const card = $derived(m.card!);
  const lead = $derived(m.lead!);
  const needs = $derived(lead.needsYou && !m.archived);
  const done = $derived(lead.kind === 'done');
  const editing = $derived(m.edit.editing);
  const name = (id: string | null) => (id ? displayAgent(id, m.agents) : '');
  const agentName = $derived(m.agent.name || 'the agent');
  const role = $derived(m.agents.find((a) => a.id === m.speakerId)?.role ?? null);
  const lastName = $derived(name(m.lastAgentId));
  const ownerName = $derived(displayPrincipal(card.ownerUserId, app.members));
  const q = $derived(m.provenance);
  const next = $derived(m.stages[m.stageIndex + 1]?.name ?? null);
  const groups = $derived(specGroups(card.spec, { criteriaHeading: 'Things to prove' }));
  const rowCount = $derived(specRowCount(groups));
  const sid = $derived(sessionIdOf(lead.sentence));
  const runs = $derived([...m.activityGroups].reverse());
  const stopped = $derived(['stopped', 'failed', 'budget'].includes(lead.kind) && !m.archived);
  const kicker = $derived(m.archived && card.archivedAt ? `Archived on ${dayMonthLong(card.archivedAt)}` : needs ? PAPER_KICKER_DRAWER : undefined);
  const handoff = $derived(handoffLine({ handoff: null, stageIndex: m.stageIndex, stages: m.stages, queuedByName: m.queuedByName || 'someone', createdAt: card.createdAt }));
  const attemptOf = (runId: string) => m.attempts.find((a) => a.runId === runId);
  const now = () => new Date().toISOString();
  const words = $derived(done && m.handoff && typeof m.handoff.summary === 'string' ? m.handoff.summary : lead.sentence);
  const LINK_LABEL = { blockedBy: 'Blocked by', resolvedBlockedBy: 'Blocked by (resolved)', blocks: 'Blocks', relates: 'Relates to', supersedes: 'Supersedes', advisory: 'On other boards (advisory)' } as const;

  let open = $state({ brief: true, happened: false, waiting: false, attached: false, letters: true });
  let rawOpen = $state(false);
  let subAdd = $state(false);
  let refAdd = $state(false);

  $effect(() => m.comments.attach());
  // vibekit Field keeps its textarea to itself; the attachment hands it to the resume model, which focuses it.
  const noteRef = (el: Element) => { m.resume.noteEl = el as HTMLTextAreaElement; return () => { if (m.resume.noteEl === el) m.resume.noteEl = undefined; }; };
  function commentKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void m.comments.submit(); }
  }
  function back(e: MouseEvent): void {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onClose();
  }
</script>

{#snippet hidden(key: string)}<span hidden data-section={key}></span>{/snippet}

{#snippet backLink()}
  <a class="pcd-back" href="/b/{m.boardId}" onclick={back}><Icon name="back" size={16} /> {paperBack(m.boardName, phase)}</a>
{/snippet}

{#snippet tools()}
  <Button variant="tool" href={pageHref} target="_blank" rel="noopener" aria-label="Open in new window">{#snippet icon()}<Icon name="open-window" size={18} />{/snippet}Open in new window</Button>
{/snippet}

{#snippet enc(id: 'brief' | 'happened' | 'waiting' | 'attached' | 'letters', title: string, sum: string, body: import('svelte').Snippet)}
  <details class="pcd-enc" bind:open={open[id]}>
    <summary><span class="t">{title}</span><span class="c">{sum}</span><span class="o" aria-hidden="true">{open[id] ? 'Close' : 'Open'}</span></summary>
    <div class="pcd-encbody">{@render body()}</div>
  </details>
{/snippet}

<Drawer open={true} head="stacked" title={reTitle(card.title, !!gate)} eyebrow={kicker} eyebrowTone={needs ? 'needs' : 'muted'} back={backLink} {tools} width={CARD_LAYOUTS.paper.width} onclose={onClose}>
<!-- data-autofocus: the Drawer opens with focus at the sheet itself, not on its first control (the reference is drawn unfocused). -->
<div class="pcd" tabindex="-1" data-autofocus>
  {#if m.archived}<CardStatePaper kind="archived" model={m} />{/if}

  <div class="pcd-lines">
    <p class="pcd-line" data-section="status">
      <span class:sig={needs}>{paperStateWord({ archived: m.archived, needsYou: lead.needsYou, state: card.state, ageHours: m.ageHours })}</span>
      <span>Stage <b>{m.stageIndex + 1} of {m.stages.length}, {m.stageName}</b></span>
      {#if next}<span>Next: {next}</span>{/if}
      {#if card.attemptCount > 0}<span>Attempt <b>{card.attemptCount}</b></span>{/if}
    </p>
    <p class="pcd-line" data-section="facts">
      <span>Owner <b>{ownerName}</b></span>
      {#if q?.known}<span>Asked by <b>{m.queuedByName}</b>{q.byAgent && m.queuedByName !== 'an agent' ? ', an agent' : ''}</span>{/if}
      {#if m.delegate.id}<span><b>{m.delegate.name}</b> working it</span>{:else}<span><b>Unclaimed</b></span>{/if}
      <span>Priority <b>{card.priority > 0 ? `P${card.priority}` : 'none'}</b></span>
      {#if card.dueAt}<span>Due <b>{card.dueAt.slice(0, 10)}</b></span>{:else}<span>No due date</span>{/if}
      {#if m.labels.length}<span>Labels <b>{m.labels.map((l) => l.name).join(', ')}</b></span>{:else}<span>No labels</span>{/if}
      <span class="pcd-meta">card {m.shortId}<button class="pcd-copy" type="button" aria-label="Copy card id {m.shortId}" onclick={() => m.copyId()}><Icon name={m.copied === 'id' ? 'check' : 'copy'} size={14} /></button></span>
      {#if app.user && card.ownerUserId !== app.user.userId && !m.archived}
        <button class="pcd-linkbtn" type="button" aria-disabled={m.assigning ? 'true' : undefined} onclick={() => { if (!m.assigning) void m.assignToMe(); }}>Assign to me</button>
      {/if}
    </p>
  </div>
  {#if editing}<div data-section="editForm"><CardEditForm model={m} /></div>{:else}{@render hidden('editForm')}{/if}

  <hr class="pcd-rule" />

  {#if m.localError}<p class="pcd-small" role="alert" data-section="error">{m.localError}</p>{:else}{@render hidden('error')}{/if}

  {#if !m.detailLoaded}
    <CardStatePaper kind="loading" model={m} />
    {@render hidden('resume')}
  {:else if question}
    <QuestionPaper model={question.model} elicitation={question.elicitation} agent={question.agent} {vibe} {personName} />
    {@render hidden('resume')}
  {:else if gate}
    <GatePaper {...gate} agent={m.agent} {lead} {vibe} {personName} />
    {@render hidden('resume')}
  {:else}
    {#if done}<CardStatePaper kind="done" model={m} />{/if}
    {#if words}
      <div class="pcd-letter">
        <p class="pcd-dear">{paperSalutation(personName)}</p>
        <p class="pcd-voice"><TokenText text={words} cls="pcd-id" /></p>
        <div class="pcd-sign">
          <Face id={agentName} label={agentName} mood={m.agent.mood} size={36} ring={needs ? 'mood' : undefined} />
          <div style="display: flex; flex-direction: column; gap: 2px;"><span class="n">{agentName}</span><span class="r">{signatureLine(role, card.attemptCount, lead.at ? paperWhen(lead.at, now()) : null)}</span></div>
          {#if sid}<button class="vk-button vk-button--quiet" type="button" style="font-size: var(--vk-text-sm); margin-left: auto;" onclick={() => m.copySessionId(sid)}><Icon name={m.copied === 'session' ? 'check' : 'copy'} size={14} /> Copy session id</button>{/if}
        </div>
      </div>
    {/if}
    {#if m.archived}
      {@render hidden('resume')}
      <CardStatePaper kind="restore" model={m} />
    {:else if stopped && m.resume.show}
      <form class="pcd-reply" aria-labelledby="pcd-reply-h" data-section="resume" onsubmit={(e) => { e.preventDefault(); void m.resume.submit(); }}>
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <h3 id="pcd-reply-h" class="pcd-h">Your reply</h3>
          <p class="pcd-small pcd-small--flush">{paperReplySub(card.attemptCount)}</p>
        </div>
        <div class="pcd-grid">
          <Field id="pcd-resume-at" label="Resume at stage" control="select" bind:value={m.resume.target}
            options={m.resume.targets.filter((t) => t.allowed).map((t) => ({ value: t.key, label: resumeOptionLabel(t) }))} />
          <Field id="pcd-note" {@attach noteRef} label="What changed, or what should the agent do differently? It reads this." control="textarea" maxlength={8000} rows={4}
            placeholder={RESUME_PLACEHOLDER} hint={m.resume.error ? undefined : m.resume.hint} error={m.resume.error || undefined} bind:value={m.resume.note} />
        </div>
        <div class="pcd-foot">
          <Button type="submit" aria-disabled={m.resume.busy ? 'true' : undefined}>Send back to work</Button>
          <span class="vk-visually-hidden" role="status">{m.resume.busy ? 'Sending…' : ''}</span>
          <span class="pcd-small">With no note: “{emptyNoteError(agentName)}”</span>
        </div>
      </form>
    {:else}{@render hidden('resume')}{/if}
  {/if}

  <div class="pcd-encs">
    <p class="pcd-sc">Enclosed</p>

    {#snippet briefBody()}
      {#if card.spec?.description}<p class="pcd-p pcd-p--brief" data-section="description" style="white-space: pre-line">{String(card.spec.description)}</p>{:else}{@render hidden('description')}{/if}
      <div class="pcd-two">
        <div>
          <p class="pcd-sc">Things to prove</p>
          {#if m.acceptanceCriteria?.length}<ul class="pcd-ul" data-section="criteria">{#each m.acceptanceCriteria as c, i (i)}<li>{c}</li>{/each}</ul>{:else}<p class="pcd-small pcd-small--flush" data-section="criteria">Nothing listed to prove.</p>{/if}
        </div>
        <div data-section="plan">
          <p class="pcd-sc">Plan</p>
          {#if m.plan}<ol class="pcd-ul">{#each m.plan as step, i (i)}<li style={step.done ? 'text-decoration: line-through' : undefined}>{step.text}</li>{/each}</ol>{:else}<p class="pcd-small pcd-small--flush">{planNone(m.agent.name)}</p>{/if}
        </div>
      </div>
      <div class="pcd-groups" data-section="details" data-testid="spec-details">
        {#each groups as g (g.label)}
          <div><p class="pcd-sc">{g.label}</p><dl class="pcd-dl">
            {#each g.rows as r (r.key)}<div><dt>{r.label}</dt><dd data-testid="spec-value-{r.key}"><SpecValueView value={r.value} v={{ more: 'pcd-more', id: 'pcd-id', link: 'pcd-link', matrixLinks: true }} /></dd></div>{/each}
          </dl></div>
        {/each}
      </div>
      <div class="pcd-foot pcd-foot--split">
        <span class="pcd-small" data-section="project">
          {#if m.project.editing}
            <Field id="pcd-project" label="Project" control="select" bind:value={m.project.projectId} onchange={() => void m.project.onProjectChange()}
              options={[{ value: '', label: 'No project' }, ...app.projects.map((p) => ({ value: p.id, label: p.name }))]} />
            <Field id="pcd-milestone" label="Milestone" control="select" bind:value={m.project.milestoneId} disabled={m.project.projectId === ''}
              options={[{ value: '', label: 'No milestone' }, ...m.project.milestones.map((ms) => ({ value: ms.id, label: ms.name }))]} />
            {#if m.project.error}<span class="vk-field__error" role="alert">{m.project.error}</span>{/if}
            <span class="pcd-row"><Button aria-disabled={m.project.saving ? 'true' : undefined} onclick={() => { if (!m.project.saving) void m.project.save(); }}>Save</Button><Button variant="quiet" onclick={() => m.project.cancel()}>Cancel</Button></span>
          {:else if m.projectName}
            Project: {projectLine(m.projectName, m.milestoneName)} · <button class="pcd-linkbtn" type="button" onclick={() => m.project.start()}>Change project</button>
          {:else}
            No project. <button class="pcd-linkbtn" type="button" onclick={() => m.project.start()}>Assign to a project</button>
          {/if}
        </span>
        <span>
          <button class="pcd-linkbtn pcd-small" type="button" aria-expanded={rawOpen} onclick={() => (rawOpen = !rawOpen)}>{rawOpen ? 'Hide raw JSON' : 'View raw JSON'}</button>
          {#if rawOpen}<button class="vk-button vk-button--quiet" type="button" style="font-size: var(--vk-text-sm);" onclick={() => m.copySpec()}><Icon name={m.copied === 'spec' ? 'check' : 'copy'} size={14} /> Copy</button>{/if}
        </span>
      </div>
      {#if rawOpen}<RawJson value={card.spec} bare />{/if}
    {/snippet}
    {@render enc('brief', 'The brief', paperBriefSummary({ criteria: m.counts.criteria, rows: rowCount, planSteps: m.counts.planSteps, project: !!m.projectName }), briefBody)}

    {#snippet happenedBody()}
      <p class="pcd-small pcd-small--flush" data-section="handoff">{#if m.counts.handoff}<HandoffView handoff={m.handoff} testid="carried-handoff" />{:else if q?.known}{paperDrawerProvenance({ queuedByName: m.queuedByName, byAgent: q.byAgent, covers: m.grantCovers, handoff })}{:else}{handoff}{/if}</p>
      <div data-section="activity" style="display: contents"><div data-section="attempts" style="display: contents">
        {#each [...m.attempts].map((a, i) => ({ a, n: i + 1 })).reverse() as { a, n }, i (a.runId)}
          {@const g = m.activityGroups.find((x) => x.runId === a.runId)}
          {@const line = paperAttemptLine({ n, agent: name(a.agentId) || 'An agent', events: g?.counts.total ?? 0, word: attemptWord(a), endedAt: a.endedAt ?? null, newest: i === 0 })}
          {@const isOpen = m.isRunOpen(a.runId, i === 0)}
          {@const tools = m.toolsShown(a.runId)}
          <div class="pcd-att" data-attempt={a.runId}>
            <button class="pcd-atthead" type="button" data-attempt-head={a.runId} aria-expanded={isOpen} aria-controls="pcd-run-{a.runId}" onclick={() => m.toggleRun(a.runId, i === 0)}><span class="pcd-p"><b>{line.head}</b>{line.rest}</span><span class="o" aria-hidden="true">{isOpen ? 'Close' : 'Open'}</span></button>
            {#if isOpen && g}
              {@const who = name(g.agentId) || 'An agent'}
              {@const view = visibleActivities(g.activities, isNarrative, tools, isControlRow)}
              <div id="pcd-run-{a.runId}" class="pcd-attbody">
                <ol class="pcd-log">
                  {#each view.rows as ev, ei (ev.seq)}<li><Face id={who} label={who} mood={ev.signal === 'stop' ? 'needs' : 'thinking'} size={24} /><span class:stop={ev.signal === 'stop' && needs && i === 0}>{paperLogRow(ev)}<span class="t">{paperLogTime(ev.ts, ei === view.rows.length - 1)}</span><ToolCallDetails parameter={ev.parameter} result={ev.result} cls="pcd-details" /></span></li>{/each}
                </ol>
                {#if tools || (g.counts.action > 0 && !view.shownBecauseNoNarrative)}<button class="vk-button vk-button--quiet" type="button" style="align-self: flex-start; font-size: var(--vk-text-sm);" data-attempt-tools={a.runId} aria-pressed={tools} onclick={() => m.toggleTools(a.runId)}>{tools ? 'Hide tool calls' : `Show tool calls · all ${g.counts.total} events`}</button>{/if}
              </div>
            {/if}
          </div>
        {/each}
      </div></div>
      <p class="pcd-small pcd-small--flush" data-section="decisions">{#if m.decidedGates.length}Decisions: {m.decidedGates.map((d) => `${d.decision ?? d.status} at ${m.stages.find((s) => s.key === d.stageKey)?.name ?? d.stageKey}${d.decidedBy ? ` by ${displayPrincipal(d.decidedBy, app.members)}` : ''}`).join('; ')}.{:else}Decisions: none yet.{/if}</p>
      <p class="pcd-small pcd-small--flush" data-section="cost">Cost {usd(card.costUsd)}, {m.estimate?.estimatedUsd ? `of an estimated ${usd(m.estimate.estimatedUsd)}` : 'no estimate yet'}.</p>
    {/snippet}
    {@render enc('happened', 'What happened', paperHappenedSummary({ runs: m.counts.runs, decisions: m.counts.decisions, costUsd: card.costUsd }), happenedBody)}

    {#snippet waitingBody()}
      <div data-section="links" style="display: contents">
        {#if m.hasAnyLink}
          {#each Object.entries(LINK_LABEL) as [key, label] (key)}
            {@const rows = m.linkGroups[key as keyof typeof LINK_LABEL] as Array<{ title: string; remove: import('$lib/components/link-groups').RemoveArgs }>}
            {#if rows.length}<p class="pcd-sc">{label}</p><ul class="pcd-ul">{#each rows as row (row.title + key)}<li>{row.title} <button class="pcd-more" type="button" aria-disabled={m.links.removing.size > 0 ? 'true' : undefined} onclick={() => { if (m.links.removing.size === 0) void m.links.remove(row.remove); }}>Remove</button></li>{/each}</ul>{/if}
          {/each}
        {:else}<p class="pcd-small pcd-small--flush">Nothing blocks this card and it blocks nothing.</p>{/if}
        {#if m.links.listError}<p class="vk-field__error" role="alert">{m.links.listError}</p>{/if}
      </div>
      <Button variant="secondary" style="align-self: flex-start;" onclick={() => m.links.openAdd()}>Add link</Button>
      <LinkAddForm model={m} />
      <div data-section="subtasks" style="display: contents">
        {#if m.children.length}<ul class="pcd-ul">{#each m.children as c (c.id)}<li><button class="pcd-linkbtn" type="button" onclick={() => app.openCard(c.id)}>{c.title}</button></li>{/each}</ul>{:else}<p class="pcd-small pcd-small--flush">No sub-tasks yet.</p>{/if}
        {#if subAdd}
          <div class="pcd-row"><Field id="pcd-sub" label="New sub-task title" labelHidden placeholder="Add a sub-task" bind:value={m.subtasks.title} onkeydown={(e) => { if (e.key === 'Enter') void m.subtasks.add(); }} /><Button variant="secondary" aria-disabled={m.subtasks.adding ? 'true' : undefined} onclick={() => { if (!m.subtasks.adding) void m.subtasks.add(); }}>Add</Button><span class="vk-visually-hidden" role="status">{m.subtasks.adding ? 'Adding…' : ''}</span></div>
        {:else}<button class="pcd-linkbtn pcd-small" type="button" style="align-self: flex-start;" onclick={() => (subAdd = true)}>Add a sub-task</button>{/if}
      </div>
    {/snippet}
    {@render enc('waiting', 'Who is waiting', paperWaitingSummary({ links: m.counts.links, subtasks: m.counts.children, open: m.counts.openChildren }), waitingBody)}

    {#snippet attachedBody()}
      <div data-section="references" style="display: contents">
        {#if m.refs.length}
          <ul class="pcd-ul">
            {#each m.otherRefs as r (r.id)}<li>{#if safeHref(r.url)}<a class="pcd-link" href={safeHref(r.url)!} target="_blank" rel="noreferrer">{r.title ?? refLabel(r)}</a>{:else}{r.title ?? refLabel(r)}{/if}{r.subtitle ? ` · ${r.subtitle}` : ''}<span class="pcd-small pcd-block">{referenceSource(r)}</span></li>{/each}
            {#each m.libraryRefs as l, i (l.ref.id)}<li><LibraryArtifact itemId={l.itemId} version={l.version} title={l.ref.title || l.itemId} open={i === 0} /></li>{/each}
          </ul>
        {:else}<p class="pcd-small pcd-small--flush">No references attached.</p>{/if}
        {#if refAdd}
          <div class="pcd-row"><Field id="pcd-ref" label="Attach a link or Superlibrary item" labelHidden type="url" inputmode="url" placeholder="Paste a link to attach" bind:value={m.refsForm.url} onkeydown={(e) => { if (e.key === 'Enter') void m.refsForm.add(); }} /><Button variant="secondary" onclick={() => m.refsForm.add()}>Add</Button></div>
        {:else}<button class="pcd-linkbtn pcd-small" type="button" style="align-self: flex-start;" onclick={() => (refAdd = true)}>Attach a link</button>{/if}
      </div>
      <div data-section="related" style="display: contents">
        <p class="pcd-small pcd-small--flush">{relatedLine(m.related.phase, m.related.items.length)}</p>
        {#if m.related.items.length}<ul class="pcd-ul">{#each m.related.items as r (r.itemId)}<li>{#if safeHref(r.url)}<a class="pcd-link" href={safeHref(r.url)!}>{r.title}</a>{:else}{r.title}{/if} <span class="pcd-small">· {r.snippet}</span></li>{/each}</ul>{/if}
      </div>
      {#if m.counts.deliveryActive}<div data-section="delivery"><DeliveryPanel model={m} /></div>{:else}<p class="pcd-small pcd-small--flush" data-section="delivery">No approved delivery on this card.</p>{/if}
    {/snippet}
    {@render enc('attached', 'Attached', paperAttachedSummary({ refs: m.counts.refs, related: m.related.items.length, delivery: m.counts.deliveryActive }), attachedBody)}

    {#snippet lettersBody()}
      <div data-section="comments" style="display: contents">
        {#if m.comments.comments.length}
          <ul class="pcd-ul">{#each m.comments.comments as c (c.id)}<li><b>{m.authorName(c.author)}</b> <span style="white-space: pre-wrap; overflow-wrap: anywhere">{c.deletedAt ? 'Comment deleted' : c.body}</span></li>{/each}</ul>
        {/if}
        <Field id="pcd-comment" label="Write to whoever works this card. The agent reads it." control="textarea" maxlength={8192} rows={4} placeholder="⌘ or Ctrl + Enter posts it" bind:value={m.comments.draft} onkeydown={commentKey} />
        {#if m.comments.error}<p class="vk-field__error" role="alert">{m.comments.error}</p>{/if}
        <Button variant="secondary" style="align-self: flex-start;" aria-disabled={m.comments.posting ? 'true' : undefined} onclick={() => { if (!m.comments.posting) void m.comments.submit(); }}>Comment</Button>
        <span class="vk-visually-hidden" role="status">{m.comments.posting ? 'Posting…' : ''}</span>
      </div>
    {/snippet}
    {@render enc('letters', 'Correspondence', paperCorrespondenceSummary(m.comments.comments.length), lettersBody)}
  </div>

  <div class="pcd-foot" data-section="cardActions">
    <Button variant="secondary" data-section="editButton" pressed={editing} onclick={() => m.edit.start()}>{#snippet icon()}<Icon name="edit" size={18} />{/snippet}Edit card</Button>
    {#if !m.archived}<Button variant="secondary" aria-disabled={m.archiving ? 'true' : undefined} onclick={() => { if (!m.archiving) void m.archive(); }}>{#snippet icon()}<Icon name="archive" size={18} />{/snippet}Archive card</Button><span class="vk-visually-hidden" role="status">{m.archiving ? 'Archiving…' : ''}</span>{/if}
    <Button variant="danger" onclick={() => m.remove()}>Delete card</Button>
  </div>
</div>
</Drawer>
