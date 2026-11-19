<!-- apps/web/src/lib/components/board/BoardEmpty.svelte -->
<script lang="ts">
  /**
   * A board with no live cards: what it does, step by step, and the way to write the first card (SB §6).
   * Drawn inside the shell's main, under the shell's h1, so the heading is an h2. One form in every vibe.
   */
  import './empty/empty.css';
  import { Button, Face } from '@superjackfruitlabs/vibekit-ui';
  import type { BoardSnapshot } from '$lib/api';
  import Icon from '$lib/components/parts/Icon.svelte';
  import Initials from '$lib/components/parts/Initials.svelte';
  import { plural } from '$lib/words';
  import { BOARD_KEYS } from '$lib/keys';
  import KeysLine from '$lib/components/shell/KeysLine.svelte';
  import type { BoardModel, Me } from './board-model';
  import { emptyHint, emptyLedeHtml, emptyTags, emptyWho } from './board-words';

  let { model, intro, me, onCompose }: { model: BoardModel; intro: BoardSnapshot['intro']; me: Me | null; onCompose: () => void } = $props();
  const title = 'No cards yet. Here is what this board does.';
</script>

{#snippet plus()}<Icon name="plus" size={20} strokeWidth={1.8} />{/snippet}

<div class="em">
  <div class="em-card">
    <div class="em-head">
      <div>
        <p class="em-eyebrow"><span>{model.boardName}</span></p>
        <h2 id="em-h" class="em-h">{title}</h2>
        <p class="em-lede">{@html emptyLedeHtml(intro, model.stages.length)}</p>
      </div>
      <div class="em-cta">
        <Button onclick={onCompose} icon={plus}>Write the first card</Button>
        <p>{emptyHint(intro)}</p>
      </div>
    </div>
    <ol class="em-flow" aria-label="Stages, in order" style="--em-stages: {Math.max(1, model.stages.length)}">
      {#each model.stages as st, i (st.key)}
        {@const who = emptyWho(st, me)}
        {@const def = model.stageDefs[i]!}
        <li class="em-step" class:gate={st.gate}>
          <div class="em-top"><span class="em-num">{String(st.index).padStart(2, '0')}</span><span class="em-num">{plural(st.count, 'card', 'cards')}</span></div>
          <h3>{st.name}</h3>
          <div class="em-who">
            {#if who.kind === 'initials'}<Initials text={who.text} label={who.label} size={32} fontSize={12} />{:else if who.kind === 'face'}<Face id={who.face} label={who.face} mood="resting" size={32} />{/if}{who.name}
          </div>
          {#if def.summary}<p class="em-does">{def.summary}</p>{/if}
          <div class="em-tags">{#each emptyTags(st, def) as t (t.text)}<span class="em-tag" class:g={t.g}>{t.text}</span>{/each}</div>
        </li>
      {/each}
    </ol>
    <div class="em-foot"><span>Stages come from this board’s rules.</span><a href="/b/{model.boardId}/settings">Change the stages in Board settings</a></div>
    <p class="em-keys"><KeysLine keys={BOARD_KEYS} /></p>
  </div>
</div>
