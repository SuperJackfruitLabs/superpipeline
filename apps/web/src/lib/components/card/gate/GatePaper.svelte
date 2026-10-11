<script lang="ts">
  import type { Mood, Vibe } from '@superjackfruit/vibekit';
  import type { Gate, GateDecision } from '$lib/api';
  import LeadWords from '$lib/components/LeadWords.svelte';
  import type { CardLead } from '../card-lead';
  import { GATE_NOTE_MAX, GateDecisionModel, sealOf } from './gate-decision.svelte';

  let { boardId, gate, error, onResponse, lead, vibe }: {
    boardId: string; gate: Gate; error: string | null;
    onResponse: (d: GateDecision, r: Response) => Promise<boolean>;
    agent: { id: string | null; name: string; iconUrl: string | null; mood: Mood };
    lead: CardLead; vibe: Vibe;
  } = $props();

  const model = new GateDecisionModel(() => ({ boardId, gate, onResponse }));
  $effect(() => model.follow(gate.id));
</script>

<section class="sec paper-gate" aria-labelledby="gate-h-{gate.id}">
  <h3 id="gate-h-{gate.id}" class="eyebrow text-signal-text">⚑ awaiting your review</h3>
  <p class="font-display mt-1 text-lg">Re: approval</p>
  <p class="agent-voice mt-2"><LeadWords {lead} {vibe} /></p>
  {#if error}<p role="alert" class="text-signal-text mono mt-2 rounded-[var(--vk-radius-md)] border-2 px-3 py-2 text-xs" style="border-color:var(--vk-color-signal)">{error}</p>{/if}
  {#if gate.approvalSubject}
    <figure class="mt-3 border-l-2 border-[var(--vk-color-line)] pl-3" aria-label="The version you are approving">
      <figcaption class="text-sm">Immutable approval subject · revision {gate.approvalSubject.revision}</figcaption>
      <div class="mono break-all text-xs">{gate.approvalSubject.id}</div>
      <div class="mono break-all text-xs">{gate.approvalSubject.digest}</div>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex: a scrollable region must be keyboard reachable -->
      <pre tabindex="0" role="region" aria-label="Approval subject, canonical JSON" class="mono mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(gate.approvalSubject.canonical, null, 2)}</pre>
      <p class="mt-1 text-xs">Approving exactly this version · sealed {sealOf(gate.approvalSubject.digest)}</p>
    </figure>
  {/if}
  <fieldset class="mt-4">
    <legend class="font-display">Your reply</legend>
    {#each model.options as opt (opt.name)}
      <label class="flex min-h-[var(--vk-target-min)] items-center gap-3">
        <input type="radio" name="gate-{gate.id}" value={opt.name} bind:group={model.selected} class="size-5" /> {opt.title}
      </label>
    {/each}
    {#if model.needPick}<p class="text-signal-text text-sm" role="status">Pick a decision first.</p>{/if}
    <label for="gate-note-{gate.id}" class="text-muted-foreground mt-3 mb-1 block text-xs">{model.needNote ? 'Say what needs to change' : 'Add a note (optional)'}</label>
    <textarea id="gate-note-{gate.id}" bind:this={model.noteEl} bind:value={model.note} maxlength={GATE_NOTE_MAX} rows="3" aria-invalid={model.needNote}
      placeholder="Recorded with your decision. Request changes needs one: it threads into the agent's next attempt."
      class="bg-surface w-full resize-y rounded-[var(--vk-radius-md)] border-2 px-2.5 py-2 text-base outline-none"
      style="border-color:{model.needNote ? 'var(--vk-color-signal)' : 'var(--vk-color-line)'}"></textarea>
    <div class="text-muted-foreground mono text-right text-[11px]">{model.note.length} / {GATE_NOTE_MAX}</div>
    <button type="button" class="vk-button vk-button--primary mt-2" disabled={model.busy} onclick={() => model.submit()}>Send reply</button>
  </fieldset>
</section>
