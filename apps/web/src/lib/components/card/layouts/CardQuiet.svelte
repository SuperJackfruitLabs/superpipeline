<!-- apps/web/src/lib/components/card/layouts/CardQuiet.svelte -->
<script lang="ts">
  /**
   * Quiet's card drawer (SP-Card-Quiet): plain sections and whole sentences. The panel, the bar (way
   * back, Open, Close), the title and the meta line are vibekit's Drawer; under them come the one
   * signal-edged fieldset (the decision, the question, or the reply) and the sections in two columns.
   * Every section key is drawn once (`data-section`).
   */
  import './card-quiet.css';
  import '../quiet-states.css';
  import { Button, Drawer, Face, Field } from '@superjackfruit/vibekit';
  import { CARD_LAYOUTS } from '$lib/layouts';
  import { displayAgent } from '$lib/names';
  import { isControlRow, isNarrative, visibleActivities } from '$lib/activity-groups';
  import CardEditForm from '../CardEditForm.svelte';
  import DeliveryPanel from '../DeliveryPanel.svelte';
  import LinkAddForm from '../LinkAddForm.svelte';
  import HandoffView from '../HandoffView.svelte';
  import LibraryArtifact from '../LibraryArtifact.svelte';
  import RawJson from '../RawJson.svelte';
  import ToolCallDetails from '../ToolCallDetails.svelte';
  import TokenText from '../TokenText.svelte';
  import SpecValueView from '../SpecValueView.svelte';
  import GateQuiet from '../gate/GateQuiet.svelte';
  import QuestionQuiet from '../question/QuestionQuiet.svelte';
  import CardStateQuiet from '../state/CardStateQuiet.svelte';
  import { specGroups, specRowCount } from '../spec-groups';
  import { referenceSource, refLabel } from '../references';
  import { safeHref } from '../spec-details';
  import { QUIET_TOKEN_RE, sessionIdOf } from '../tokens';
  import { ageWords } from '$lib/age';
  import { lcFirst } from '$lib/words';
  import { attemptWord, stateWord } from '../state-words';
  import { handoffLine, projectLine, relatedLine } from '../card-words';
  import {
    quietAskedBy, quietAttempts, quietCost, quietDrawerMeta, quietHistoryHead, quietHistoryLine, quietResumeOption, quietRow, quietSubtasks, quietWho,
  } from '../quiet-words';
  import type { CardLayoutProps } from './types';

  let { model: m, vibe, gate, question, pageHref, onClose }: CardLayoutProps = $props();
  const card = $derived(m.card!);
  const lead = $derived(m.lead!);
  const editing = $derived(m.edit.editing);
  const name = (id: string | null) => (id ? displayAgent(id, m.agents) : '');
  const agentName = $derived(m.agent.name || 'the agent');
  const lastName = $derived(name(m.lastAgentId));
  const ownerName = $derived(m.ownerName);
  const q = $derived(m.provenance);
  const groups = $derived(specGroups(card.spec, { criteriaHeading: 'Acceptance criteria' }));
  const sid = $derived(sessionIdOf(lead.sentence));
  const runs = $derived([...m.activityGroups].reverse());
  const stageNameOf = (key: string | null) => m.stages.find((s) => s.key === key)?.name ?? key ?? 'Unknown stage';
  const stopped = $derived(['stopped', 'failed', 'budget'].includes(lead.kind) && !m.archived);
  const done = $derived(lead.kind === 'done');
  const meta = $derived(quietDrawerMeta({ i: m.stageIndex, n: m.stages.length, stage: m.stageName, delegate: m.delegate.id ? m.delegate.name : null, last: lastName, attempt: card.attemptCount, state: stateWord(card, lead), needsYou: lead.needsYou && !m.archived, ageHours: m.ageHours }));
  let rawOpen = $state(false);
  let subAdd = $state(false);
  let refAdd = $state(false);
  $effect(() => m.comments.attach());
  // vibekit Field keeps its textarea to itself; the attachment hands it to the resume model, which focuses it.
  const noteRef = (el: Element) => { m.resume.noteEl = el as HTMLTextAreaElement; return () => { if (m.resume.noteEl === el) m.resume.noteEl = undefined; }; };
  function back(e: MouseEvent): void {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onClose();
  }
</script>

{#snippet hidden(key: string)}<span hidden data-section={key}></span>{/snippet}
{#snippet backLink()}<a class="qcd-back" href="/b/{m.boardId}" onclick={back}>← {m.boardName} board</a>{/snippet}
{#snippet tools()}<Button variant="tool" href={pageHref} target="_blank" rel="noopener" aria-label="Open in new window">Open in new window</Button>{/snippet}

<Drawer open={true} head="stacked" title={card.title} description={meta} back={backLink} {tools} width={CARD_LAYOUTS.quiet.width} onclose={onClose}>
<div class="qcd">
  {#if m.archived}<CardStateQuiet kind="archived" model={m} />{/if}
  {#if m.localError}<p role="alert" data-section="error">{m.localError}</p>{:else}{@render hidden('error')}{/if}
  {#if editing}<div data-section="editForm"><CardEditForm model={m} /></div>{:else}{@render hidden('editForm')}{/if}

  {#if !m.detailLoaded}
    <CardStateQuiet kind="loading" model={m} />
    {@render hidden('resume')}
  {:else if question}
    <QuestionQuiet model={question.model} elicitation={question.elicitation} agent={question.agent} {vibe} />
    {@render hidden('resume')}
  {:else if gate}
    <GateQuiet {...gate} agent={m.agent} {lead} {vibe} />
    {@render hidden('resume')}
  {:else if m.archived}
    <CardStateQuiet kind="restore" model={m} />
    {@render hidden('resume')}
  {:else if stopped && m.resume.show}
    <fieldset class="qcd-form" data-section="resume">
      <legend>Your decision is needed</legend>
      {#if lead.at}<p class="qcd-by"><span class="qcd-face"><Face id={agentName} label={agentName} mood="needs" size={20} /></span>{quietWho(lead.kind, agentName, lead.at)}</p>{/if}
      {#if lead.sentence}<p class="qcd-said"><TokenText text={lead.sentence} cls="qcd-id" re={QUIET_TOKEN_RE} /></p>{/if}
      {#if sid}<div class="qcd-row"><button class="qcd-lb" type="button" onclick={() => m.copySessionId(sid)}>{m.copied === 'session' ? 'Copied' : 'Copy session id'}</button></div>{/if}
      <Field id="qcd-resume-at" label="Resume at stage" control="select" bind:value={m.resume.target}
        options={m.resume.targets.filter((t) => t.allowed).map((t) => ({ value: t.key, label: quietResumeOption(t.n, t.name, t.current) }))} />
      <Field id="qcd-note" {@attach noteRef} label="What changed, or what should the agent do differently? It reads this." control="textarea" maxlength={8000} rows={4}
        hint={m.resume.error ? undefined : 'You must write a note before sending. Up to 8000 characters.'} error={m.resume.error || undefined} bind:value={m.resume.note} />
      <div class="qcd-row"><Button aria-disabled={m.resume.busy ? 'true' : undefined} onclick={() => { if (!m.resume.busy) void m.resume.submit(); }}>Send back to work</Button><span class="vk-visually-hidden" role="status">{m.resume.busy ? 'Sending…' : ''}</span></div>
    </fieldset>
  {:else}
    {#if lead.sentence}<p class="qcd-by">{agentName} {done ? 'finished it and wrote' : 'wrote'}:</p><p class="qcd-said"><TokenText text={lead.sentence} cls="qcd-id" re={QUIET_TOKEN_RE} /></p>{/if}
    {@render hidden('resume')}
  {/if}

  <div class="qcd-cols">
    <section class="qcd-sec">
      <h3>Details</h3>
      <dl class="qcd-dl" data-section="status">
        <dt>State</dt><dd>{stateWord(card, lead)}{lead.needsYou && !m.archived && m.ageHours !== null ? `, for ${ageWords(m.ageHours)}` : ''}</dd>
        <dt>Agent</dt><dd>{#if m.delegate.id}<span class="qcd-face"><Face id={m.delegate.name} label={m.delegate.name} mood="resting" size={20} /></span> {m.delegate.name}{:else}None holding it.{#if lastName}{' '}Last run: <span class="qcd-face"><Face id={lastName} label={lastName} mood="resting" size={20} /></span> {lastName}{/if}{/if}</dd>
        <dt>Owner</dt><dd>{ownerName}</dd>
        {#if q?.known}<dt>Asked by</dt><dd>{#if q.byAgent}<span class="qcd-face"><Face id={m.queuedByName} label={m.queuedByName} mood="resting" size={20} /></span>{' '}{/if}{quietAskedBy(m.queuedByName, q.byAgent, m.grantCovers)}</dd>{/if}
        <dt>Priority</dt><dd>{card.priority > 0 ? `P${card.priority}` : 'None'}</dd>
        <dt>Due</dt><dd>{card.dueAt ? card.dueAt.slice(0, 10) : 'No due date'}</dd>
        <dt>Labels</dt><dd>{m.labels.length ? m.labels.map((l) => l.name).join(', ') : 'None'}</dd>
        <dt>Attempt</dt><dd>{card.attemptCount}</dd>
        <dt>Card id</dt><dd><span class="qcd-id" data-section="facts">{m.shortId}</span> · <button class="qcd-ln" type="button" aria-label="Copy card id {m.shortId}" onclick={() => m.copyId()}>{m.copied === 'id' ? 'Copied' : 'Copy'}</button></dd>
      </dl>
      <div class="qcd-row"><button class="qcd-ln" type="button" data-section="editButton" aria-pressed={editing} onclick={() => m.edit.start()}>Edit card</button></div>
    </section>
    <section class="qcd-sec"><h3>Description</h3>{#if card.spec?.description}<p data-section="description" style="white-space: pre-line">{String(card.spec.description)}</p>{:else}<p data-section="description">None.</p>{/if}</section>
    <section class="qcd-sec"><h3>Acceptance criteria</h3>{#if m.acceptanceCriteria?.length}<ul data-section="criteria">{#each m.acceptanceCriteria as c, i (i)}<li>{c}</li>{/each}</ul>{:else}<p data-section="criteria">None.</p>{/if}</section>
    <section class="qcd-sec" data-section="plan"><h3>Plan</h3>{#if m.plan}<ol>{#each m.plan as st, i (i)}<li>{st.text}{st.done ? ' (done)' : ''}</li>{/each}</ol>{:else}<p>None yet.</p>{/if}</section>
    <section class="qcd-sec" data-section="details">
      <h3>Brief details ({specRowCount(groups)})</h3>
      {#each groups as g (g.label)}<h4>{g.label}</h4><dl class="qcd-dl">{#each g.rows as r (r.key)}<dt>{r.label}</dt><dd data-testid="spec-value-{r.key}"><SpecValueView value={r.value} v={{ more: 'qcd-lb', id: 'qcd-id', matrixLinks: true }} /></dd>{/each}</dl>{/each}
      <div class="qcd-row"><button class="qcd-ln" type="button" aria-expanded={rawOpen} onclick={() => (rawOpen = !rawOpen)}>{rawOpen ? 'Hide raw JSON' : 'View raw JSON'}</button>{#if rawOpen}<button class="qcd-ln" type="button" onclick={() => m.copySpec()}>{m.copied === 'spec' ? 'Copied' : 'Copy'}</button>{/if}</div>
      {#if rawOpen}<RawJson value={card.spec} bare />{/if}
    </section>
    <section class="qcd-sec">
      <h3>History ({m.counts.runs} run{m.counts.runs === 1 ? '' : 's'})</h3>
      {#if m.counts.handoff}<div data-section="handoff"><HandoffView handoff={m.handoff} testid="carried-handoff" /></div>
      {:else}<p data-section="handoff">{handoffLine({ handoff: null, stageIndex: m.stageIndex, stages: m.stages, queuedByName: m.queuedByName || 'someone', createdAt: card.createdAt })}</p>{/if}
      <div data-section="activity" style="display: contents">
        <ul>
          {#each runs as g, ri (g.runId)}
            {@const a = m.attempts.find((x) => x.runId === g.runId)}
            {@const tools = m.toolsShown(g.runId)}
            {@const expanded = m.isRunOpen(g.runId, false) || tools}
            <li data-attempt={g.runId}><button class="qcd-att" type="button" data-attempt-head={g.runId} aria-expanded={expanded} aria-controls="qcd-run-{g.runId}" onclick={() => m.setRun(g.runId, !expanded)}>{quietHistoryHead((m.attempts.findIndex((x) => x.runId === g.runId) + 1) || runs.length - ri, stageNameOf(g.stageKey), name(g.agentId) || 'an agent')}</button>: {lcFirst(quietHistoryLine(a ? attemptWord(a) : (g.outcome ?? 'working'), a?.endedAt ?? null, g.counts.total, g.counts.error))}
              {#if g.counts.action > 0 && (ri === 0 || expanded)}<button class="qcd-ln" type="button" data-attempt-tools={g.runId} aria-pressed={tools} onclick={() => m.toggleTools(g.runId)}>{tools ? 'Hide tool calls' : 'Show tool calls'}</button>{/if}
              {#if expanded}<ol id="qcd-run-{g.runId}">{#each visibleActivities(g.activities, isNarrative, tools, isControlRow).rows as ev (ev.seq)}<li>{quietRow(ev)}<ToolCallDetails parameter={ev.parameter} result={ev.result} cls="qcd-details" /></li>{/each}</ol>{/if}
            </li>
          {/each}
        </ul>
      </div>
    </section>
    <section class="qcd-sec" data-section="decisions"><h3>Decisions</h3>{#if m.decidedGates.length}<ul>{#each m.decidedGates as d (d.id)}<li>{d.decision ?? d.status} at {stageNameOf(d.stageKey)}{d.decidedBy ? `, by ${m.principalName(d.decidedBy)}` : ''}.</li>{/each}</ul>{:else}<p>None yet.</p>{/if}</section>
    <section class="qcd-sec" data-section="comments">
      <h3>Comments</h3>
      {#if m.comments.comments.length}<ul>{#each m.comments.comments as c (c.id)}<li><b>{m.authorName(c.author)}:</b> <span style="white-space: pre-wrap">{c.deletedAt ? 'Comment deleted' : c.body}</span></li>{/each}</ul>{:else}<p>No comments yet. The agent that works this card reads them.</p>{/if}
      <Field id="qcd-comment" label="Add a comment" control="textarea" maxlength={8192} rows={4} style="min-height: 80px;" bind:value={m.comments.draft} />
      {#if m.comments.error}<p role="alert">{m.comments.error}</p>{/if}
      <div class="qcd-row"><Button variant="secondary" aria-disabled={m.comments.posting ? 'true' : undefined} onclick={() => { if (!m.comments.posting) void m.comments.submit(); }}>Comment</Button><span class="vk-visually-hidden" role="status">{m.comments.posting ? 'Posting…' : ''}</span></div>
    </section>
    <section class="qcd-sec" data-section="links">
      <h3>Links ({m.counts.links})</h3>
      {#if m.hasAnyLink}<ul>{#each [...m.linkGroups.blockedBy, ...m.linkGroups.blocks, ...m.linkGroups.relates] as row (row.title)}<li>{row.title} <button class="qcd-ln" type="button" aria-disabled={m.links.removing.size > 0 ? 'true' : undefined} onclick={() => { if (m.links.removing.size === 0) void m.links.remove(row.remove); }}>Remove</button></li>{/each}</ul>{:else}<p>Nothing blocks this card and it blocks nothing.</p>{/if}
      <div class="qcd-row"><button class="qcd-ln" type="button" onclick={() => m.links.openAdd()}>Add link</button>{#if !refAdd}<button class="qcd-ln" type="button" onclick={() => (refAdd = true)}>Attach a link</button>{/if}</div>
      {#if refAdd}<span class="qcd-row"><label class="qcd-ln" for="qcd-ref">Attach a link or Superlibrary item</label><input id="qcd-ref" class="vk-field__input" type="url" bind:value={m.refsForm.url} onkeydown={(e) => { if (e.key === 'Enter') void m.refsForm.add(); }} /><Button variant="secondary" onclick={() => m.refsForm.add()}>Add</Button></span>{/if}
      <LinkAddForm model={m} />
    </section>
    <section class="qcd-sec">
      <h3>Sub-tasks, Project, Cost, Delivery</h3>
      <dl class="qcd-dl">
        <div data-section="subtasks" style="display: contents"><dt>Sub-tasks</dt><dd>{m.children.length === 0 ? 'None.' : quietSubtasks(card.openChildCount, m.children.length)} {#if subAdd}<span class="qcd-row"><label class="qcd-ln" for="qcd-sub">New sub-task title</label><input id="qcd-sub" class="vk-field__input" type="text" bind:value={m.subtasks.title} onkeydown={(e) => { if (e.key === 'Enter') void m.subtasks.add(); }} /><Button variant="secondary" aria-disabled={m.subtasks.adding ? 'true' : undefined} onclick={() => { if (!m.subtasks.adding) void m.subtasks.add(); }}>Add</Button></span>{:else}<button class="qcd-ln" type="button" onclick={() => (subAdd = true)}>Add a sub-task</button>{/if}</dd></div>
        <div data-section="project" style="display: contents"><dt>Project</dt><dd>{#if m.project.editing}<Field id="qcd-project" label="Project" control="select" bind:value={m.project.projectId} onchange={() => void m.project.onProjectChange()} options={[{ value: '', label: 'No project' }, ...m.projects.map((p) => ({ value: p.id, label: p.name }))]} /> <Button aria-disabled={m.project.saving ? 'true' : undefined} onclick={() => { if (!m.project.saving) void m.project.save(); }}>Save</Button> <button class="qcd-ln" type="button" onclick={() => m.project.cancel()}>Cancel</button>{:else}{m.projectName ? `${projectLine(m.projectName, m.milestoneName)}.` : 'None.'} <button class="qcd-ln" type="button" onclick={() => m.project.start()}>{m.projectName ? 'Change project' : 'Assign to a project'}</button>{/if}</dd></div>
        <div data-section="cost" style="display: contents"><dt>Cost</dt><dd>{quietCost(card.costUsd, m.estimate?.estimatedUsd ?? null)}</dd></div>
        <div data-section="attempts" style="display: contents"><dt>Attempts</dt><dd>{quietAttempts(m.attempts, name)}</dd></div>
        <div data-section="delivery" style="display: contents"><dt>Delivery</dt><dd>{#if m.counts.deliveryActive}<DeliveryPanel model={m} />{:else}None approved{/if}</dd></div>
      </dl>
    </section>
    <section class="qcd-sec">
      <h3>References and related prior work</h3>
      <ul>
        {#each m.otherRefs as r, i (r.id)}<li data-section={i === 0 ? 'references' : undefined}>{#if safeHref(r.url)}<a href={safeHref(r.url)!} target="_blank" rel="noreferrer">{r.title ?? refLabel(r)}</a>{:else}{r.title ?? refLabel(r)}{/if}{r.subtitle ? `, ${r.subtitle}` : ''}<br /><span class="qcd-src">{referenceSource(r)}</span></li>{/each}
        {#each m.libraryRefs as l (l.ref.id)}<li><LibraryArtifact itemId={l.itemId} version={l.version} title={l.ref.title || l.itemId} open={false} /></li>{/each}
        {#if m.otherRefs.length === 0}<li data-section="references">No references.</li>{/if}
        <li data-section="related">{relatedLine(m.related.phase, m.related.items.length)}</li>
      </ul>
    </section>
    <section class="qcd-sec" data-section="cardActions">
      <h3>Card actions</h3>
      <div class="qcd-row">
        {#if !m.archived}<Button variant="secondary" aria-disabled={m.archiving ? 'true' : undefined} onclick={() => { if (!m.archiving) void m.archive(); }}>Archive card</Button><span class="vk-visually-hidden" role="status">{m.archiving ? 'Archiving…' : ''}</span>{/if}
        <Button variant="quiet" onclick={() => m.remove()}>Delete card</Button>
      </div>
    </section>
  </div>
</div>
</Drawer>
