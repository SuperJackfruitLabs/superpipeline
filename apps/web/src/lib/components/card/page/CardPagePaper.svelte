<!-- apps/web/src/lib/components/card/page/CardPagePaper.svelte -->
<script lang="ts">
  /** Paper's card page (SP-CardPage-Paper): a letter from the agent, its enclosures, and the record. */
  import './card-page-paper.css';
  import { Button, Face, Field, StageTrack } from '@superjackfruit/vibekit';
  import { app } from '$lib/stores/app.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import { displayAgent, displayPrincipal } from '$lib/names';
  import { clockHM, whenLabelLong } from '$lib/when';
  import { isControlRow, isNarrative, visibleActivities } from '$lib/activity-groups';
  import Icon from '$lib/components/parts/Icon.svelte';
  import CardEditForm from '../CardEditForm.svelte';
  import DeliveryPanel from '../DeliveryPanel.svelte';
  import LinkAddForm from '../LinkAddForm.svelte';
  import HandoffView from '../HandoffView.svelte';
  import RawJson from '../RawJson.svelte';
  import ToolCallDetails from '../ToolCallDetails.svelte';
  import TokenText from '../TokenText.svelte';
  import SpecValueView from '../SpecValueView.svelte';
  import GatePaper from '../gate/GatePaper.svelte';
  import QuestionPaper from '../question/QuestionPaper.svelte';
  import { specGroups } from '../spec-groups';
  import { referenceSource, refLabel } from '../references';
  import { safeHref } from '../spec-details';
  import { sessionIdOf } from '../tokens';
  import { attemptWord, stripAria, stripKind, waitingWord } from '../state-words';
  import { emptyNoteError, handoffLine, initials, planNone, projectLine, relatedLine, RESUME_PLACEHOLDER, usd } from '../card-words';
  import {
    firstName, paperAttempt, paperByline, paperCostLine, paperDateline, paperDeck, paperKicker, paperLinked, paperLogRow, paperLogTime,
    paperProvenance, paperReplySub, paperRole, reTitle, roman,
  } from '../paper-words';
  import AccountMenu from './AccountMenu.svelte';
  import type { CardPageProps } from '../layouts/types';

  let { model: m, vibe, phase, personName, gate, question, boardHref }: CardPageProps = $props();
  const card = $derived(m.card!);
  const lead = $derived(m.lead!);
  const editing = $derived(m.edit.editing);
  const name = (id: string | null) => (id ? displayAgent(id, m.agents) : '');
  const agentName = $derived(m.agent.name || 'the agent');
  const role = $derived(m.agents.find((a) => a.id === m.speakerId)?.role ?? null);
  const lastName = $derived(name(m.lastAgentId));
  const ownerName = $derived(displayPrincipal(card.ownerUserId, app.members));
  const userName = $derived(app.user?.name ?? app.user?.login ?? '');
  const q = $derived(m.provenance);
  const groups = $derived(specGroups(card.spec, { criteriaHeading: 'Things to prove' }));
  const sid = $derived(sessionIdOf(lead.sentence));
  const runs = $derived([...m.activityGroups].reverse());
  const stageNameOf = (key: string | null) => m.stages.find((s) => s.key === key)?.name ?? key ?? 'Unknown stage';
  const attemptOf = (runId: string) => m.attempts.find((a) => a.runId === runId);
  const attemptNo = (runId: string) => m.attempts.findIndex((a) => a.runId === runId) + 1;
  const stopped = $derived(['stopped', 'failed', 'budget'].includes(lead.kind) && !m.archived);
  const kicker = $derived(paperKicker(lead.needsYou, card.archivedAt, m.ageHours, 'page'));
  const handoff = $derived(handoffLine({ handoff: null, stageIndex: m.stageIndex, stages: m.stages, queuedByName: q?.queuedByName ?? 'someone', createdAt: card.createdAt }));
  let rawOpen = $state(false);
  $effect(() => m.comments.attach());
  // vibekit Field keeps its textarea to itself; the attachment hands it to the resume model, which focuses it.
  const noteRef = (el: Element) => { m.resume.noteEl = el as HTMLTextAreaElement; return () => { if (m.resume.noteEl === el) m.resume.noteEl = undefined; }; };
  function commentKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void m.comments.submit(); }
  }
</script>

{#snippet hidden(key: string)}<span hidden data-section={key}></span>{/snippet}

<div class="pg">
  <main class="pg-wrap" id="content">
    <header class="pg-mast">
      <a class="pg-name" href="/">Superpipeline</a>
      <span class="pg-date">{paperDateline(new Date(), phase)}</span>
      <span style="flex: 1 1 auto;"></span>
      <button class="pg-quiet" type="button" aria-haspopup="dialog" onclick={() => (appearance.pickerOpen = true)}>Appearance</button>
      <AccountMenu triggerClass="pg-quiet" label="{userName}, account menu with Sign out" initials={userName} caret />
    </header>
    <nav class="pg-sec" aria-label="Card window">
      <a href={boardHref}><Icon name="back" size={16} /> {m.boardName} board</a>
      <span class="pg-sep" aria-hidden="true"></span>
      <span class="pg-small">Opened from {m.boardName} · <a href={boardHref}>Back to the board</a></span>
      <span style="flex: 1 1 auto;"></span>
      <span class="pg-mono">card {m.shortId}<button class="pg-copy" type="button" aria-label="Copy card id {m.shortId}" onclick={() => m.copyId()}><Icon name={m.copied === 'id' ? 'check' : 'copy'} size={14} /></button></span>
      <button class="pg-frame" type="button" onclick={() => m.copyLink()}><Icon name={m.copied === 'link' ? 'check' : 'link'} size={16} /> {m.copied === 'link' ? 'Link copied' : 'Copy link to this card'}</button>
      <button class="pg-frame" type="button" data-section="editButton" aria-pressed={editing} onclick={() => m.edit.start()}><Icon name="edit" size={16} /> Edit card</button>
    </nav>

    <section class="pg-head" aria-labelledby="pg-title">
      {#if kicker}<span class="pg-kicker">{#if lead.needsYou && !m.archived}<span class="pg-dot"></span>{/if}{kicker}</span>{/if}
      <h1 id="pg-title" class="pg-title">{reTitle(card.title, !!gate)}</h1>
      {#if editing}<div data-section="editForm"><CardEditForm model={m} /></div>{:else}{@render hidden('editForm')}{/if}
      <p class="pg-deck">{paperDeck(lead.kind, agentName, m.stageName, card.attemptCount)}</p>
      <StageTrack form="page" stages={m.stages.map((s) => s.name)} current={m.stageIndex} status={m.trackStatus} label={stripAria(m.stageIndex, m.stages.length, m.stageName, stripKind(lead, m.archived), 'drawer')} />
      <div class="pg-byline" data-section="status">
        {#if m.delegate.id || lastName}
          {@const who = m.delegate.id ? m.delegate.name : lastName}
          <span class="pg-by"><Face id={who} label={who} mood={m.delegate.id ? m.delegate.mood : 'resting'} size={32} /><span><b>{who}</b>{paperByline(stageNameOf(m.attempts.at(-1)?.stageKey ?? card.currentStageKey), card.attemptCount, !!m.delegate.id)}</span></span>
        {/if}
        <span class="pg-by"><span class="pg-initials" aria-hidden="true">{initials(ownerName)}</span><span><b>{ownerName}</b> · owner</span></span>
        {#if q?.known}<span class="pg-by" title={q.byAgent ? 'An agent with dispatch authority on this board' : undefined}>{#if q.byAgent}<Face id={q.queuedByName} label={q.queuedByName} mood="working" size={32} />{:else}<span class="pg-initials" aria-hidden="true">{initials(q.queuedByName)}</span>{/if}<span><b>{q.queuedByName}</b> · asked for it{q.byAgent ? ', an agent' : ''}</span></span>{/if}
      </div>
      <p class="pg-line" data-section="facts">
        <span class:sig={lead.needsYou && !m.archived}>{waitingWord(card, lead, m.ageHours, 'desktop')}</span>
        <span>Stage <b>{m.stageIndex + 1} of {m.stages.length}, {m.stageName}</b></span>
        {#if card.attemptCount > 1}<span>Attempt <b>{card.attemptCount}</b></span>{/if}
        <span>Priority <b>{card.priority > 0 ? `P${card.priority}` : 'none'}</b></span>
        {#if card.dueAt}<span>Due <b>{card.dueAt.slice(0, 10)}</b></span>{:else}<span>No due date</span>{/if}
        {#if m.labels.length}<span>Labels <b>{m.labels.map((l) => l.name).join(', ')}</b></span>{:else}<span>No labels</span>{/if}
        {#if m.projectName}<span>Project <b>{m.projectName}</b></span>{/if}
      </p>
    </section>

    <div class="pg-spread">
      <article class="pg-col" aria-labelledby="pg-letter">
        <h2 id="pg-letter" class="pg-sc">The letter</h2>
        {#if m.localError}<p role="alert" data-section="error" class="pg-small">{m.localError}</p>{:else}{@render hidden('error')}{/if}
        {#if gate}
          <GatePaper boardId={gate.boardId} gate={gate.gate} error={gate.error} onResponse={gate.onResponse} agent={m.agent} {lead} {vibe} {personName} />
          {@render hidden('resume')}
        {:else if question}
          <QuestionPaper model={question.model} elicitation={question.elicitation} agent={question.agent} {vibe} {personName} />
          {@render hidden('resume')}
        {:else}
          <p class="pg-dear">Dear {firstName(personName)},</p>
          {#if lead.sentence}<p class="pg-voice"><TokenText text={lead.sentence} cls="pg-id" /></p>{/if}
          <div class="pg-sign">
            <Face id={agentName} label={agentName} mood={m.agent.mood} size={40} />
            <div style="display: flex; flex-direction: column; gap: 2px;"><span class="n">{agentName}</span><span class="pg-small">{paperRole(role, card.attemptCount)}{lead.at ? ` · ${whenLabelLong(lead.at)}` : ''}</span></div>
            {#if sid}<button class="vk-button vk-button--quiet" type="button" style="font-size: var(--vk-text-sm); margin-left: auto;" onclick={() => m.copySessionId(sid)}><Icon name={m.copied === 'session' ? 'check' : 'copy'} size={14} /> Copy session id</button>{/if}
          </div>
          {#if stopped && m.resume.show}
            <form class="pg-reply" aria-labelledby="reply-h" data-section="resume" onsubmit={(e) => { e.preventDefault(); if (!m.resume.busy) void m.resume.submit(); }}>
              <div style="display: flex; flex-direction: column; gap: 2px;"><h3 id="reply-h" class="pg-h">Your reply</h3><p class="pg-small" style="margin: 0px;">{paperReplySub(card.attemptCount)}</p></div>
              <div class="pg-grid">
                <Field id="pg-resume-at" label="Resume at stage" control="select" bind:value={m.resume.target}
                  options={m.resume.targets.filter((t) => t.allowed).map((t) => ({ value: t.key, label: `${roman(t.n)} · ${t.name}${t.current ? ' (this stage)' : ''}` }))} />
                <Field id="pg-note" {@attach noteRef} label="What changed, or what should the agent do differently? It reads this." control="textarea" maxlength={8000} placeholder={RESUME_PLACEHOLDER}
                  hint={m.resume.error ? undefined : m.resume.hint} error={m.resume.error || undefined} bind:value={m.resume.note} />
              </div>
              <div class="pg-foot"><Button type="submit" aria-disabled={m.resume.busy ? 'true' : undefined}>Send back to work</Button><span class="vk-visually-hidden" role="status">{m.resume.busy ? 'Sending…' : ''}</span><span class="pg-small">With no note: “{emptyNoteError(agentName)}”</span></div>
            </form>
          {:else}{@render hidden('resume')}{/if}
        {/if}
        <section class="pg-enc" aria-labelledby="pg-corr" data-section="comments">
          <h3 id="pg-corr"><span class="no">Enclosure V</span>Correspondence</h3>
          {#if m.comments.comments.length}<ul class="pg-ul">{#each m.comments.comments as c (c.id)}<li><b>{c.author.name ?? c.author.id}</b> <span style="white-space: pre-wrap">{c.deletedAt ? 'Comment deleted' : c.body}</span></li>{/each}</ul>
          {:else}<p class="pg-small" style="margin: 0px;">No letters yet. The agent that works this card reads them.</p>{/if}
          <Field id="pg-comment" label="Write to whoever works this card" control="textarea" maxlength={8192} style="min-height: 88px;" placeholder="⌘ or Ctrl + Enter posts it" bind:value={m.comments.draft} onkeydown={commentKey} />
          {#if m.comments.error}<p class="vk-field__error" role="alert">{m.comments.error}</p>{/if}
          <Button variant="secondary" style="align-self: flex-start;" aria-disabled={m.comments.posting ? 'true' : undefined} onclick={() => { if (!m.comments.posting) void m.comments.submit(); }}>Comment</Button><span class="vk-visually-hidden" role="status">{m.comments.posting ? 'Posting…' : ''}</span>
        </section>
      </article>

      <section class="pg-col" aria-labelledby="pg-encl">
        <h2 id="pg-encl" class="pg-sc">Enclosed</h2>
        <section class="pg-enc">
          <h3><span class="no">Enclosure I</span>The brief</h3>
          {#if card.spec?.description}<p class="pg-p pg-serif" data-section="description" style="white-space: pre-line">{String(card.spec.description)}</p>{:else}{@render hidden('description')}{/if}
          <div data-section="details" style="display: contents">
            {#each groups as g (g.label)}
              <div class="pg-group"><h4>{g.label}</h4><dl class="pg-dl pg-dl--stack">{#each g.rows as r (r.key)}<dt>{r.label}</dt><dd data-testid="spec-value-{r.key}"><SpecValueView value={r.value} v={{ clamp: 'pg-clamp', more: 'pg-lnk', matrixLinks: false }} /></dd>{/each}</dl></div>
            {/each}
          </div>
          <div class="pg-foot" style="justify-content: space-between;">
            <span class="pg-small" style="flex: 1 1 16rem; min-width: 0px;" data-section="project">
              {#if m.project.editing}
                <Field id="pg-project" label="Project" labelHidden control="select" bind:value={m.project.projectId} onchange={() => void m.project.onProjectChange()} options={[{ value: '', label: 'No project' }, ...app.projects.map((p) => ({ value: p.id, label: p.name }))]} />
                <button class="pg-lnk" type="button" onclick={() => m.project.save()}>Save</button> <button class="pg-lnk" type="button" onclick={() => m.project.cancel()}>Cancel</button>
                {#if m.project.error}<span role="alert">{m.project.error}</span>{/if}
              {:else}
                Project: {m.projectName ? projectLine(m.projectName, m.milestoneName) : 'none'} · <a href="#project" role="button" onclick={(e) => { e.preventDefault(); m.project.start(); }}>{m.projectName ? 'Change project' : 'Assign to a project'}</a>
              {/if}
            </span>
            <span style="display: flex; gap: var(--vk-space-3); align-items: center;"><details class="pg-raw" bind:open={rawOpen}><summary>View raw JSON</summary>{#if rawOpen}<RawJson value={card.spec} />{/if}</details><button class="vk-button vk-button--quiet" type="button" style="font-size: var(--vk-text-sm);" onclick={() => m.copySpec()}><Icon name={m.copied === 'spec' ? 'check' : 'copy'} size={14} /> Copy</button></span>
          </div>
        </section>
        <section class="pg-enc">
          <h3><span class="no">Enclosure II</span>Things to prove</h3>
          {#if m.acceptanceCriteria?.length}<ol class="pg-ol" data-section="criteria">{#each m.acceptanceCriteria as c, i (i)}<li>{c}</li>{/each}</ol>{:else}{@render hidden('criteria')}{/if}
          <p class="pg-sc pg-sc--bare">Agent plan</p>
          <div data-section="plan">
            {#if m.plan}<ol class="pg-ol">{#each m.plan as st, i (i)}<li style={st.done ? 'text-decoration: line-through' : undefined}>{st.text}</li>{/each}</ol>{:else}<p class="pg-small" style="margin: 0px;">{planNone(m.agent.name)}</p>{/if}
          </div>
        </section>
        <section class="pg-enc">
          <h3><span class="no">Enclosure III</span>Who is waiting, and what is attached</h3>
          <p class="pg-small" style="margin: 0px;">{paperLinked({ links: m.counts.links, children: m.counts.children, openChildren: m.counts.openChildren, refs: m.counts.refs, related: m.related.items.length })}</p>
          <ul class="pg-ul">
            {#if m.hasAnyLink}{#each [...m.linkGroups.blockedBy, ...m.linkGroups.blocks, ...m.linkGroups.relates] as row (row.title)}<li data-section="links">{row.title} <button class="pg-lnk" type="button" onclick={() => m.links.remove(row.remove)}>Remove</button></li>{/each}
            {:else}<li data-section="links">Nothing blocks this card and it blocks nothing.</li>{/if}
            {#each m.otherRefs as r, i (r.id)}<li data-section={i === 0 ? 'references' : undefined}>Reference: {#if safeHref(r.url)}<a href={safeHref(r.url)!} target="_blank" rel="noreferrer">{r.title ?? refLabel(r)}</a>{:else}{r.title ?? refLabel(r)}{/if}{r.subtitle ? ` · ${r.subtitle}` : ''} · <span class="pg-mono">{referenceSource(r)}</span></li>{/each}
            {#if m.otherRefs.length === 0}<li data-section="references">No references attached.</li>{/if}
            <li data-section="related">{relatedLine(m.related.phase, m.related.items.length)}</li>
          </ul>
          <Button variant="secondary" style="align-self: flex-start;" onclick={() => m.links.openAdd()}>{#snippet icon()}<Icon name="link" size={16} />{/snippet}Add link</Button>
          <LinkAddForm model={m} />
          <div class="pg-adds">
            <details class="pg-add" data-section="subtasks"><summary class="pg-lnk">Add a sub-task</summary><div class="addrow"><Field id="pg-sub" label="New sub-task title" labelHidden placeholder="Add a sub-task" bind:value={m.subtasks.title} onkeydown={(e) => { if (e.key === 'Enter') void m.subtasks.add(); }} /><Button variant="secondary" aria-disabled={m.subtasks.adding ? 'true' : undefined} onclick={() => { if (!m.subtasks.adding) void m.subtasks.add(); }}>Add</Button><span class="vk-visually-hidden" role="status">{m.subtasks.adding ? 'Adding…' : ''}</span></div></details>
            <details class="pg-add"><summary class="pg-lnk">Attach a link</summary><div class="addrow"><Field id="pg-ref" label="Attach a link or Superlibrary item" labelHidden type="url" inputmode="url" placeholder="Paste a link to attach" bind:value={m.refsForm.url} onkeydown={(e) => { if (e.key === 'Enter') void m.refsForm.add(); }} /><button class="vk-button vk-button--secondary" type="button" onclick={() => m.refsForm.add()}>Add</button></div></details>
          </div>
        </section>
      </section>

      <aside class="pg-col" aria-labelledby="pg-rec">
        <h2 id="pg-rec" class="pg-sc">The record</h2>
        <section class="pg-enc">
          <h3><span class="no">Enclosure IV</span>What happened</h3>
          {#if m.counts.handoff}
            <div class="pg-small" data-section="handoff"><HandoffView handoff={m.handoff} testid="carried-handoff" /></div>
          {:else}
            <p class="pg-small" style="margin: 0px;" data-section="handoff">{q?.known ? paperProvenance(q.queuedByName, q.byAgent, m.grantCovers, handoff, 'page') : handoff}</p>
          {/if}
          <div data-section="activity" style="display: contents">
            {#each runs as g, ri (g.runId)}
              {@const a = attemptOf(g.runId)}
              {@const who = name(g.agentId) || 'An agent'}
              {@const word = a ? attemptWord(a) : (g.outcome ?? 'working')}
              {@const isOpen = m.isRunOpen(g.runId, ri === 0)}
              {@const tools = m.toolsShown(g.runId)}
              <button class="pg-atthead" type="button" data-attempt-head={g.runId} aria-expanded={isOpen} aria-controls="pg-run-{g.runId}" style={ri > 0 ? 'border-top: 1px solid var(--vk-color-line); padding-top: var(--vk-space-3);' : undefined} onclick={() => m.toggleRun(g.runId, ri === 0)}><span class="pg-p"><b>Attempt {attemptNo(g.runId) || runs.length - ri}</b> · {who} · {paperAttempt(g.counts.total, g.counts.error, word, ri > 0 && a?.endedAt ? clockHM(a.endedAt) : null)}</span></button>
              {#if isOpen}
                {@const view = visibleActivities(g.activities, isNarrative, tools, isControlRow)}
                {@const rows = view.rows}
                <div id="pg-run-{g.runId}" class="pg-attbody">
                <ol class="pg-log">
                  {#each rows as ev, ei (ev.seq)}<li><Face id={who} label={who} mood={ev.signal === 'stop' ? 'needs' : 'thinking'} size={24} /><span class:stop={ev.signal === 'stop' && lead.needsYou && ri === 0}>{paperLogRow(ev)}<span class="t">{paperLogTime(ev.ts, ei === rows.length - 1)}</span><ToolCallDetails parameter={ev.parameter} result={ev.result} cls="pg-details" /></span></li>{/each}
                </ol>
                {#if tools || (g.counts.action > 0 && !view.shownBecauseNoNarrative)}<button class="vk-button vk-button--quiet" type="button" style="align-self: flex-start; font-size: var(--vk-text-sm);" data-attempt-tools={g.runId} aria-pressed={tools} onclick={() => m.toggleTools(g.runId)}>{tools ? 'Hide tool calls' : `Show tool calls · all ${g.counts.total} events`}</button>{/if}
                </div>
              {/if}
            {/each}
          </div>
          <p class="pg-small" style="margin: 0px;" data-section="decisions">Decisions: {#if m.decidedGates.length}{m.decidedGates.map((d) => `${d.decision ?? d.status} at ${stageNameOf(d.stageKey)}`).join('; ')}.{:else}none yet.{/if}</p>
        </section>
        <section class="pg-enc">
          <h3><span class="no">Accounts</span>Cost and delivery</h3>
          <span class="pg-fig" data-section="cost">{usd(card.costUsd)}</span>
          <span class="pg-small" data-section="attempts">{paperCostLine(m.estimate?.estimatedUsd ?? null, m.attempts)}</span>
          <div class="pg-meter"><i style="width: {m.costPct}%;"></i></div>
          {#if m.counts.deliveryActive}<div data-section="delivery"><DeliveryPanel model={m} /></div>{:else}<p class="pg-small" style="margin: 0px;" data-section="delivery">No approved delivery on this card.</p>{/if}
        </section>
      </aside>
    </div>

    <footer class="pg-colophon" data-section="cardActions">
      {#if !m.archived}<Button variant="secondary" aria-disabled={m.archiving ? 'true' : undefined} onclick={() => { if (!m.archiving) void m.archive(); }}>{#snippet icon()}<Icon name="archive" size={16} />{/snippet}Archive card</Button><span class="vk-visually-hidden" role="status">{m.archiving ? 'Archiving…' : ''}</span>{/if}
      <Button style="background: var(--vk-color-surface); color: var(--vk-color-text); box-shadow: inset 0 0 0 2px var(--vk-color-text);" onclick={() => m.remove()}>Delete card</Button>
      <span style="flex: 1 1 auto;"></span>
      <span class="pg-small">Opened from {m.boardName} · <a href={boardHref}>Back to the board</a> · card {m.shortId}</span>
    </footer>
  </main>
</div>
