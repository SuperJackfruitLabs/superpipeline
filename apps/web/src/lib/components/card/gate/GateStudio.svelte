<script lang="ts">
  /** Frame and bar together, for a screen with no tabs between them (and the panel contract). */
  import type { Mood, Vibe } from '@superjackfruit/vibekit';
  import type { Gate, GateDecision } from '$lib/api';
  import type { CardLead } from '../card-lead';
  import GateStudioBar from './GateStudioBar.svelte';
  import GateStudioFrame from './GateStudioFrame.svelte';

  let { boardId, gate, error, onResponse, agent, lead, vibe }: {
    boardId: string; gate: Gate; error: string | null;
    onResponse: (d: GateDecision, r: Response) => Promise<boolean>;
    agent: { id: string | null; name: string; iconUrl: string | null; mood: Mood };
    lead: CardLead; vibe: Vibe;
  } = $props();
</script>

<GateStudioFrame {gate} {agent} {lead} {vibe} />
<GateStudioBar {boardId} {gate} {error} {onResponse} />
