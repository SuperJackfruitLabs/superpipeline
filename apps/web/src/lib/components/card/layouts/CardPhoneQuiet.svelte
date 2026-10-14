<!-- apps/web/src/lib/components/card/layouts/CardPhoneQuiet.svelte -->
<script lang="ts">
  import { hasStructuredDetail } from '$lib/components/card/phone/phone-card-words';
  /** SP-Phone-Card-Quiet: plain text, one fieldset for the decision, sixteen sections. */
  import '../phone/phone-card-shared.css';
  import '../phone/pc-quiet.css';
  import { Button, Face } from '@superjackfruit/vibekit';
  import type { CardLayoutProps } from './types';
  import PhoneIcon from '$lib/components/parts/PhoneIcon.svelte';
  import PhoneDetails from '../phone/PhoneDetails.svelte';
  import HandoffView from '../HandoffView.svelte';
  import PhoneRuns from '../phone/PhoneRuns.svelte';
  import PhoneAttempts from '../phone/PhoneAttempts.svelte';
  import PhoneRefs from '../phone/PhoneRefs.svelte';
  import PhoneLinks from '../phone/PhoneLinks.svelte';
  import PhoneSubtasks from '../phone/PhoneSubtasks.svelte';
  import PhoneComments from '../phone/PhoneComments.svelte';
  import PhonePlan from '../phone/PhonePlan.svelte';
  import PhoneEditForm from '../phone/PhoneEditForm.svelte';
  import GateQuiet from '../gate/GateQuiet.svelte';
  import QuestionQuiet from '../question/QuestionQuiet.svelte';
  import CardStateQuiet from '../state/CardStateQuiet.svelte';
  import { paperEye, phoneCardView, quietAgent, quietAskedBy, quietInStage, quietLead, quietMetaTail, quietStages, quietState, resumeOptions } from '../phone/phone-card-words';
  import { sentenceCase } from '$lib/words';

  let { model, vibe, gate, question, pageHref, onClose }: CardLayoutProps = $props();

  const v = $derived(phoneCardView(model, { members: model.members, agents: model.agents, cardCap: model.cardUsdCap, nowMs: Date.now() }));
  const c = $derived(model.card!);
  const lead = $derived(model.lead!);
</script>

<div class="ph-root pcard pcard--quiet">
  <div class="top">
    <button class="back" type="button" onclick={onClose}><span aria-hidden="true">←&nbsp;</span>{model.boardName} board</button>
    <span style="display: inline-flex; align-items: center; gap: 4px;">
      <a class="ib" href={pageHref} aria-label="Open as a page" style="padding: 0px 10px; font-size: 17px; text-decoration: underline; text-underline-offset: 4px; white-space: nowrap;">Open as a page</a>
      <button class="ib" type="button" aria-label="Close (Esc)" style="padding: 0px 10px; font-size: 17px; text-decoration: underline; text-underline-offset: 4px;" onclick={onClose}>Close</button>
    </span>
  </div>
  <header class="hd">
    <h2 id="drawer-title" class:sr={model.edit.editing}>{c.title}</h2>
    <p class="meta">Stage {model.stageIndex + 1} of {model.stages.length}: {model.stageName} · Agent: <span class="face" style="vertical-align: -4px;"><Face id={model.agent.id ?? v.lastAgent?.id ?? c.id} label={v.speaker} mood={lead.needsYou && !model.archived ? 'needs' : model.agent.mood} size={20} /></span> {v.speaker} · {model.archived ? paperEye(false, c.archivedAt) : quietMetaTail(lead.kind, v.ageWords)}</p>
  </header>

  {#if model.localError}<p class="hint" role="alert" data-section="error">{model.localError}</p>{:else}<div data-section="error" hidden></div>{/if}
  {#if model.edit.editing}<PhoneEditForm {model} />{:else}<div data-section="editForm" hidden></div>{/if}

  {#if model.archived}
    <CardStateQuiet kind="archived" {model} /><div data-section="resume" hidden></div>
  {:else if !model.detailLoaded}
    <CardStateQuiet kind="loading" {model} /><div data-section="resume" hidden></div>
  {:else if gate}
    <GateQuiet boardId={gate.boardId} gate={gate.gate} error={gate.error} onResponse={gate.onResponse} agent={model.agent} {lead} {vibe} /><div data-section="resume" hidden></div>
  {:else if question}
    <QuestionQuiet model={question.model} elicitation={question.elicitation} agent={question.agent} {vibe} /><div data-section="resume" hidden></div>
  {:else if v.live && model.resume.show}
    <fieldset class="fs" data-section="resume">
      <legend>Your decision is needed</legend>
      <p class="why">{quietLead(lead.kind, c.attemptCount)}</p>
      {#if lead.sentence}<p class="lead">{v.speaker} wrote: {sentenceCase(lead.sentence)}</p>{/if}
      <div class="fld">
        <label for="resume-at">Resume at stage</label>
        <select id="resume-at" class="sel" bind:value={model.resume.target}>{#each resumeOptions(model.resume.targets) as o (o.value)}<option value={o.value} disabled={o.disabled}>{o.label}</option>{/each}</select>
      </div>
      <div class="fld">
        <label for="resume-note">Note for {v.speaker}</label>
        <span class="hint" id="note-hint">Say what changed, or what to do differently. {v.speaker} reads this.</span>
        <textarea id="resume-note" class="ta" rows="3" maxlength="8000" aria-describedby="note-hint" bind:value={model.resume.note} aria-invalid={model.resume.error ? 'true' : undefined}></textarea>
        {#if model.resume.error}<p class="hint" role="alert">{model.resume.error}</p>{/if}
      </div>
      <Button variant="primary" class="go" type="button" aria-disabled={model.resume.busy ? 'true' : undefined} data-busy={model.resume.busy ? 'true' : undefined} onclick={() => { if (!model.resume.busy) void model.resume.submit(); }}>Send back to work</Button><span class="sr" role="status">{model.resume.busy ? 'Sending…' : ''}</span>
    </fieldset>
  {:else}<div data-section="resume" hidden></div>{/if}

  <section class="sx" hidden={!model.detailLoaded} aria-labelledby="s-det">
    <h3 id="s-det">Details</h3>
    <dl class="facts" data-section="facts">
      <div style="display: contents;" data-section="status"><dt>State</dt><dd>{quietState(lead.kind, lead.needsYou, model.archived)}</dd></div>
      <dt>Agent</dt><dd>{quietAgent(model.delegate.id ? model.delegate.name : null, v.lastAgent?.name ?? null)}</dd>
      <dt>Owner</dt><dd>{v.ownerName}</dd>
      {#if v.queuer}<dt>Asked by</dt><dd>{quietAskedBy(v.queuer.name, v.grantOwnerName)}</dd>{/if}
      <dt>Priority</dt><dd>{v.priorityWord === 'none' ? 'None' : v.priorityWord}</dd>
      <dt>Due</dt><dd>{v.dueWord ?? 'None'}</dd>
      <dt>Labels</dt><dd>{v.labelsWord ?? 'None'}</dd>
      <dt>In stage</dt><dd>{quietInStage(model.stageName, v.ageWords, c.attemptCount)}</dd>
      <dt>Stages</dt><dd>{quietStages(model.stages, model.stageIndex)}</dd>
      <dt>Card id</dt><dd><span class="mono id">{c.id}</span><button class="atm" type="button" aria-label="Copy card id" onclick={() => model.copyId()}>{model.copied === 'id' ? 'Copied' : 'Copy'}</button></dd>
    </dl>
    <button class="lnk" type="button" data-section="editButton" onclick={() => model.edit.start()}><PhoneIcon name="pen" />Edit card</button>
    <details class="dsc" data-section="details" open={!model.counts.description || hasStructuredDetail(v.groups, model.acceptanceCriteria)}><summary>Show the {v.fieldsCount} fields of the brief</summary><div class="in"><PhoneDetails view={v} spec={c.spec} criteria={model.acceptanceCriteria} heading="Things to prove" boardId={model.boardId ?? ''} /></div></details>
  </section>
  {#if c.spec?.description}<section class="sx" hidden={!model.detailLoaded} aria-labelledby="s-desc" data-section="description"><h3 id="s-desc">Description</h3><p class="wrap">{c.spec.description}</p></section>{:else}<span hidden data-section="description"></span>{/if}
  <section class="sx" hidden={!model.detailLoaded} aria-labelledby="s-cri" data-section="criteria"><h3 id="s-cri">Acceptance criteria ({model.counts.criteria} things to prove)</h3>
    <details class="dsc"><summary>Show the {model.counts.criteria} things to prove</summary><div class="in"><ol class="nl">{#each model.acceptanceCriteria ?? [] as a, i (i)}<li>{a}</li>{/each}</ol></div></details>
  </section>
  {#if v.plan?.length}<section class="sx" hidden={!model.detailLoaded} aria-labelledby="s-plan" data-section="plan"><h3 id="s-plan">Plan</h3><PhonePlan view={v} speaker={v.speaker} /></section>{:else}<span hidden data-section="plan"></span>{/if}
  <section class="sx" hidden={!model.detailLoaded} aria-labelledby="s-his" data-section="activity"><h3 id="s-his">History ({model.counts.runs} {model.counts.runs === 1 ? 'run' : 'runs'})</h3><PhoneRuns view={v} {model} /></section>
  {#if v.decisions}<section class="sx" hidden={!model.detailLoaded} aria-labelledby="s-dec" data-section="decisions"><h3 id="s-dec">Decisions</h3><p class="muted">{v.decisions} decided.</p></section>{:else}<span hidden data-section="decisions"></span>{/if}
  <section class="sx" hidden={!model.detailLoaded} aria-labelledby="s-com" data-section="comments"><h3 id="s-com">Comments</h3><PhoneComments {model} /></section>
  <section class="sx" hidden={!model.detailLoaded} aria-labelledby="s-lnk" data-section="links"><h3 id="s-lnk">Links</h3><PhoneLinks view={v} {model} /></section>
  <section class="sx" hidden={!model.detailLoaded} aria-labelledby="s-sub" data-section="subtasks"><h3 id="s-sub">Sub-tasks</h3><PhoneSubtasks view={v} {model} /></section>
  <section class="sx" hidden={!model.detailLoaded} aria-labelledby="s-prj" data-section="project"><h3 id="s-prj">Project</h3>
    {#if v.project.line}<p>{v.project.line}</p><button class="lnk" type="button" onclick={() => model.project.start()}>Change project</button>
    {:else}<p class="muted">None.</p><button class="lnk" type="button" onclick={() => model.project.start()}>Assign to a project</button>{/if}
  </section>
  <section class="sx" hidden={!model.detailLoaded} aria-labelledby="s-hand" data-section="handoff"><h3 id="s-hand">Handoff</h3>{#if model.counts.handoff}<HandoffView handoff={model.handoff} testid="carried-handoff" />{:else}<p>{v.handoff.text}</p>{/if}</section>
  <section class="sx" hidden={!model.detailLoaded} aria-labelledby="s-cost" data-section="cost"><h3 id="s-cost">Cost</h3><p><strong class="mono">{v.cost.amount}</strong>{v.cost.rest}</p></section>
  <section class="sx" hidden={!model.detailLoaded} aria-labelledby="s-att" data-section="attempts"><h3 id="s-att">Attempts ({model.counts.attempts})</h3><PhoneAttempts view={v} /></section>
  <section class="sx" hidden={!model.detailLoaded} aria-labelledby="s-del" data-section="delivery"><h3 id="s-del">Delivery</h3><p class="muted">{model.counts.deliveryActive ? 'Delivery is active on this card; approve or change it on the card page.' : 'No approved delivery on this card.'}</p></section>
  <section class="sx" hidden={!model.detailLoaded} aria-labelledby="s-ref" data-section="references"><h3 id="s-ref">References ({model.counts.refs})</h3>
    <details class="dsc"><summary>Show the {model.counts.refs} references</summary><div class="in"><PhoneRefs view={v} {model} /></div></details>
  </section>
  <section class="sx" hidden={!model.detailLoaded} aria-labelledby="s-rel" data-section="related"><h3 id="s-rel">Related prior work</h3><p class="muted">{v.related ? `${v.related} related.` : 'No related prior work found in Superlibrary.'}</p></section>
  <footer class="foot" hidden={!model.detailLoaded} aria-labelledby="s-act" data-section="cardActions">
    <h3 id="s-act">Card actions</h3>
    <div class="cact">
      {#if model.archived}<Button variant="secondary" class="sbtn" type="button" onclick={() => model.restore()}>Restore</Button>
      {:else}<Button variant="secondary" class="sbtn" type="button" aria-disabled={model.archiving ? 'true' : undefined} data-busy={model.archiving ? 'true' : undefined} onclick={() => { if (!model.archiving) void model.archive(); }}>{#snippet icon()}<PhoneIcon name="archive" />{/snippet}Archive card</Button><span class="sr" role="status">{model.archiving ? 'Archiving…' : ''}</span>{/if}
      <Button variant="danger" onclick={() => model.remove()}>Delete card</Button>
    </div>
  </footer>
</div>
