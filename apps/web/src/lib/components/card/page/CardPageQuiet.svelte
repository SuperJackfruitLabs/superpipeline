<!-- apps/web/src/lib/components/card/page/CardPageQuiet.svelte -->
<script lang="ts">
  /** Quiet's card page (SP-CardPage-Quiet): plain sections, whole sentences, no motion. */
  import './card-page-quiet.css';
  import { faceSvg } from '@superjackfruit/vibekit';
  import { app } from '$lib/stores/app.svelte';
  import { appearance } from '$lib/appearance.svelte';
  import { displayAgent, displayPrincipal } from '$lib/names';
  import { signOut } from '$lib/components/shell/account';
  import { Button, Field, StageTrack } from '@superjackfruit/vibekit';
  import { isControlRow, isNarrative, visibleActivities } from '$lib/activity-groups';
  import CardEditForm from '../CardEditForm.svelte';
  import DeliveryPanel from '../DeliveryPanel.svelte';
  import LinkAddForm from '../LinkAddForm.svelte';
  import HandoffView from '../HandoffView.svelte';
  import RawJson from '../RawJson.svelte';
  import ToolCallDetails from '../ToolCallDetails.svelte';
  import TokenText from '../TokenText.svelte';
  import SpecValueView from '../SpecValueView.svelte';
  import GateQuiet from '../gate/GateQuiet.svelte';
  import QuestionQuiet from '../question/QuestionQuiet.svelte';
  import { specGroups, specRowCount } from '../spec-groups';
  import { referenceSource, refLabel } from '../references';
  import { safeHref } from '../spec-details';
  import { QUIET_TOKEN_RE, sessionIdOf } from '../tokens';
  import { attemptWord, stateWord, stripAria, stripKind } from '../state-words';
  import { handoffLine, initials, planNone, projectLine, relatedLine } from '../card-words';
  import {
    quietAgentPage, quietAskedBy, quietAttempts, quietCost, quietHistoryHead, quietHistoryLine, quietPageMeta, quietResumeOption, quietRow,
    quietSubtasks, quietWho,
  } from '../quiet-words';
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
  const sid = $derived(sessionIdOf(lead.sentence));
  const runs = $derived([...m.activityGroups].reverse());
  const stageNameOf = (key: string | null) => m.stages.find((s) => s.key === key)?.name ?? key ?? 'Unknown stage';
  const stopped = $derived(['stopped', 'failed', 'budget'].includes(lead.kind) && !m.archived);
  const face = (who: string, mood: 'needs' | 'resting' | 'working', size = 24) => faceSvg(who, { mood, size, label: who });
  let rawOpen = $state(false);
  const act = (fn: () => unknown) => (e: MouseEvent) => { e.preventDefault(); void fn(); };
  $effect(() => m.comments.attach());
  // vibekit Field keeps its textarea to itself; the attachment hands it to the resume model, which focuses it.
  const noteRef = (el: Element) => { m.resume.noteEl = el as HTMLTextAreaElement; return () => { if (m.resume.noteEl === el) m.resume.noteEl = undefined; }; };
</script>

{#snippet hidden(key: string)}<span hidden data-section={key}></span>{/snippet}

<div class="qp" style="position: relative;">
  <a class="qp-skip" href="#content">Skip to content</a>
  <header class="qp-bar">
    <div class="qp-in">
      <nav class="qp-row" aria-label="Card window">
        <span class="qp-name">Superpipeline</span>
        <a href={boardHref}>Back to {m.boardName} board</a>
        <span style="flex: 1 1 auto;"></span>
        <button class="qp-link" type="button" aria-haspopup="dialog" onclick={() => (appearance.pickerOpen = true)}>Appearance</button>
        <span>{userName} — <a href="/" onclick={act(signOut)}>Sign out</a></span>
      </nav>
    </div>
  </header>
  <main class="qp-main" id="content">
    <div class="qp-row" style="min-height: 0px; gap: var(--vk-space-2) var(--vk-space-5);">
      <span>Opened from {m.boardName} · <a href={boardHref}>Back to the board</a></span>
      <span>Card id <span class="qp-id">{m.shortId}</span> · <button class="qp-link" type="button" aria-label="Copy card id {m.shortId}" onclick={() => m.copyId()}>{m.copied === 'id' ? 'Copied' : 'Copy'}</button></span>
      <button class="qp-link" type="button" onclick={() => m.copyLink()}>{m.copied === 'link' ? 'Link copied' : 'Copy link to this card'}</button>
      <a href="#edit" role="button" data-section="editButton" onclick={act(() => m.edit.start())}>Edit card</a>
    </div>
    <h1>{card.title}</h1>
    {#if editing}<div data-section="editForm"><CardEditForm model={m} /></div>{:else}{@render hidden('editForm')}{/if}
    <p class="qp-meta" data-section="facts">{quietPageMeta({ state: stateWord(card, lead), ageHours: m.ageHours, i: m.stageIndex, n: m.stages.length, stage: m.stageName, attempt: card.attemptCount, priority: card.priority, due: card.dueAt, labels: m.labels.map((l) => l.name) })}</p>
    <section class="qp-sec" aria-labelledby="qp-stages-h">
      <h3 id="qp-stages-h">Stages</h3>
      <StageTrack form="page" stages={m.stages.map((s) => s.name)} current={m.stageIndex} status={m.trackStatus} label={stripAria(m.stageIndex, m.stages.length, m.stageName, kind, 'drawer')} />
    </section>
    <section class="qp-sec" aria-labelledby="qp-people-h" data-section="status">
      <h3 id="qp-people-h">People</h3>
      <dl class="qp-dl">
        <dt>Agent</dt><dd><span class="qp-face">{@html face(m.delegate.id ? m.delegate.name : lastName, 'resting')}</span> {quietAgentPage(lastName, card.attemptCount, stageNameOf(m.attempts.at(-1)?.stageKey ?? card.currentStageKey), m.delegate.id ? m.delegate.name : null)}</dd>
        <dt>Owner</dt><dd><span class="qp-ini" aria-hidden="true">{initials(ownerName)}</span> {ownerName}</dd>
        {#if q?.known}<dt>Asked by</dt><dd>{#if q.byAgent}<span class="qp-face">{@html face(q.queuedByName, 'resting')}</span>{' '}{/if}{quietAskedBy(q.queuedByName, q.byAgent, m.grantCovers)}</dd>{/if}
      </dl>
    </section>
    <div class="qp-cols">
      <div class="qp-col">
        {#if m.localError}<p role="alert" data-section="error">{m.localError}</p>{:else}{@render hidden('error')}{/if}
        {#if gate}
          <GateQuiet boardId={gate.boardId} gate={gate.gate} error={gate.error} onResponse={gate.onResponse} agent={m.agent} {lead} {vibe} />{@render hidden('resume')}
        {:else if question}
          <QuestionQuiet model={question.model} elicitation={question.elicitation} agent={question.agent} {vibe} />{@render hidden('resume')}
        {:else if stopped && m.resume.show}
          <fieldset data-section="resume">
            <legend>Your decision is needed</legend>
            {#if lead.at}<p class="qp-by"><span class="qp-face">{@html face(agentName, 'needs')}</span>{quietWho(lead.kind, agentName, lead.at)}</p>{/if}
            {#if lead.sentence}<p class="qp-said"><TokenText text={lead.sentence} cls="qp-id" re={QUIET_TOKEN_RE} /></p>{/if}
            {#if sid}<p><button class="qp-link" type="button" style="min-height: 44px;" onclick={() => m.copySessionId(sid)}>{m.copied === 'session' ? 'Copied' : 'Copy session id'}</button></p>{/if}
            <Field id="qp-resume-at" label="Resume at stage" control="select" style="max-width: 360px;" bind:value={m.resume.target}
              options={m.resume.targets.filter((t) => t.allowed).map((t) => ({ value: t.key, label: quietResumeOption(t.n, t.name, t.current) }))} />
            <Field id="qp-note" {@attach noteRef} label="What changed, or what should the agent do differently? It reads this." control="textarea" maxlength={8000}
              hint={m.resume.error ? undefined : 'You must write a note before sending. Up to 8000 characters.'} error={m.resume.error || undefined} bind:value={m.resume.note} />
            <div class="qp-acts"><Button aria-disabled={m.resume.busy ? 'true' : undefined} onclick={() => { if (!m.resume.busy) void m.resume.submit(); }}>Send back to work</Button><span class="vk-visually-hidden" role="status">{m.resume.busy ? 'Sending…' : ''}</span></div>
          </fieldset>
        {:else}
          {#if lead.sentence}<section class="qp-sec"><p class="qp-by">{agentName} wrote:</p><p class="qp-said">{lead.sentence}</p></section>{/if}
          {@render hidden('resume')}
        {/if}
        <section class="qp-sec" aria-labelledby="qp-desc"><h2 id="qp-desc">Description</h2>{#if card.spec?.description}<p data-section="description" style="white-space: pre-line">{String(card.spec.description)}</p>{:else}<p data-section="description">None.</p>{/if}</section>
        <section class="qp-sec" aria-labelledby="qp-ac"><h2 id="qp-ac">Acceptance criteria ({m.counts.criteria})</h2>{#if m.acceptanceCriteria?.length}<ol data-section="criteria">{#each m.acceptanceCriteria as c, i (i)}<li>{c}</li>{/each}</ol>{:else}<p data-section="criteria">None.</p>{/if}</section>
        <section class="qp-sec" aria-labelledby="qp-brief" data-section="details">
          <h2 id="qp-brief">Brief details ({specRowCount(groups)})</h2>
          {#each groups as g (g.label)}<h3>{g.label}</h3><dl class="qp-dl">{#each g.rows as r (r.key)}<dt>{r.label}</dt><dd data-testid="spec-value-{r.key}"><SpecValueView value={r.value} v={{ clamp: 'qp-clamp', more: 'qp-link', matrixLinks: false }} /></dd>{/each}</dl>{/each}
          <div class="qp-acts"><a href="#raw" role="button" aria-expanded={rawOpen} onclick={act(() => (rawOpen = !rawOpen))}>{rawOpen ? 'Hide raw JSON' : 'View raw JSON'}</a>{#if rawOpen}<button class="qp-link" type="button" style="min-height: 44px;" onclick={() => m.copySpec()}>{m.copied === 'spec' ? 'Copied' : 'Copy'}</button>{/if}</div>
          {#if rawOpen}<RawJson value={card.spec} bare />{/if}
        </section>
        <section class="qp-sec" aria-labelledby="qp-plan" data-section="plan"><h2 id="qp-plan">Plan</h2>{#if m.plan}<ol>{#each m.plan as st, i (i)}<li>{st.text}{st.done ? ' (done)' : ''}</li>{/each}</ol>{:else}<p>{planNone(m.agent.name)}</p>{/if}</section>
        <section class="qp-sec" aria-labelledby="qp-links" data-section="links">
          <h2 id="qp-links">Links ({m.counts.links})</h2>
          {#if m.hasAnyLink}<ul>{#each [...m.linkGroups.blockedBy, ...m.linkGroups.blocks, ...m.linkGroups.relates] as row (row.title)}<li>{row.title} <button class="qp-link" type="button" onclick={() => m.links.remove(row.remove)}>Remove</button></li>{/each}</ul>{:else}<p>Nothing blocks this card and it blocks nothing.</p>{/if}
          <div class="qp-acts"><a href="#add-link" role="button" onclick={act(() => m.links.openAdd())}>Add link</a></div>
          <LinkAddForm model={m} />
        </section>
        <section class="qp-sec" aria-labelledby="qp-refs">
          <h2 id="qp-refs">References and related prior work</h2>
          <ul>
            {#each m.otherRefs as r, i (r.id)}<li data-section={i === 0 ? 'references' : undefined}>{#if safeHref(r.url)}<a href={safeHref(r.url)!}>{r.title ?? refLabel(r)}</a>{:else}{r.title ?? refLabel(r)}{/if} ({referenceSource(r)})</li>{/each}
            {#if m.otherRefs.length === 0}<li data-section="references">No references.</li>{/if}
            <li data-section="related">{relatedLine(m.related.phase, m.related.items.length)}</li>
          </ul>
        </section>
      </div>
      <div class="qp-col">
        <section class="qp-sec" aria-labelledby="qp-hist">
          <h2 id="qp-hist">History ({m.counts.runs} run{m.counts.runs === 1 ? '' : 's'})</h2>
          {#if m.counts.handoff}<div data-section="handoff"><HandoffView handoff={m.handoff} testid="carried-handoff" /></div>
          {:else}<p data-section="handoff">{handoffLine({ handoff: null, stageIndex: m.stageIndex, stages: m.stages, queuedByName: q?.queuedByName ?? 'someone', createdAt: card.createdAt })}</p>{/if}
          <div data-section="activity" style="display: contents">
            {#each runs as g, ri (g.runId)}
              {@const a = m.attempts.find((x) => x.runId === g.runId)}
              {@const no = (m.attempts.findIndex((x) => x.runId === g.runId) + 1) || runs.length - ri}
              {@const isOpen = m.isRunOpen(g.runId, ri === 0)}
              {@const tools = m.toolsShown(g.runId)}
              <h3><button class="qp-att" type="button" data-attempt-head={g.runId} aria-expanded={isOpen} aria-controls="qp-run-{g.runId}" onclick={() => m.toggleRun(g.runId, ri === 0)}>{quietHistoryHead(no, stageNameOf(g.stageKey), name(g.agentId) || 'an agent')}</button></h3>
              <p>{quietHistoryLine(a ? attemptWord(a) : (g.outcome ?? 'working'), a?.endedAt ?? null, g.counts.total, g.counts.error)}</p>
              {#if isOpen}
                {@const view = visibleActivities(g.activities, isNarrative, tools, isControlRow)}
                <div id="qp-run-{g.runId}" style="display: contents">
                  <ol>{#each view.rows as ev (ev.seq)}<li>{quietRow(ev)}<ToolCallDetails parameter={ev.parameter} result={ev.result} cls="qp-details" /></li>{/each}</ol>
                  {#if tools || (g.counts.action > 0 && !view.shownBecauseNoNarrative)}<div class="qp-acts"><button class="qp-lnk" type="button" data-attempt-tools={g.runId} aria-pressed={tools} onclick={() => m.toggleTools(g.runId)}>{tools ? 'Hide tool calls' : `Show tool calls (all ${g.counts.total} events)`}</button></div>{/if}
                </div>
              {/if}
            {/each}
          </div>
        </section>
        <section class="qp-sec" aria-labelledby="qp-dec" data-section="decisions"><h2 id="qp-dec">Decisions</h2>{#if m.decidedGates.length}<ul>{#each m.decidedGates as d (d.id)}<li>{d.decision ?? d.status} at {stageNameOf(d.stageKey)}{d.decidedBy ? `, by ${displayPrincipal(d.decidedBy, app.members)}` : ''}.</li>{/each}</ul>{:else}<p>None yet.</p>{/if}</section>
        <section class="qp-sec" aria-labelledby="qp-com" data-section="comments">
          <h2 id="qp-com">Comments</h2>
          {#if m.comments.comments.length}<ul>{#each m.comments.comments as c (c.id)}<li><b>{c.author.name ?? c.author.id}:</b> <span style="white-space: pre-wrap">{c.deletedAt ? 'Comment deleted' : c.body}</span></li>{/each}</ul>{:else}<p>No comments yet. The agent that works this card reads them.</p>{/if}
          <Field id="qp-comment" label="Add a comment" control="textarea" maxlength={8192} style="min-height: 96px;" bind:value={m.comments.draft} />
          {#if m.comments.error}<p role="alert">{m.comments.error}</p>{/if}
          <div class="qp-acts"><Button variant="secondary" aria-disabled={m.comments.posting ? 'true' : undefined} onclick={() => { if (!m.comments.posting) void m.comments.submit(); }}>Comment</Button><span class="vk-visually-hidden" role="status">{m.comments.posting ? 'Posting…' : ''}</span></div>
        </section>
        <section class="qp-sec" aria-labelledby="qp-cost">
          <h2 id="qp-cost">Sub-tasks, project, cost and delivery</h2>
          <dl class="qp-dl">
            <div data-section="subtasks" style="display: contents"><dt>Sub-tasks</dt><dd>{quietSubtasks(card.openChildCount, m.children.length)} <a href="#subtask" role="button" onclick={act(() => document.getElementById('qp-sub')?.focus())}>Add a sub-task</a></dd></div>
            <div data-section="project" style="display: contents"><dt>Project</dt><dd>{#if m.project.editing}<Field id="qp-project" label="Project" labelHidden control="select" bind:value={m.project.projectId} onchange={() => void m.project.onProjectChange()} options={[{ value: '', label: 'No project' }, ...app.projects.map((p) => ({ value: p.id, label: p.name }))]} /> <button class="qp-link" type="button" aria-disabled={m.project.saving ? 'true' : undefined} onclick={() => { if (!m.project.saving) void m.project.save(); }}>Save</button><span class="vk-visually-hidden" role="status">{m.project.saving ? 'Saving…' : ''}</span>{:else}{m.projectName ? `${projectLine(m.projectName, m.milestoneName)}.` : 'None.'} <a href="#project" role="button" onclick={act(() => m.project.start())}>{m.projectName ? 'Change project' : 'Assign to a project'}</a>{/if}</dd></div>
            <div data-section="cost" style="display: contents"><dt>Cost</dt><dd>{quietCost(card.costUsd, m.estimate?.estimatedUsd ?? null)}</dd></div>
            <div data-section="attempts" style="display: contents"><dt>Attempts</dt><dd>{quietAttempts(m.attempts, name)}</dd></div>
            <div data-section="delivery" style="display: contents"><dt>Delivery</dt><dd>{#if m.counts.deliveryActive}<DeliveryPanel model={m} />{:else}None approved{/if}</dd></div>
          </dl>
          <p class="vk-visually-hidden"><label for="qp-sub">New sub-task title</label><input id="qp-sub" type="text" bind:value={m.subtasks.title} onkeydown={(e) => { if (e.key === 'Enter') void m.subtasks.add(); }} /></p>
        </section>
        <section class="qp-sec" aria-labelledby="qp-act" data-section="cardActions">
          <h2 id="qp-act">Card actions</h2>
          <div class="qp-acts">
            <a href="#edit" role="button" onclick={act(() => m.edit.start())}>Edit card</a>
            {#if !m.archived}<Button variant="secondary" aria-disabled={m.archiving ? 'true' : undefined} onclick={() => { if (!m.archiving) void m.archive(); }}>Archive card</Button><span class="vk-visually-hidden" role="status">{m.archiving ? 'Archiving…' : ''}</span>{/if}
            <Button style="background: var(--vk-color-surface); color: var(--vk-color-text); box-shadow: inset 0 0 0 2px var(--vk-color-text);" onclick={() => m.remove()}>Delete card</Button>
          </div>
        </section>
      </div>
    </div>
    <p style="border-top: 1px solid var(--vk-color-line); padding-top: var(--vk-space-4);">Opened from {m.boardName} · <a href={boardHref}>Back to the board</a></p>
  </main>
</div>
