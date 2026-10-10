<script lang="ts">
  import type { Vibe } from '@superjackfruit/vibekit';
  import type { Gate, GateDecision } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import AgentFace from '$lib/components/AgentFace.svelte';
  import Words from '$lib/components/Words.svelte';
  import { leadText } from '$lib/copy';
  import type { CardLead } from '../card-lead';
  import { GATE_NOTE_MAX, GateDecisionModel, roleOf, sealOf } from './gate-decision.svelte';

  let { boardId, gate, error, onResponse, agent, lead, vibe }: {
    boardId: string; gate: Gate; error: string | null;
    onResponse: (d: GateDecision, r: Response) => Promise<boolean>;
    agent: { id: string | null; name: string; iconUrl: string | null; mood: import('@superjackfruit/vibekit').Mood };
    lead: CardLead; vibe: Vibe;
  } = $props();

  const model = new GateDecisionModel(() => ({ boardId, gate, onResponse }));
  $effect(() => model.follow(gate.id));
  const ordered = $derived([...model.options].sort((a, b) => ['changes', 'reject', 'approve'].indexOf(roleOf(a.name)!) - ['changes', 'reject', 'approve'].indexOf(roleOf(b.name)!)));
</script>

<section class="sec" aria-labelledby="gate-h-{gate.id}">
  <div class="gate rounded-[var(--vk-radius-lg)] border-2 p-3.5" style="border-color:var(--vk-color-signal);background:var(--vk-color-signal-wash)">
    <h3 id="gate-h-{gate.id}" class="wordmark text-signal-text mb-2.5 text-sm font-semibold">⚑ awaiting your review</h3>
    <div class="mb-3 flex items-start gap-2">
      {#if agent.id}<AgentFace agentId={agent.id} name={agent.name} iconUrl={agent.iconUrl} mood="needs" size={40} variant="mood" />{/if}
      <p class="agent-voice bg-surface flex-1 rounded-[var(--vk-radius-md)] p-3 text-base"><Words text={leadText(lead, vibe)} /></p>
    </div>
    {#if error}<p role="alert" class="text-signal-text bg-surface mono mb-2.5 rounded-[var(--vk-radius-md)] border-2 px-3 py-2 text-xs" style="border-color:var(--vk-color-signal)">{error}</p>{/if}
    {#if gate.approvalSubject}
      <div class="bg-surface border-border mono mb-3 rounded-[var(--vk-radius-md)] border p-2.5 text-[11px]">
        <div class="mb-1 font-semibold">Immutable approval subject · revision {gate.approvalSubject.revision}</div>
        <div class="text-muted-foreground break-all">{gate.approvalSubject.id}</div>
        <div class="text-muted-foreground break-all">{gate.approvalSubject.digest}</div>
        <pre class="mt-2 max-h-64 overflow-auto whitespace-pre-wrap">{JSON.stringify(gate.approvalSubject.canonical, null, 2)}</pre>
        <div class="mt-2 text-xs">Approving exactly this version · sealed {sealOf(gate.approvalSubject.digest)}</div>
      </div>
    {/if}
    <div class="gate-note mb-3">
      <label for="gate-note-{gate.id}" class="text-muted-foreground mb-1 block text-xs">{model.needNote ? 'Say what needs to change' : 'Add a note (optional)'}</label>
      <textarea id="gate-note-{gate.id}" bind:this={model.noteEl} bind:value={model.note} maxlength={GATE_NOTE_MAX} rows="3" aria-invalid={model.needNote}
        placeholder="Recorded with your decision. Request changes needs one: it threads into the agent's next attempt."
        class="bg-surface w-full resize-y rounded-[var(--vk-radius-md)] border-2 px-2.5 py-2 text-base outline-none"
        style="border-color:{model.needNote ? 'var(--vk-color-signal)' : 'var(--vk-color-line)'}"></textarea>
      <div class="text-muted-foreground mono mt-1 text-right text-[11px]">{model.note.length} / {GATE_NOTE_MAX}</div>
    </div>
    <div class="triad gate-actions flex flex-wrap gap-2">
      {#each ordered as opt (opt.name)}
        {@const role = roleOf(opt.name)}
        <Button size="sm" variant={role === 'approve' ? 'default' : role === 'changes' ? 'outline' : 'ghost'} disabled={model.busy} onclick={() => model.decide(opt.name)} class="flex-1" style="min-height:var(--tap)">{opt.title}</Button>
      {/each}
    </div>
  </div>
</section>
