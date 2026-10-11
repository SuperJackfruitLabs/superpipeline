<script lang="ts">
  import type { Mood, Vibe } from '@superjackfruit/vibekit';
  import type { Gate, GateDecision } from '$lib/api';
  import Words from '$lib/components/Words.svelte';
  import { leadText } from '$lib/copy';
  import type { CardLead } from '../card-lead';
  import { GATE_NOTE_MAX, GateDecisionModel, roleOf, sealOf } from './gate-decision.svelte';

  let { boardId, gate, error, onResponse, lead, vibe }: {
    boardId: string; gate: Gate; error: string | null;
    onResponse: (d: GateDecision, r: Response) => Promise<boolean>;
    agent: { id: string | null; name: string; iconUrl: string | null; mood: Mood };
    lead: CardLead; vibe: Vibe;
  } = $props();

  const model = new GateDecisionModel(() => ({ boardId, gate, onResponse }));
  $effect(() => model.follow(gate.id));

  /** What choosing an option does, in plain words. */
  const DESCRIPTION: Record<string, string> = {
    approve_manual: 'You post the approved text yourself.',
    approve_automatic: 'The board posts the approved text for you.',
  };
  const ROLE_DESCRIPTION = { approve: 'The card moves on to the next stage.', changes: 'The agent tries again with your note.', reject: 'The card stops here.' } as const;
  const describe = (name: string): string => DESCRIPTION[name] ?? ROLE_DESCRIPTION[roleOf(name)!];
</script>

<section class="sec" aria-label="Your decision">
  <fieldset class="border-2 border-[var(--vk-color-text)] p-4">
    <legend class="px-1 font-semibold">Your decision is needed</legend>
    <p class="text-sm">⚑ awaiting your review</p>
    <p class="mt-2"><Words text={leadText(lead, vibe)} /></p>
    {#if gate.approvalSubject}
      <div class="mono mt-3 text-xs" aria-label="The version you are approving" role="group">
        <div>Immutable approval subject · revision {gate.approvalSubject.revision}</div>
        <div class="break-all">{gate.approvalSubject.id}</div>
        <div class="break-all">{gate.approvalSubject.digest}</div>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex: a scrollable region must be keyboard reachable -->
        <pre tabindex="0" role="region" aria-label="Approval subject, canonical JSON" class="mt-2 max-h-64 overflow-auto whitespace-pre-wrap">{JSON.stringify(gate.approvalSubject.canonical, null, 2)}</pre>
        <div class="mt-1">Approving exactly this version · sealed {sealOf(gate.approvalSubject.digest)}</div>
      </div>
    {/if}
    <div class="mt-4 grid gap-1">
      {#each model.options as opt (opt.name)}
        <label class="flex min-h-[var(--vk-target-min)] gap-3">
          <input type="radio" name="gate-{gate.id}" value={opt.name} bind:group={model.selected} class="mt-1 size-5 shrink-0"
            aria-labelledby="gate-{gate.id}-{opt.name}-t" aria-describedby="gate-{gate.id}-{opt.name}-d" />
          <span><b id="gate-{gate.id}-{opt.name}-t">{opt.title}</b><br /><span id="gate-{gate.id}-{opt.name}-d" class="text-muted-foreground">{describe(opt.name)}</span></span>
        </label>
      {/each}
    </div>
    {#if model.needPick}<p class="mt-1 text-sm" role="status">Pick a decision first.</p>{/if}
    <label for="gate-note-{gate.id}" class="mt-3 mb-1 block text-sm">{model.needNote ? 'Say what needs to change' : 'Add a note (optional)'}</label>
    <textarea id="gate-note-{gate.id}" bind:this={model.noteEl} bind:value={model.note} maxlength={GATE_NOTE_MAX} rows="3" aria-invalid={model.needNote}
      placeholder="Recorded with your decision. Request changes needs one: it threads into the agent's next attempt."
      class="w-full resize-y border-2 border-[var(--vk-color-text)] bg-transparent px-2.5 py-2 text-base"></textarea>
    <div class="mono text-right text-[11px]">{model.note.length} / {GATE_NOTE_MAX}</div>
    <div class="mt-2">
      {#if error}<p role="alert" class="mono mb-2 border-2 border-[var(--vk-color-text)] px-3 py-2 text-xs">{error}</p>{/if}
      <button type="button" class="vk-button vk-button--primary" disabled={model.busy} onclick={() => model.submit()}>Submit decision</button>
    </div>
  </fieldset>
</section>
