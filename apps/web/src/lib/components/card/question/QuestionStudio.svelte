<script lang="ts">
  /** Frame and bar together, for a screen with no tabs between them (and the panel contract). */
  import type { Mood, Vibe } from '@superjackfruit/vibekit';
  import type { Elicitation } from '$lib/api';
  import QuestionStudioBar from './QuestionStudioBar.svelte';
  import QuestionStudioFrame from './QuestionStudioFrame.svelte';
  import type { QuestionAnswer } from './question-answer.svelte';

  let { model, elicitation, agent }: { model: QuestionAnswer; elicitation: Elicitation; agent: { id: string | null; name: string; iconUrl: string | null; mood: Mood }; vibe: Vibe } = $props();
</script>

<QuestionStudioFrame {elicitation} {agent} />
<QuestionStudioBar {model} {elicitation} {agent} />
