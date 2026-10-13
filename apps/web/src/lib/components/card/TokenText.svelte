<!-- apps/web/src/lib/components/card/TokenText.svelte -->
<script lang="ts">
  /** An agent's words verbatim, with id-like spans styled (G-3). Text only; `tokens: false` draws it plain. */
  import { splitTokens, TOKEN_RE } from './tokens';
  let { text, cls, re = TOKEN_RE, tokens = true, tag = 'span' }: { text: string; cls: string; re?: RegExp; tokens?: boolean; tag?: 'span' | 'code' } = $props();
  const parts = $derived(tokens ? splitTokens(text, re) : [{ text, token: false }]);
</script>

{#each parts as p, i (i)}{#if p.token}{#if tag === 'code'}<code class={cls}>{p.text}</code>{:else}<span class={cls}>{p.text}</span>{/if}{:else}{p.text}{/if}{/each}
