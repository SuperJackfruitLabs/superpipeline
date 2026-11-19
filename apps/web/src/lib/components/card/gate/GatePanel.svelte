<!-- apps/web/src/lib/components/card/gate/GatePanel.svelte -->
<script lang="ts">
  /**
   * A pending decision, in place of the card's sentence (composition contract §11.3; card-states.html
   * "Decision pending"): what is asked, the decisions as choices (Approve picked), a note the agent
   * reads, and what you sign behind a disclosure. The one primary sends the picked decision and is
   * named after it; Move sits beside it. A refusal, or someone else's earlier decision, is said beside
   * the button. The same in every vibe.
   */
  import { untrack } from 'svelte';
  import { Button, Choice, Disclosure, Field } from '@superjackfruitlabs/vibekit-ui';
  import type { GateBinding } from '../bindings';
  import RawJson from '../RawJson.svelte';
  import StructuredValue from '../StructuredValue.svelte';
  import { humanizeKey } from '../spec-groups';
  import { GATE_NOTE_ERROR, GATE_NOTE_LABEL, GATE_NOTE_NEEDED, gateChoiceWords, gateConflictSentence, signingMeta } from '../card-words';
  import { GATE_NOTE_MAX, GateDecisionModel, roleOf, sealOf } from './gate-decision.svelte';

  let { boardId, gate, error, conflict, conflictWho, onResponse, onRefresh, ask, prevStage, onMove, onCancel }: GateBinding & {
    ask: { lead: string; rest: string }; prevStage: string | null; onMove: () => void; onCancel?: () => void;
  } = $props();

  const model = new GateDecisionModel(() => ({ boardId, gate, onResponse }));
  const ORDER = ['approve', 'changes', 'reject'] as const;
  const ordered = $derived([...model.options].sort((a, b) => ORDER.indexOf(roleOf(a.name)!) - ORDER.indexOf(roleOf(b.name)!)));
  // A new gate starts with its first approval picked, as the decision most people make.
  $effect(() => {
    const id = gate.id;
    untrack(() => {
      model.follow(id);
      if (model.selected === null) model.selected = ordered.find((o) => roleOf(o.name) === 'approve')?.name ?? null;
    });
  });
  const picked = $derived(ordered.find((o) => o.name === model.selected) ?? null);
  const subject = $derived(gate.approvalSubject ?? null);
  const rows = $derived(subject ? Object.entries(subject.canonical).map(([k, v]) => ({ k, label: humanizeKey(k), v })) : []);
  const group = $derived(`gate-${gate.id}`);
  const noteId = $derived(`gate-note-${gate.id}`);
  let fieldWrap = $state<HTMLElement | undefined>();
  $effect(() => { model.noteEl = fieldWrap?.querySelector('textarea') ?? undefined; });
  const flat = (v: unknown): string | null => (typeof v === 'string' ? v : Array.isArray(v) && v.every((x) => typeof x === 'string') ? v.join(', ') : null);

  /** The picked choice, from the radios' change (Choice keeps its own binding). */
  const pick = (e: Event): void => { const t = e.target as HTMLInputElement; if (t.type === 'radio') model.selected = t.value; };
  // Busy keeps the button enabled (aria-disabled, clicks ignored) so it keeps focus; the status says it.
  function send(e: Event): void {
    e.preventDefault();
    if (!model.busy) void model.submit();
  }
</script>

<form class="cv-panel" data-row="gate" onsubmit={send}>
  <div class="cv-panel__body">
    <p class="cv-sentence"><b>{ask.lead}</b> {ask.rest}</p>
    <fieldset class="cv-choices" onchange={pick}>
      <legend class="vk-visually-hidden">Your decision</legend>
      {#each ordered as opt (opt.name)}
        <Choice type="radio" card name={group} value={opt.name} group={model.selected ?? undefined} label={opt.title} description={opt.description ?? gateChoiceWords(roleOf(opt.name)!, opt.name, prevStage)} />
      {/each}
    </fieldset>
    <!-- vibekit's Field; the wrapper hands its textarea to the model, which focuses it when Request changes has no note. -->
    <div class="cv-note" bind:this={fieldWrap}>
      <Field id={noteId} control="textarea" rows={2} maxlength={GATE_NOTE_MAX} counter bind:value={model.note}
        label={model.needNote ? GATE_NOTE_NEEDED : GATE_NOTE_LABEL} error={model.needNote ? GATE_NOTE_ERROR : undefined} placeholder="What to change, if anything" />
    </div>
    {#if subject}
      <Disclosure summary="What you are signing" meta={signingMeta(subject.digest, rows.length)}>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex: a scrollable region must be keyboard reachable -->
        <div class="cv-subject" tabindex="0" role="region" aria-label="The approval subject">
          <dl class="cv-dl">
            {#each rows as r (r.k)}<div><dt>{r.label}</dt><dd>{#if flat(r.v) !== null}{flat(r.v)}{:else}<StructuredValue value={r.v} />{/if}</dd></div>{/each}
          </dl>
          <p class="cv-meta">Approving exactly this version, revision {subject.revision} · sealed {sealOf(subject.digest)}</p>
          <p class="cv-meta cv-mono">{subject.digest}</p>
          <RawJson value={subject.canonical} />
        </div>
      </Disclosure>
    {/if}
  </div>
  <div class="cv-act">
    <Button type="submit" variant="primary" aria-disabled={model.busy ? 'true' : undefined} data-busy={model.busy ? 'true' : undefined}>{picked?.title ?? 'Send decision'}</Button>
    <Button variant="secondary" onclick={onMove}>Move</Button>
    {#if onCancel}<Button variant="quiet" onclick={onCancel}>Cancel</Button>{/if}
    {#if conflict}
      <div class="cv-alert" role="alert"><b>Not recorded.</b> {gateConflictSentence(conflict, conflictWho)} <Button variant="quiet" onclick={() => onRefresh()}>Refresh to see it</Button></div>
    {:else if error}
      <div class="cv-alert" role="alert"><b>Not recorded.</b> {error}</div>
    {:else if model.needPick}
      <p class="cv-meta" role="status">Pick a decision first.</p>
    {/if}
  </div>
  <span class="vk-visually-hidden" role="status">{model.busy ? 'Recording…' : ''}</span>
</form>
