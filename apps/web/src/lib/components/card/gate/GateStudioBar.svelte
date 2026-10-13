<!-- apps/web/src/lib/components/card/gate/GateStudioBar.svelte -->
<script lang="ts">
  /**
   * Studio's decision bar (`.ss-cmd`): the note, one button per option, and the alert beside them.
   * Key hints and A/C shortcuts only when the host wires `registerKeys` (the drawer and cell A).
   */
  import '../studio/card-studio.css';
  import '../studio/card-states-studio.css';
  import type { Gate, GateConflict, GateDecision } from '$lib/api';
  import Icon from '$lib/components/parts/Icon.svelte';
  import { studioConflict } from '../studio/studio-format';
  import { GATE_NOTE_MAX, GateDecisionModel, roleOf } from './gate-decision.svelte';

  let { boardId, gate, error, onResponse, conflict = null, conflictWho = '', registerKeys, onRefresh = () => {} }: {
    boardId: string; gate: Gate; error: string | null; onResponse: (d: GateDecision, r: Response) => Promise<boolean>;
    conflict?: GateConflict | null; conflictWho?: string; registerKeys?: (h: (e: KeyboardEvent) => boolean) => void; onRefresh?: () => void | Promise<void>;
  } = $props();

  const uid = $props.id();
  const model = new GateDecisionModel(() => ({ boardId, gate, onResponse }));
  $effect(() => model.follow(gate.id));
  const keys = $derived(!!registerKeys);
  const KEY = { approve: 'A', changes: 'C' } as const;
  const CLS = { approve: 'ar-btn', changes: 'ar-btn2', reject: 'ar-lk quiet' } as const;
  const ORDER = ['approve', 'changes', 'reject'] as const;
  const ordered = $derived([...model.options].sort((a, b) => ORDER.indexOf(roleOf(a.name)!) - ORDER.indexOf(roleOf(b.name)!)));
  $effect(() => {
    registerKeys?.((e) => {
      const role = e.key.toLowerCase() === 'a' ? 'approve' : e.key.toLowerCase() === 'c' ? 'changes' : null;
      const opt = role && model.options.find((o) => roleOf(o.name) === role);
      if (!opt) return false;
      if (!model.busy) void model.decide(opt.name);
      return true;
    });
  });
  // Busy keeps the buttons enabled (aria-disabled, clicks ignored) so the pressed one keeps focus.
  const choose = (name: string) => { if (!model.busy) void model.decide(name); };
</script>

<div class="ss-cmd">
  <div class="ar-field" class:ss-field-bad={model.needNote}>
    <label for="{uid}-note">{#if model.needNote}Say what needs to change{:else}Add a note (optional) <span class="ar-hint">· {model.note.length}/{GATE_NOTE_MAX}</span>{/if}</label>
    <textarea id="{uid}-note" class="ar-ta" bind:this={model.noteEl} bind:value={model.note} maxlength={GATE_NOTE_MAX} aria-invalid={model.needNote ? 'true' : undefined} aria-describedby={model.needNote ? `${uid}-e` : undefined} placeholder={model.needNote ? undefined : 'Recorded with your decision. Request changes needs one.'}></textarea>
    {#if model.needNote}<p id="{uid}-e" class="ss-err"><Icon name="alert" size={15} strokeWidth={1.75} />Request changes needs a note.</p>{/if}
  </div>
  <div class="ss-row">
    {#each ordered as opt (opt.name)}
      {@const role = roleOf(opt.name)!}
      <button class={CLS[role]} type="button" aria-disabled={model.busy ? 'true' : undefined} aria-keyshortcuts={keys && role !== 'reject' ? KEY[role] : undefined} onclick={() => choose(opt.name)}>{opt.title}{#if keys && role !== 'reject'} <span class="kbd" aria-hidden="true">{KEY[role]}</span>{/if}</button>
    {/each}
    {#if conflict}
      <div class="ss-alert" role="alert"><Icon name="alert" size={18} strokeWidth={1.75} /><div><b>Not recorded.</b> {studioConflict(conflict, conflictWho)} <button class="ar-lk" type="button" onclick={() => void onRefresh()}>Refresh</button></div></div>
    {:else if error}
      <div class="ss-alert" role="alert"><Icon name="alert" size={18} strokeWidth={1.75} /><div>{error}</div></div>
    {/if}
  </div>
  <span class="vk-visually-hidden" role="status">{model.busy ? 'Recording…' : ''}</span>
</div>
