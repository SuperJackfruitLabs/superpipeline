<!-- apps/web/src/lib/components/card/layouts/CardPhoneDaylight.svelte -->
<script lang="ts">
  import { hasStructuredDetail } from '$lib/components/card/phone/phone-card-words';
  /** SP-Phone-Card-Daylight: sticky head, pinned brief, the agent's bubble, the resume dock, 13 sections. */
  import '../phone/phone-card-shared.css';
  import '../phone/pc-daylight.css';
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
  import GateDaylight from '../gate/GateDaylight.svelte';
  import QuestionDaylight from '../question/QuestionDaylight.svelte';
  import CardStateDaylight from '../state/CardStateDaylight.svelte';
  import { RESUME_PLACEHOLDER, daylightCaption, dockHeading, phoneCardView, resumeOptions, trackAria } from '../phone/phone-card-words';
  import { whenLabelLong } from '$lib/when';
  import { sentenceCase } from '$lib/words';

  let { model, vibe, gate, question, pageHref, onClose }: CardLayoutProps = $props();

  const v = $derived(phoneCardView(model, { members: model.members, agents: model.agents, cardCap: model.cardUsdCap, nowMs: Date.now() }));
  const c = $derived(model.card!);
  const lead = $derived(model.lead!);
  const cap = $derived(daylightCaption(model.stages, model.stageIndex, lead.kind, model.archived));
  const dock = $derived(dockHeading(lead.kind, c.attemptCount));
  let pinOpen = $state(false);
</script>

<div class="ph-root pcard pcard--daylight">
  <header class="sh">
    <div class="sh1">
      <span class="eb">{model.boardName} · {model.stageName}</span>
      <span style="display: inline-flex; align-items: center; gap: 4px;">
        <a class="ib" href={pageHref} aria-label="Open as a page" style="width: auto; padding: 0px 12px; gap: 6px; border: 1px solid var(--vk-color-line); font-size: 14px; font-weight: 600; text-decoration: none; white-space: nowrap;"><PhoneIcon name="open" form="plain" size={16} stroke={2} /><span>Open as a page</span></a>
        <button class="ib" type="button" aria-label="Close (Esc)" onclick={onClose}><PhoneIcon name="close" /></button>
      </span>
    </div>
    <div class="tl">
      <h2 id="drawer-title" class:sr={model.edit.editing}>{c.title}</h2>
      <button class="ib" type="button" aria-label="Edit card" data-section="editButton" onclick={() => model.edit.start()}><PhoneIcon name="pen" /></button>
    </div>
    <div class="trk">
      <div class="bars" role="img" aria-label={trackAria(model.stages, model.stageIndex, lead.kind, { archived: model.archived })}>
        {#each model.stages as s, i (s.key)}<i class={i < model.stageIndex ? 'd' : i === model.stageIndex ? (lead.needsYou && !model.archived ? 's' : 'd') : undefined}></i>{/each}
      </div>
      <p>{cap.lead}<b>{cap.bold}</b>{cap.tail}</p>
    </div>
    <div class="st" data-section="status">
      <span class="pill" class:nd={lead.needsYou && !model.archived} class:ar={model.archived}>{v.stateWord}</span>
      <span>{v.claim}</span>
      <span class="muted">owner · {v.ownerName}</span>
      {#if v.queuer?.byAgent}<span class="chip" title={v.grantTitle}><Face id={v.queuer.id} label={v.queuer.name} mood="resting" size={16} /> asked by {v.queuer.name}</span>{/if}
    </div>
    <p class="fct" data-section="facts">
      <span>Priority <b>{v.priorityWord}</b></span>
      <span>Due <b>{v.dueWord ?? 'none'}</b></span>
      <span>Labels <b>{v.labelsWord ?? 'none'}</b></span>
      <span>In {model.stageName} for <b>{v.ageWords}</b></span>
      {#if c.attemptCount > 1}<span><b>Attempt {c.attemptCount}</b></span>{/if}
    </p>
  </header>

  <div class="body">
    {#if model.localError}<p class="hint" role="alert" data-section="error">{model.localError}</p>{:else}<div data-section="error" hidden></div>{/if}
    {#if model.edit.editing}<PhoneEditForm {model} />{:else}<div data-section="editForm" hidden></div>{/if}
    {#if model.archived}<CardStateDaylight kind="archived" {model} />{/if}

    <details class="pin" bind:open={pinOpen}>
      <summary><PhoneIcon name="pin" /><span>What {v.speaker} was asked</span><span class="s">{pinOpen ? 'Hide' : 'Show'}</span></summary>
      <div class="in">
        <p class="wrap" data-section="description">{c.spec?.description ?? 'No description.'}</p>
        <h4>Things to prove · {model.counts.criteria}</h4>
        <ol class="nl" data-section="criteria">{#each model.acceptanceCriteria ?? [] as a, i (i)}<li>{a}</li>{/each}</ol>
      </div>
    </details>

    {#if !model.detailLoaded}
      <CardStateDaylight kind="loading" {model} /><div data-section="resume" hidden></div>
    {:else if gate}
      <GateDaylight boardId={gate.boardId} gate={gate.gate} error={gate.error} onResponse={gate.onResponse} agent={model.agent} {lead} {vibe} /><div data-section="resume" hidden></div>
    {:else if question}
      <QuestionDaylight model={question.model} elicitation={question.elicitation} agent={question.agent} {vibe} /><div data-section="resume" hidden></div>
    {:else if lead.kind === 'done'}
      <CardStateDaylight kind="done" {model} /><div data-section="resume" hidden></div>
    {:else}
      {#if lead.sentence}
        <div class="msg">
          <span class="face"><Face id={model.agent.id ?? v.lastAgent?.id ?? c.id} label={v.speaker} mood={lead.needsYou && !model.archived ? 'needs' : model.agent.mood} size={36} /></span>
          <div class="bwrap">
            <span class="blab">{v.speaker}{lead.needsYou ? ' · needs you' : ''}</span>
            <p class="bub">{sentenceCase(lead.sentence)}</p>
            {#if lead.at}<span class="btime">{whenLabelLong(lead.at)}</span>{/if}
          </div>
        </div>
      {/if}
      {#if v.live && model.resume.show}
        <section class="dock" aria-labelledby="dock-h" data-section="resume">
          <h3 id="dock-h">{dock.title} <small>{dock.small}</small></h3>
          <div class="fld">
            <label for="resume-at">Resume at stage</label>
            <select id="resume-at" class="sel" bind:value={model.resume.target}>
              {#each resumeOptions(model.resume.targets) as o (o.value)}<option value={o.value} disabled={o.disabled}>{o.label}</option>{/each}
            </select>
          </div>
          <div class="fld">
            <label for="resume-note">What changed, or what should {v.speaker} do differently? It reads this.</label>
            <textarea id="resume-note" class="ta" rows="2" maxlength="8000" placeholder={RESUME_PLACEHOLDER} bind:value={model.resume.note} aria-invalid={model.resume.error ? 'true' : undefined}></textarea>
            {#if model.resume.error}<p class="hint" role="alert">{model.resume.error}</p>{/if}
          </div>
          <Button variant="primary" class="go" type="button" aria-disabled={model.resume.busy ? 'true' : undefined} onclick={() => { if (!model.resume.busy) void model.resume.submit(); }}>{#snippet icon()}<PhoneIcon name="send" />{/snippet}Send back to work</Button><span class="sr" role="status">{model.resume.busy ? 'Sending…' : ''}</span>
        </section>
      {:else}<div data-section="resume" hidden></div>{/if}
    {/if}

    <div class="secs">
      <details class="sec" data-section="plan"><summary>Plan <span class="c">{v.planSummary}</span></summary><div class="in"><PhonePlan view={v} speaker={v.speaker} /></div></details>
      <details class="sec" data-section="details" open={!model.counts.description || hasStructuredDetail(v.groups, model.acceptanceCriteria)}><summary>Details <span class="c">{v.fieldsCount} fields</span></summary><div class="in"><PhoneDetails view={v} spec={c.spec} criteria={model.acceptanceCriteria} heading="Things to prove" boardId={model.boardId ?? ''} /></div></details>
      <details class="sec" data-section="project"><summary>Project <span class="c">{v.project.summary}</span></summary><div class="in">
        {#if v.project.line}<p>{v.project.line}</p><button class="lnk" type="button" onclick={() => model.project.start()}>Change project</button>
        {:else}<p class="muted">No project.</p><button class="lnk" type="button" onclick={() => model.project.start()}>Assign to a project</button>{/if}
      </div></details>
      <details class="sec" data-section="links"><summary>Links <span class="c">{model.counts.links}</span></summary><div class="in"><PhoneLinks view={v} {model} /></div></details>
      <details class="sec" data-section="subtasks"><summary>Sub-tasks <span class="c">{v.subtasks.count}</span></summary><div class="in"><PhoneSubtasks view={v} {model} /></div></details>
      <details class="sec" data-section="activity" open><summary>Session activity <span class="c">{model.counts.runs} {model.counts.runs === 1 ? 'run' : 'runs'}</span></summary><div class="in"><PhoneRuns view={v} {model} /></div></details>
      <details class="sec" data-section="decisions"><summary>Decisions <span class="c">{v.decisions}</span></summary><div class="in">
        {#if v.decisions === 0}<p class="muted">No decisions on this card yet.</p>{:else}<ul class="refs">{#each model.decidedGates as g (g.id)}<li class="rf"><b>{g.decision ?? g.status}</b></li>{/each}</ul>{/if}
      </div></details>
      <details class="sec" data-section="comments"><summary>Comments <span class="c">{v.comments}</span></summary><div class="in"><PhoneComments {model} /></div></details>
      <details class="sec" data-section="handoff" open={model.counts.handoff}><summary>Handoff <span class="c">{v.handoff.summary}</span></summary><div class="in">{#if model.counts.handoff}<HandoffView handoff={model.handoff} testid="carried-handoff" />{:else}<p>{v.handoff.text}</p>{/if}</div></details>
      <details class="sec" data-section="cost"><summary>Cost <span class="c">{v.cost.amount}</span></summary><div class="in"><p><strong class="mono">{v.cost.amount}</strong>{v.cost.rest}</p></div></details>
      {#if model.counts.deliveryActive}
        <details class="sec" data-section="delivery"><summary>Delivery <span class="c">active</span></summary><div class="in"><p>Delivery is active on this card; approve or change it on the card page.</p><a class="lnk" href={pageHref}>Open as a page</a></div></details>
      {:else}<div data-section="delivery" hidden></div>{/if}
      <details class="sec" data-section="attempts"><summary>Attempts <span class="c">{model.counts.attempts}</span></summary><div class="in"><PhoneAttempts view={v} /></div></details>
      <details class="sec" data-section="related"><summary>Related prior work <span class="c">{v.related || 'none'}</span></summary><div class="in"><p class="muted">{v.related ? `${v.related} related` : 'No related prior work found in Superlibrary.'}</p></div></details>
      <details class="sec" data-section="references"><summary>References <span class="c">{model.counts.refs}</span></summary><div class="in"><PhoneRefs view={v} {model} /></div></details>
    </div>
  </div>

  <footer class="foot" aria-label="Card actions" data-section="cardActions">
    <div class="cact">
      {#if model.archived}
        <Button variant="secondary" class="sbtn" type="button" onclick={() => model.restore()}>Archived — restore</Button>
      {:else}
        <Button variant="secondary" class="sbtn" type="button" aria-disabled={model.archiving ? 'true' : undefined} onclick={() => { if (!model.archiving) void model.archive(); }}>{#snippet icon()}<PhoneIcon name="archive" />{/snippet}Archive card</Button><span class="sr" role="status">{model.archiving ? 'Archiving…' : ''}</span>
      {/if}
      <Button variant="danger" onclick={() => model.remove()}>Delete card</Button>
    </div>
  </footer>
</div>
