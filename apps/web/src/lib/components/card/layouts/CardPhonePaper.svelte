<!-- apps/web/src/lib/components/card/layouts/CardPhonePaper.svelte -->
<script lang="ts">
  /** SP-Phone-Card-Paper: a letter, your reply, and five enclosures. */
  import '../phone/phone-card-shared.css';
  import '../phone/pc-paper.css';
  import { Button, Face } from '@superjackfruit/vibekit';
  import { paperSalutation } from '../paper-words';
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
  import GatePaper from '../gate/GatePaper.svelte';
  import QuestionPaper from '../question/QuestionPaper.svelte';
  import CardStatePaper from '../state/CardStatePaper.svelte';
  import { paperCaption, paperDay, paperEnclosures, paperEye, paperScFacts, phoneCardView, resumeOptions, trackAria, triesWord, stripWord } from '../phone/phone-card-words';
  import { whenLabelLong } from '$lib/when';
  import { sentenceCase } from '$lib/words';

  let { model, vibe, phase, personName, gate, question, pageHref, onClose }: CardLayoutProps = $props();

  const v = $derived(phoneCardView(model, { members: model.members, agents: model.agents, cardCap: model.cardUsdCap, nowMs: Date.now() }));
  const c = $derived(model.card!);
  const lead = $derived(model.lead!);
  const enc = $derived(paperEnclosures(v, model));
  const eye = $derived(paperEye(lead.needsYou && !model.archived, c.archivedAt));
  const role = $derived((model.agents.find((a) => a.id === model.agent.id)?.role ?? 'agent').toLowerCase());
</script>

<div class="ph-root pcard pcard--paper">
  <div class="sh">
    <button class="back" type="button" onclick={onClose}><PhoneIcon name="back" /><span>{model.boardName}</span></button>
    <span style="display: inline-flex; flex: 0 0 auto; align-items: center; gap: 4px;">
      <a class="ib" href={pageHref} aria-label="Open as a page" style="width: auto; padding: 0px 12px; gap: 6px; border: 1px solid var(--vk-color-line); font-size: 15px; font-weight: 600; text-decoration: none; white-space: nowrap;"><PhoneIcon name="open" form="plain" size={16} stroke={2} /><span>Open as a page</span></a>
      <button class="ib" type="button" aria-label="Close (Esc)" onclick={onClose}><PhoneIcon name="close" size={16} /><span aria-hidden="true">Close</span></button>
    </span>
  </div>
  <header class="head">
    <p class="light">{paperDay(new Date(), phase)}</p>
    {#if eye}<p class="eye" class:ar={model.archived}>{eye}</p>{/if}
    <h2 id="drawer-title" class:sr={model.edit.editing}>Re: {c.title}</h2>
    <div class="trk">
      <div class="bars" role="img" aria-label={trackAria(model.stages, model.stageIndex, lead.kind, { archived: model.archived })}>
        {#each model.stages as s, i (s.key)}<i class={i < model.stageIndex ? 'd' : i === model.stageIndex ? (lead.needsYou && !model.archived ? 's' : 'd') : undefined}></i>{/each}
      </div>
      <p>{paperCaption(model.stages, model.stageIndex, lead.needsYou)}</p>
    </div>
  </header>

  {#if model.localError}<p class="hint" role="alert" data-section="error">{model.localError}</p>{:else}<div data-section="error" hidden></div>{/if}
  {#if model.edit.editing}<PhoneEditForm {model} />{:else}<div data-section="editForm" hidden></div>{/if}
  {#if model.archived}<CardStatePaper kind="archived" {model} />{/if}

  {#if !model.detailLoaded}
    <CardStatePaper kind="loading" {model} /><div data-section="resume" hidden></div>
  {:else if gate}
    <GatePaper boardId={gate.boardId} gate={gate.gate} error={gate.error} onResponse={gate.onResponse} agent={model.agent} {lead} {vibe} /><div data-section="resume" hidden></div>
  {:else if question}
    <QuestionPaper model={question.model} elicitation={question.elicitation} agent={question.agent} {vibe} /><div data-section="resume" hidden></div>
  {:else if lead.kind === 'done'}
    <CardStatePaper kind="done" {model} /><div data-section="resume" hidden></div>
  {:else}
    <article class="paper" aria-label="Letter from {v.speaker}">
      <p class="dear">{paperSalutation(personName)}</p>
      {#if lead.sentence}<p class="voice">{sentenceCase(lead.sentence)}</p>{/if}
      <div class="sigb">
        <span class="portrait"><Face id={model.agent.id ?? v.lastAgent?.id ?? c.id} label={v.speaker} mood={lead.needsYou && !model.archived ? 'needs' : model.agent.mood} size={32} /></span>
        <p><em>{v.speaker}</em><small>{role}, on {model.stageName}{lead.at ? ` · ${whenLabelLong(lead.at)}` : ''}</small></p>
      </div>
      <p class="sc" data-section="facts">{#each paperScFacts(v, model) as f, i (i)}<span data-section={i === 0 ? 'status' : undefined}>{f}</span>{/each}</p>
    </article>
    {#if v.live && model.resume.show}
      <section class="reply" aria-labelledby="reply-h" data-section="resume">
        <h3 id="reply-h">Your reply <small>{stripWord(lead.kind)} · {triesWord(c.attemptCount)}</small></h3>
        <div class="fld">
          <label for="resume-at">Resume at stage</label>
          <select id="resume-at" class="sel" bind:value={model.resume.target}>{#each resumeOptions(model.resume.targets) as o (o.value)}<option value={o.value} disabled={o.disabled}>{o.label}</option>{/each}</select>
        </div>
        <div class="fld">
          <label for="resume-note">Note: what changed, or what should {v.speaker} do differently? It reads this.</label>
          <textarea id="resume-note" class="ta" rows="2" maxlength="8000" bind:value={model.resume.note} aria-invalid={model.resume.error ? 'true' : undefined}></textarea>
          {#if model.resume.error}<p class="hint" role="alert">{model.resume.error}</p>{/if}
        </div>
        <Button variant="primary" class="send" type="button" aria-disabled={model.resume.busy ? 'true' : undefined} data-busy={model.resume.busy ? 'true' : undefined} onclick={() => { if (!model.resume.busy) void model.resume.submit(); }}>{#snippet icon()}<PhoneIcon name="send" />{/snippet}Send back to work</Button><span class="sr" role="status">{model.resume.busy ? 'Sending…' : ''}</span>
      </section>
    {:else}<div data-section="resume" hidden></div>{/if}
  {/if}

  <!-- Below the lead, the sections wait for the card's log (hidden, not moved): the lead's real height is only known then, and sections drawn under the loading shape would jump on a phone. -->
  <section class="encl" aria-labelledby="encl-h" hidden={!model.detailLoaded}>
    <h3 id="encl-h">Enclosed</h3>
    <details class="en"><summary><b>The brief</b><span>{enc.brief}</span></summary><div class="in">
      <h4>What was asked</h4><p class="wrap" data-section="description">{c.spec?.description ?? 'No description.'}</p>
      <h4>Things to prove</h4><ol class="nl" data-section="criteria">{#each model.acceptanceCriteria ?? [] as a, i (i)}<li>{a}</li>{/each}</ol>
      {#if v.plan?.length}<h4>Plan</h4><div class="sec-k" data-section="plan"><PhonePlan view={v} speaker={v.speaker} /></div>{:else}<span hidden data-section="plan"></span>{/if}
      <h4>Details</h4><div class="sec-k" data-section="details"><PhoneDetails view={v} spec={c.spec} criteria={model.acceptanceCriteria} heading="Things to prove" boardId={model.boardId ?? ''} /></div>
      <h4>Project</h4><div class="sec-k" data-section="project">
        {#if v.project.line}<p>{v.project.line}</p><button class="lnk" type="button" onclick={() => model.project.start()}>Change project</button>
        {:else}<p class="muted">No project.</p><button class="lnk" type="button" onclick={() => model.project.start()}>Assign to a project</button>{/if}
      </div>
    </div></details>
    <details class="en"><summary><b>What happened</b><span>{enc.happened}</span></summary><div class="in">
      <h4>Session activity</h4><div class="sec-k" data-section="activity"><PhoneRuns view={v} {model} /></div>
      {#if v.decisions}<h4>Decisions</h4><p class="muted" data-section="decisions">{v.decisions} decided</p>{:else}<span hidden data-section="decisions"></span>{/if}
      <h4>Handoff</h4>{#if model.counts.handoff}<div data-section="handoff"><HandoffView handoff={model.handoff} testid="carried-handoff" /></div>{:else}<p data-section="handoff">{v.handoff.text}</p>{/if}
      <h4>Attempts</h4><div class="sec-k" data-section="attempts"><PhoneAttempts view={v} /></div>
      <h4>Cost</h4><p data-section="cost"><strong class="mono">{v.cost.amount}</strong>{v.cost.rest}</p>
      {#if model.counts.deliveryActive}<h4>Delivery</h4><p data-section="delivery">Delivery is active on this card; approve or change it on the card page.</p>{:else}<div data-section="delivery" hidden></div>{/if}
    </div></details>
    <details class="en"><summary><b>Who is waiting</b><span>{enc.waiting}</span></summary><div class="in">
      <h4>Links</h4><div class="sec-k" data-section="links"><PhoneLinks view={v} {model} /></div>
      <h4>Sub-tasks</h4><div class="sec-k" data-section="subtasks"><PhoneSubtasks view={v} {model} /></div>
    </div></details>
    <details class="en"><summary><b>Attached</b><span>{enc.attached}</span></summary><div class="in">
      <h4>References</h4><div class="sec-k" data-section="references"><PhoneRefs view={v} {model} /></div>
      <h4>Related prior work</h4><p class="muted" data-section="related">{v.related ? `${v.related} related` : 'No related prior work found in Superlibrary.'}</p>
    </div></details>
    <details class="en" open><summary><b>Correspondence</b><span>{enc.correspondence}</span></summary><div class="in"><div class="sec-k" data-section="comments"><PhoneComments {model} /></div></div></details>
  </section>

  <footer class="foot" hidden={!model.detailLoaded} aria-label="Card actions" data-section="cardActions">
    <button class="ed" type="button" data-section="editButton" onclick={() => model.edit.start()}><PhoneIcon name="pen" />Edit card</button>
    <div class="cact">
      {#if model.archived}<Button variant="secondary" class="sbtn" type="button" onclick={() => model.restore()}>Archived — restore</Button>
      {:else}<Button variant="secondary" class="sbtn" type="button" aria-disabled={model.archiving ? 'true' : undefined} data-busy={model.archiving ? 'true' : undefined} onclick={() => { if (!model.archiving) void model.archive(); }}>{#snippet icon()}<PhoneIcon name="archive" />{/snippet}Archive card</Button><span class="sr" role="status">{model.archiving ? 'Archiving…' : ''}</span>{/if}
      <Button variant="danger" onclick={() => model.remove()}>Delete card</Button>
    </div>
  </footer>
</div>
