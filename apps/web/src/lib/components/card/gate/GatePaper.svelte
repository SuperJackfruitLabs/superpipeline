<!-- apps/web/src/lib/components/card/gate/GatePaper.svelte -->
<script lang="ts">
  /**
   * A pending approval in Paper (SP-Card-States-Paper A and E): the agent's letter, the subject
   * enclosed, the seal and the reply with its three choices. `part="controls"` draws only the
   * reply (cell E). A refusal sits beside the button, where the reply was sent.
   */
  import '../paper-states.css';
  import { Button, Face, Field, type Vibe } from '@superjackfruit/vibekit';
  import type { Gate, GateConflict, GateDecision } from '$lib/api';
  import { app } from '$lib/stores/app.svelte';
  import { displayPrincipal } from '$lib/names';
  import Icon from '$lib/components/parts/Icon.svelte';
  import RawJson from '../RawJson.svelte';
  import StructuredValue from '../StructuredValue.svelte';
  import { humanizeKey } from '../spec-groups';
  import { gateConflictSentence } from '../card-words';
  import { PAPER_CAPTIONS, PAPER_HINT, digestPaper, firstName, paperWhen } from '../paper-words';
  import type { CardLead } from '../card-lead';
  import type { CardAgent } from '../layouts/types';
  import { GATE_NOTE_MAX, GateDecisionModel, roleOf, sealOf } from './gate-decision.svelte';

  /** `showLead` false: the caller already says the agent's sentence. */
  let { boardId, gate, error, onResponse, agent, lead, conflict = null, onRefresh = async () => {}, part = 'all', personName = 'there', showLead = true }: {
    boardId: string; gate: Gate; error: string | null; onResponse: (d: GateDecision, r: Response) => Promise<boolean>;
    agent: CardAgent; lead: CardLead; vibe: Vibe; conflict?: GateConflict | null; onRefresh?: () => Promise<void>;
    part?: 'all' | 'controls'; personName?: string; showLead?: boolean;
  } = $props();

  const model = new GateDecisionModel(() => ({ boardId, gate, onResponse }));
  $effect(() => model.follow(gate.id));
  const ORDER = ['approve', 'changes', 'reject'] as const;
  const ordered = $derived([...model.options].sort((a, b) => ORDER.indexOf(roleOf(a.name)!) - ORDER.indexOf(roleOf(b.name)!)));
  const subject = $derived(gate.approvalSubject ?? null);
  const rows = $derived(subject ? Object.entries(subject.canonical).map(([k, v]) => ({ k, label: humanizeKey(k), v })) : []);
  const name = $derived(agent.name || 'The agent');
  const noteId = $derived(`gate-note-${part === 'all' ? 'p' : 'e'}-${gate.id}`);
  const group = $derived(`gate-${part}-${gate.id}`);
  let fieldWrap = $state<HTMLElement | undefined>();
  $effect(() => { model.noteEl = fieldWrap?.querySelector('textarea') ?? undefined; });
  let copied = $state(false);
  let rawOpen = $state(false);

  async function copyDigest(): Promise<void> {
    try {
      await navigator.clipboard.writeText(subject!.digest);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      copied = false;
    }
  }
  // Busy keeps the button enabled (aria-disabled, clicks ignored) so it keeps focus; the status says it.
  function send(e: Event): void {
    e.preventDefault();
    if (!model.busy) void model.submit();
  }
  const flat = (v: unknown): string | null => (typeof v === 'string' ? v : Array.isArray(v) && v.every((x) => typeof x === 'string') ? v.join(', ') : null);
</script>

{#if part === 'all'}
  {#if showLead}
    <p class="pcs-dear">Dear {firstName(personName)},</p>
    <p class="pcs-voice">{lead.sentence ?? gate.summary ?? 'Waiting for your review.'}</p>
    <div class="pcs-sign">
      <Face id={name} label={name} mood="needs" size={32} />
      <div><span class="n">{name}</span>{#if lead.at}<p class="pcs-small">{paperWhen(lead.at, new Date().toISOString())}</p>{/if}</div>
    </div>
  {/if}
  {#if subject}
    <details class="pcs-enc" open>
      <summary><span class="t">Enclosed: the approval subject</span><span class="pcs-small">· revision {subject.revision}</span></summary>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex: a scrollable region must be keyboard reachable -->
      <div class="pcs-encbody" tabindex="0" role="region" aria-label="The approval subject">
        <dl class="pcs-dl">
          {#each rows as r (r.k)}<div><dt>{r.label}</dt><dd>{#if flat(r.v) !== null}{flat(r.v)}{:else}<StructuredValue value={r.v} />{/if}</dd></div>{/each}
        </dl>
        <span class="pcs-mono">digest {digestPaper(subject.digest)} · <button class="pcs-linkbtn" type="button" onclick={copyDigest}>{copied ? 'Copied' : 'Copy'}</button> · <button class="pcs-linkbtn" type="button" aria-expanded={rawOpen} onclick={() => (rawOpen = !rawOpen)}>{rawOpen ? 'Hide raw JSON' : 'View raw JSON'}</button></span>
        {#if rawOpen}<RawJson value={subject.canonical} />{/if}
      </div>
    </details>
    <p class="pcs-seal"><Icon name="seal" size={16} /> Approving exactly this version, sealed {sealOf(subject.digest)}.</p>
  {/if}
{/if}

<form class="pcs-reply" onsubmit={send}>
  <h3 class="pcs-h" id="gate-reply-{part}-{gate.id}">Your reply</h3>
  <fieldset class="pcs-choices">
    <legend>Your decision</legend>
    {#each ordered as opt (opt.name)}
      {@const role = roleOf(opt.name)!}
      <label class="pcs-choice">
        <input type="radio" name={group} value={opt.name} bind:group={model.selected} aria-labelledby="{group}-{opt.name}-t" aria-describedby={part === 'all' ? `${group}-${opt.name}-h` : undefined} />
        <span><b id="{group}-{opt.name}-t">{opt.title}</b>{#if part === 'all'}<span class="pcs-small" id="{group}-{opt.name}-h">{opt.description ?? PAPER_HINT[role]}</span>{/if}</span>
      </label>
    {/each}
  </fieldset>
  {#if part === 'all'}
    <!-- vibekit's Field; the wrapper hands its textarea to the model, which focuses it on a missing note. -->
    <div style="display: contents" bind:this={fieldWrap}>
      <Field id={noteId} control="textarea" rows={2} style="min-height: 44px; height: 44px;" maxlength={GATE_NOTE_MAX} bind:value={model.note}
        label={model.needNote ? 'Say what needs to change' : 'Add a note (optional)'}
        error={model.needNote ? 'Request changes needs a note: it threads into the agent’s next attempt.' : undefined}
        placeholder={model.needNote ? undefined : 'Recorded with your decision.'} />
      {#if !model.needNote}<span class="pcs-count">{model.note.length} / {GATE_NOTE_MAX}</span>{/if}
    </div>
  {:else}
    <div style="display: contents" bind:this={fieldWrap}></div>
  {/if}
  <div class="pcs-row" class:pcs-row--alert={part === 'controls' && (conflict || error)}>
    <Button type="submit" aria-disabled={model.busy ? 'true' : undefined} aria-busy={model.busy ? 'true' : undefined}>Send reply</Button>
    {#if conflict}
      <div class="pcs-alert" role="alert"><Icon name="alert" size={18} /><div><b>Not recorded.</b> {gateConflictSentence(conflict, displayPrincipal(conflict.decidedBy, app.members))} <button class="pcs-linkbtn" type="button" onclick={() => onRefresh()}>Refresh to see it</button></div></div>
    {:else if error}
      <div class="pcs-alert" role="alert"><Icon name="alert" size={18} /><div><b>Not recorded.</b> {error}</div></div>
    {:else if model.needPick}
      <span class="pcs-small" role="status">Pick a decision first.</span>
    {:else if part === 'all'}
      <span class="pcs-small">{PAPER_CAPTIONS.gate}</span>
    {/if}
  </div>
  <span class="vk-visually-hidden" role="status">{model.busy ? 'Recording…' : ''}</span>
</form>
