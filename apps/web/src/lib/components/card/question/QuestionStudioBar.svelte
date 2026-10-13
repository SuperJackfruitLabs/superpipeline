<!-- apps/web/src/lib/components/card/question/QuestionStudioBar.svelte -->
<script lang="ts">
  /** Studio's answer bar (`form.ss-cmd`). Options, when the agent offered some, are secondary buttons above the box. */
  import '../studio/card-studio.css';
  import '../studio/card-states-studio.css';
  import type { Elicitation } from '$lib/api';
  import Icon from '$lib/components/parts/Icon.svelte';
  import type { CardAgent } from '../layouts/types';
  import type { QuestionAnswer } from './question-answer.svelte';

  let { model, elicitation, agent, caption = 'Empty: “Type an answer first.”' }: { model: QuestionAnswer; elicitation: Elicitation; agent: CardAgent; caption?: string | null } = $props();
  const uid = $props.id();
  $effect(() => model.follow(elicitation.id));
  // Busy keeps the buttons enabled (aria-disabled, clicks ignored) so the pressed one keeps focus.
  const send = (opt?: string) => { if (!model.answering) void model.send(opt); };
  function onkey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(model.selected ?? undefined); }
  }
</script>

<form class="ss-cmd" onsubmit={(e) => { e.preventDefault(); send(model.selected ?? undefined); }}>
  {#if elicitation.options.length > 0}<div class="ss-row">{#each elicitation.options as o (o.name)}<button class="ar-btn2" type="button" aria-disabled={model.answering ? 'true' : undefined} onclick={() => send(o.name)}>{o.title}</button>{/each}</div>{/if}
  <div class="ar-field" class:ss-field-bad={!!model.error}>
    <label for="{uid}-a">{elicitation.options.length > 0 ? `Note to ${agent.name || 'the agent'} (optional)` : `Answer to ${agent.name || 'the agent'}`}</label>
    <textarea id="{uid}-a" class="ar-ta" bind:value={model.text} onkeydown={onkey} aria-invalid={model.error ? 'true' : undefined} aria-describedby={model.error ? `${uid}-e` : caption ? `${uid}-h` : undefined}></textarea>
    {#if model.error}<p id="{uid}-e" class="ss-err" role="alert">{model.error}</p>{/if}
  </div>
  {#if elicitation.options.length === 0}
    <div class="ss-row"><button class="ar-btn" type="submit" aria-disabled={model.answering ? 'true' : undefined} aria-busy={model.answering ? 'true' : undefined}><Icon name="send" size={15} strokeWidth={1.75} />Send answer <span class="kbd" aria-hidden="true">⌘↵</span></button>{#if caption && !model.error}<span id="{uid}-h" class="ar-hint">{caption}</span>{/if}</div>
  {/if}
  <span class="vk-visually-hidden" role="status">{model.answering ? 'Sending…' : ''}</span>
</form>
