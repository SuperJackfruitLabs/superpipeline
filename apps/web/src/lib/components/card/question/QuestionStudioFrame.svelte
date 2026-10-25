<!-- apps/web/src/lib/components/card/question/QuestionStudioFrame.svelte -->
<script lang="ts">
  import ApprovalDetail from './ApprovalDetail.svelte';
  /** Studio's question readout (01 "Question" / cell B): who is waiting and what they ask. */
  import '../studio/card-studio.css';
  import { Face } from '@superjackfruit/vibekit';
  import type { Elicitation } from '$lib/api';
  import type { CardAgent } from '../layouts/types';
  import { quoteHeader, quoteWhen } from '../studio/studio-format';

  /** `showQuestion` false: the caller already says the question. */
  let { elicitation, agent, showQuestion = true }: { elicitation: Elicitation; agent: CardAgent; showQuestion?: boolean } = $props();
  const name = $derived(agent.name || 'The agent');
</script>

<div class="elicitation" style="display: contents">
  <div class="ar-q"><h3><Face id={name} label={name} mood="needs" size={24} ring="mood" />{quoteHeader(name, 'question')}{#if elicitation.createdAt}<span class="mono">{quoteWhen(elicitation.createdAt, new Date())}</span>{/if}</h3>{#if showQuestion}{#if elicitation.detail}<ApprovalDetail detail={elicitation.detail} />{:else}<blockquote style="white-space: pre-wrap; overflow-wrap: anywhere">{elicitation.question}</blockquote>{/if}{/if}</div>
  {#if elicitation.signal === 'auth'}<p class="ar-hint">Needs you to sign in.</p>{/if}
</div>
