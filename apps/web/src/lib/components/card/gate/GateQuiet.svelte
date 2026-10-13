<!-- apps/web/src/lib/components/card/gate/GateQuiet.svelte -->
<script lang="ts">
  /**
   * A pending approval in Quiet (SP-Card-States-Quiet A and E): one signal-edged fieldset with the
   * agent's line, the subject, three radios, the note and Submit. `part="controls"` draws only the
   * choices, the note and the button (cell E). A refusal sits beside the button.
   */
  import '../quiet-states.css';
  import { Button, Face, Field, type Vibe } from '@superjackfruit/vibekit';
  import type { Gate, GateConflict, GateDecision } from '$lib/api';
  import RawJson from '../RawJson.svelte';
  import StructuredValue from '../StructuredValue.svelte';
  import { humanizeKey } from '../spec-groups';
  import { gateConflictSentence } from '../card-words';
  import { QUIET_CAPTIONS, quietCount } from '../quiet-words';
  import type { CardLead } from '../card-lead';
  import type { CardAgent } from '../layouts/types';
  import { GATE_NOTE_MAX, GateDecisionModel, roleOf, sealOf } from './gate-decision.svelte';

  let { boardId, gate, error, onResponse, agent, lead, conflict = null, conflictWho = '', onRefresh = async () => {}, part = 'all', showLead = true }: {
    boardId: string; gate: Gate; error: string | null; onResponse: (d: GateDecision, r: Response) => Promise<boolean>;
    agent: CardAgent; lead: CardLead; vibe: Vibe; conflict?: GateConflict | null; conflictWho?: string; onRefresh?: () => Promise<void>;
    part?: 'all' | 'controls'; showLead?: boolean;
  } = $props();

  const model = new GateDecisionModel(() => ({ boardId, gate, onResponse }));
  $effect(() => model.follow(gate.id));
  const ORDER = ['approve', 'changes', 'reject'] as const;
  const ordered = $derived([...model.options].sort((a, b) => ORDER.indexOf(roleOf(a.name)!) - ORDER.indexOf(roleOf(b.name)!)));
  const DESCRIPTION: Record<string, string> = { approve_manual: 'You post the approved text yourself.', approve_automatic: 'The board posts the approved text for you.' };
  const ROLE_DESCRIPTION = { approve: 'The card moves on to the next stage.', changes: 'Needs a note. The agent reads it on its next attempt.', reject: 'Stop the card here.' } as const;
  const describe = (o: { name: string; description?: string }): string => o.description ?? DESCRIPTION[o.name] ?? ROLE_DESCRIPTION[roleOf(o.name)!];
  const subject = $derived(gate.approvalSubject ?? null);
  const rows = $derived(subject ? Object.entries(subject.canonical).map(([k, v]) => ({ k, label: humanizeKey(k), v })) : []);
  const flat = (v: unknown): string | null => (typeof v === 'string' ? v : Array.isArray(v) && v.every((x) => typeof x === 'string') ? v.join(', ') : null);
  const name = $derived(agent.name || 'The agent');
  const group = $derived(`gate-${part}-${gate.id}`);
  let fieldWrap = $state<HTMLElement | undefined>();
  $effect(() => { model.noteEl = fieldWrap?.querySelector('textarea') ?? undefined; });
  let copied = $state(false);
  let rawOpen = $state(false);
  async function copyDigest(): Promise<void> {
    try { await navigator.clipboard.writeText(subject!.digest); copied = true; setTimeout(() => (copied = false), 2000); } catch { copied = false; }
  }
  // Busy keeps the button enabled (aria-disabled, clicks ignored) so it keeps focus; the status says it.
  function send(e: Event): void { e.preventDefault(); if (!model.busy) void model.submit(); }
</script>

<form class="qcs-form" onsubmit={send} style="display: contents">
  <fieldset>
    <legend>Your decision is needed</legend>
    {#if part === 'all'}
      {#if showLead}<p class="qcs-by"><span class="qcs-face"><Face id={name} label={name} mood="needs" size={20} /></span>{name}: {lead.sentence ?? gate.summary ?? 'Waiting for your review.'}</p>{/if}
      {#if subject}
        <p style="font-weight: 700;">What you are approving (revision {subject.revision})</p>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex: a scrollable region must be keyboard reachable -->
        <div class="qcs-subject" tabindex="0" role="region" aria-label="The approval subject">
          <dl class="qcs-dl">{#each rows as r (r.k)}<dt>{r.label}</dt><dd>{#if flat(r.v) !== null}{flat(r.v)}{:else}<StructuredValue value={r.v} />{/if}</dd>{/each}</dl>
          <p>Sealed: <span class="qcs-mono">{sealOf(subject.digest)}</span>. You approve exactly this version. <button class="qcs-linkbtn" type="button" onclick={copyDigest}>{copied ? 'Copied' : 'Copy digest'}</button> · <button class="qcs-linkbtn" type="button" aria-expanded={rawOpen} onclick={() => (rawOpen = !rawOpen)}>{rawOpen ? 'Hide raw JSON' : 'View raw JSON'}</button></p>
          {#if rawOpen}<RawJson value={subject.canonical} />{/if}
        </div>
      {/if}
    {/if}
    {#each ordered as opt (opt.name)}
      <label class="qcs-radio">
        <input type="radio" name={group} value={opt.name} bind:group={model.selected} aria-labelledby="{group}-{opt.name}-t" aria-describedby={part === 'all' ? `${group}-${opt.name}-d` : undefined} />
        <span><b id="{group}-{opt.name}-t">{opt.title}</b>{#if part === 'all'}<br /><span id="{group}-{opt.name}-d">{describe(opt)}</span>{/if}</span>
      </label>
    {/each}
    <!-- vibekit's Field; the wrapper hands its textarea to the model, which focuses it on a missing note. -->
    <div style="display: contents" bind:this={fieldWrap}>
      <Field id="gate-note-{part === 'all' ? 'q' : 'e'}-{gate.id}" control="textarea" rows={4} maxlength={GATE_NOTE_MAX} bind:value={model.note}
        label={model.needNote ? 'Say what needs to change' : `Note for ${name} (optional)`}
        hint={model.needNote || part !== 'all' ? undefined : quietCount(model.note.length, GATE_NOTE_MAX)}
        error={model.needNote ? 'Request changes needs a note.' : undefined} />
    </div>
    <div class="qcs-row" class:qcs-row--alert={!!(conflict || error)}>
      <Button type="submit" aria-disabled={model.busy ? 'true' : undefined} aria-busy={model.busy ? 'true' : undefined}>Submit decision</Button>
      {#if conflict}
        <div class="qcs-alert" role="alert" style="flex: 1 1 220px;"><b>Not recorded.</b> {gateConflictSentence(conflict, conflictWho)} <button class="qcs-linkbtn" type="button" onclick={() => onRefresh()}>Refresh to see it</button>.</div>
      {:else if error}
        <div class="qcs-alert" role="alert" style="flex: 1 1 220px;"><b>Not recorded.</b> {error}</div>
      {/if}
    </div>
    {#if model.needPick}<p class="qcs-meta" role="status">Pick a decision first.</p>{:else if part === 'all'}<p class="qcs-meta">{QUIET_CAPTIONS.gate}</p>{/if}
    <span class="vk-visually-hidden" role="status">{model.busy ? 'Recording…' : ''}</span>
  </fieldset>
</form>
