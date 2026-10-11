<script lang="ts">
  import type { Mood, Vibe } from '@superjackfruit/vibekit';
  import type { Gate, GateDecision } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import Words from '$lib/components/Words.svelte';
  import { leadText } from '$lib/copy';
  import type { CardLead } from '../card-lead';
  import { GATE_NOTE_MAX, GateDecisionModel, roleOf, sealOf } from './gate-decision.svelte';

  let { boardId, gate, error, onResponse, agent, lead, vibe }: {
    boardId: string; gate: Gate; error: string | null;
    onResponse: (d: GateDecision, r: Response) => Promise<boolean>;
    agent: { id: string | null; name: string; iconUrl: string | null; mood: Mood };
    lead: CardLead; vibe: Vibe;
  } = $props();

  const model = new GateDecisionModel(() => ({ boardId, gate, onResponse }));
  $effect(() => model.follow(gate.id));
  const ordered = $derived([...model.options].sort((a, b) => ['changes', 'reject', 'approve'].indexOf(roleOf(a.name)!) - ['changes', 'reject', 'approve'].indexOf(roleOf(b.name)!)));

  /** One line until there is more to say; grows to six lines, then scrolls. */
  function grow(el: HTMLTextAreaElement | undefined) {
    if (!el) return;
    el.style.height = 'auto';
    const line = parseFloat(getComputedStyle(el).lineHeight) || 24;
    el.style.height = `${Math.min(el.scrollHeight, line * 6)}px`;
  }
  $effect(() => {
    model.note;
    grow(model.noteEl);
  });
</script>

<!-- display:contents: the command bar sticks to the card's scrolling body, not to this section -->
<section class="sec contents" aria-labelledby="gate-h-{gate.id}">
  <p class="mt-5 mb-2 flex items-center gap-2 text-xs">
    <span class="status-led inline-block size-2.5 rounded-full" data-mood="needs" aria-hidden="true"></span>
    <span class="uppercase font-mono">{agent.name} · needs decision</span>
  </p>
  <h3 id="gate-h-{gate.id}" class="eyebrow text-signal-text mb-2 text-sm font-semibold">⚑ awaiting your review</h3>
  <p class="agent-voice font-mono mb-3 text-base"><Words text={leadText(lead, vibe)} /></p>
  {#if gate.approvalSubject}
    <div class="bg-surface border-border font-mono mb-3 rounded-[var(--vk-radius-md)] border p-2.5 text-xs">
      <div class="mb-1 font-semibold">Immutable approval subject · revision {gate.approvalSubject.revision}</div>
      <div class="text-muted-foreground break-all">{gate.approvalSubject.id}</div>
      <div class="text-muted-foreground break-all">{gate.approvalSubject.digest}</div>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex: a scrollable region must be keyboard reachable -->
      <pre tabindex="0" role="region" aria-label="Approval subject, canonical JSON" class="mt-2 max-h-64 overflow-auto whitespace-pre-wrap">{JSON.stringify(gate.approvalSubject.canonical, null, 2)}</pre>
      <div class="mt-2">Approving exactly this version · sealed {sealOf(gate.approvalSubject.digest)}</div>
    </div>
  {/if}
  <div class="command-bar bg-surface border-border sticky bottom-0 -mx-1 border-t px-1 py-2">
    {#if error}<p role="alert" class="text-signal-text bg-surface font-mono mb-2.5 rounded-[var(--vk-radius-md)] border-2 px-3 py-2 text-xs" style="border-color:var(--vk-color-signal)">{error}</p>{/if}
    <label for="gate-note-{gate.id}" class="text-muted-foreground mb-1 block text-xs">{model.needNote ? 'Say what needs to change' : 'Add a note (optional)'}</label>
    <textarea id="gate-note-{gate.id}" bind:this={model.noteEl} bind:value={model.note} maxlength={GATE_NOTE_MAX} rows="1" aria-invalid={model.needNote}
      placeholder="Recorded with your decision. Request changes needs one: it threads into the agent's next attempt."
      class="bg-surface font-mono w-full resize-none rounded-[var(--vk-radius-md)] border-2 px-2.5 py-2 text-base outline-none"
      style="border-color:{model.needNote ? 'var(--vk-color-signal)' : 'var(--vk-color-line)'}"></textarea>
    <div class="text-muted-foreground font-mono mt-1 text-right text-[11px]">{model.note.length} / {GATE_NOTE_MAX}</div>
    <div class="mt-1 flex flex-wrap gap-2">
      {#each ordered as opt (opt.name)}
        {@const role = roleOf(opt.name)}
        <Button variant={role === 'approve' ? 'default' : 'outline'} disabled={model.busy} onclick={() => model.decide(opt.name)} class="flex-1" style="min-height:var(--tap)">{opt.title}</Button>
      {/each}
    </div>
  </div>
</section>
