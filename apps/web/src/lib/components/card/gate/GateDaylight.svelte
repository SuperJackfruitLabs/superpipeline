<!-- apps/web/src/lib/components/card/gate/GateDaylight.svelte -->
<script lang="ts">
  /**
   * A pending approval in Daylight (SP-Card-States-Daylight A and E): the agent's line, the flag,
   * the subject before the buttons, the note, the three decisions, and any refusal UNDER them.
   * `part="controls"` draws only the note, the buttons and the alert (cell E).
   */
  import '../daylight-states.css';
  import { Button, Face, Field, type Vibe } from '@superjackfruit/vibekit';
  import type { Gate, GateConflict, GateDecision } from '$lib/api';
  import { app } from '$lib/stores/app.svelte';
  import { displayPrincipal } from '$lib/names';
  import { whenLabel } from '$lib/when';
  import Icon from '$lib/components/parts/Icon.svelte';
  import RawJson from '../RawJson.svelte';
  import StructuredValue from '../StructuredValue.svelte';
  import { humanizeKey } from '../spec-groups';
  import { gateConflictSentence } from '../card-words';
  import type { CardLead } from '../card-lead';
  import type { CardAgent } from '../layouts/types';
  import { GATE_NOTE_MAX, GateDecisionModel, roleOf, sealOf } from './gate-decision.svelte';

  let { boardId, gate, error, onResponse, agent, lead, conflict = null, onRefresh = async () => {}, part = 'all' }: {
    boardId: string; gate: Gate; error: string | null; onResponse: (d: GateDecision, r: Response) => Promise<boolean>;
    agent: CardAgent; lead: CardLead; vibe: Vibe; conflict?: GateConflict | null; onRefresh?: () => Promise<void>; part?: 'all' | 'controls';
  } = $props();

  const model = new GateDecisionModel(() => ({ boardId, gate, onResponse }));
  $effect(() => model.follow(gate.id));
  const ORDER = ['approve', 'changes', 'reject'] as const;
  const ordered = $derived([...model.options].sort((a, b) => ORDER.indexOf(roleOf(a.name)!) - ORDER.indexOf(roleOf(b.name)!)));
  const VARIANT = { approve: 'primary', changes: 'secondary', reject: 'quiet' } as const;
  const subject = $derived(gate.approvalSubject ?? null);
  const rows = $derived(subject ? Object.entries(subject.canonical).map(([k, v]) => ({ k, label: humanizeKey(k), v })) : []);
  const noteId = $derived(`gate-note-${part === 'all' ? 'a' : 'e'}-${gate.id}`);
  const name = $derived(agent.name || 'The agent');
  let pressed = $state<string | null>(null);
  let fieldWrap = $state<HTMLElement | undefined>();
  $effect(() => { model.noteEl = fieldWrap?.querySelector('textarea') ?? undefined; });
  let copied = $state(false);

  async function copyDigest(): Promise<void> {
    try {
      await navigator.clipboard.writeText(subject!.digest);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      copied = false;
    }
  }
  // Busy keeps the buttons enabled (aria-disabled, clicks ignored) so the pressed one keeps focus;
  // the status region says it out loud and the label stays the same.
  async function choose(optionName: string): Promise<void> {
    if (model.busy) return;
    pressed = optionName;
    await model.decide(optionName);
    pressed = null;
  }
  const flat = (v: unknown): string | null => (typeof v === 'string' ? v : Array.isArray(v) && v.every((x) => typeof x === 'string') ? v.join(', ') : null);
</script>

{#if part === 'all'}
  <div class="ds-msg">
    <Face id={name} label={name} mood="needs" size={36} ring="mood" />
    <div class="ds-bubble ds-bubble--sig">
      <span class="ds-who">{name} · needs you</span>
      <p class="ds-say">{lead.sentence ?? gate.summary ?? 'Waiting for your review.'}</p>
      {#if lead.at}<span class="ds-time">{whenLabel(lead.at, new Date())}</span>{/if}
    </div>
  </div>
  <span class="ds-flag"><Icon name="flag" size={16} /> Awaiting your review</span>
  {#if subject}
    <div class="ds-post">
      <div class="ds-posthead">
        <b>Approval subject</b><span>· revision {subject.revision}</span>
        <span class="ds-mono" style="margin-left: auto;">digest {sealOf(subject.digest)} <Button variant="quiet" aria-label="Copy the full digest" style="min-height: 32px; padding: 0px 4px;" onclick={copyDigest}><Icon name={copied ? 'check' : 'copy'} size={14} /></Button></span>
      </div>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex: a scrollable region must be keyboard reachable -->
      <div class="ds-postbody" tabindex="0" role="region" aria-label="The approval subject">
        <dl class="ds-dl">
          {#each rows as r (r.k)}<div><dt>{r.label}</dt><dd>{#if flat(r.v) !== null}{flat(r.v)}{:else}<StructuredValue value={r.v} />{/if}</dd></div>{/each}
        </dl>
        <details class="ds-raw"><summary>View raw JSON</summary><RawJson value={subject.canonical} /></details>
      </div>
      <div class="ds-seal"><Icon name="seal" size={14} /> Approving exactly this version · sealed {sealOf(subject.digest)}</div>
    </div>
  {/if}
{/if}
<!-- vibekit's Field; the wrapper hands its textarea to the model, which focuses it on a missing note. Compact while the note is optional; the full 4-row box once Request changes needs one (as the reference's cell E draws it). -->
<div style="display: contents" bind:this={fieldWrap}>
  <Field id={noteId} control="textarea" size={model.needNote ? 'default' : 'compact'} maxlength={GATE_NOTE_MAX} bind:value={model.note}
    label={model.needNote ? 'Say what needs to change' : 'Add a note (optional)'}
    error={model.needNote ? 'Request changes needs a note: it threads into the agent’s next attempt.' : undefined}
    placeholder={model.needNote ? undefined : 'Recorded with your decision. Request changes needs one: it threads into the agent’s next attempt.'} />
  {#if !model.needNote}<span class="ds-count">{model.note.length} / {GATE_NOTE_MAX}</span>{/if}
</div>
{#snippet checkIcon()}<Icon name="check" size={18} />{/snippet}
<div class="ds-btns">
  {#each ordered as opt (opt.name)}
    {@const role = roleOf(opt.name)!}
    <Button variant={VARIANT[role]} aria-disabled={model.busy ? 'true' : undefined} data-busy={model.busy && pressed === opt.name ? 'true' : undefined} icon={role === 'approve' ? checkIcon : undefined} onclick={() => choose(opt.name)}>{opt.title}</Button>
  {/each}
</div>
<span class="vk-visually-hidden" role="status">{model.busy ? 'Recording…' : ''}</span>
{#if conflict}
  <div class="ds-alert" role="alert"><Icon name="alert" size={18} /><div><b>Not recorded.</b> {gateConflictSentence(conflict, displayPrincipal(conflict.decidedBy, app.members))} <Button variant="quiet" style="min-height: 44px; margin: -12px 0px; font-size: var(--vk-text-sm);" onclick={() => onRefresh()}>Refresh to see it</Button></div></div>
{:else if error}
  <div class="ds-alert" role="alert"><Icon name="alert" size={18} /><div><b>Not recorded.</b> {error}</div></div>
{/if}
