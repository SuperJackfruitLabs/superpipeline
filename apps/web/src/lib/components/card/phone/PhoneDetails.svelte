<!-- apps/web/src/lib/components/card/phone/PhoneDetails.svelte -->
<script lang="ts">
  /** The brief's grouped fields (`.kvg` groups) and the raw JSON row, as the D/P/Q phones draw them. */
  import PhoneIcon from '$lib/components/parts/PhoneIcon.svelte';
  import RawJson from '../RawJson.svelte';
  import StructuredValue from '../StructuredValue.svelte';
  import { isPlainObject, normaliseValue } from '../spec-details';
  import { rawJson } from '../spec-details';
  import { detailValue, type PhoneCardView } from './phone-card-words';

  let { view, spec, criteria, heading, boardId }: { view: PhoneCardView; spec: unknown; criteria: string[] | null; heading: string; boardId: string } = $props();
  let open = $state<Record<string, boolean>>({});
  let raw = $state(false);
  async function copy(): Promise<void> {
    try { await navigator.clipboard.writeText(rawJson(spec)); } catch { /* refused: the raw view is one click away */ }
  }
</script>

<div data-testid="spec-details" style="display: contents">
{#each view.groups as g (g.label)}
  <div class="kvg">
    <h4 class="gh">{g.label}</h4>
    <dl class="kv">
      {#each g.rows as r (r.key)}
        {@const v = detailValue(r.value, criteria, heading)}
        <div>
          <dt>{r.label}</dt>
          <dd data-testid="spec-value-{r.key}">
            {#if v.kind === 'text'}{open[r.key] && v.more ? `${v.shown} ${v.more}` : v.shown}{#if v.more}{' '}<button class="more" type="button" aria-expanded={!!open[r.key]} onclick={() => (open[r.key] = !open[r.key])}>{open[r.key] ? 'Show less' : 'Show more'}</button>{/if}
            {:else if v.kind === 'evidence'}{v.text}
            {:else if v.kind === 'matrix'}<span class="mono id">{v.id}</span> · <a href="/b/{boardId}/c/{v.card}">onboarding card</a>
            {:else if v.kind === 'repo'}{v.text}<a href={v.href}>policy</a>
            {:else if isPlainObject(r.value) || (Array.isArray(r.value) && r.value.some((x) => typeof x !== 'string'))}<StructuredValue value={normaliseValue(r.value)} depth={0} />
            {:else}{v.text}{/if}
          </dd>
        </div>
      {/each}
    </dl>
  </div>
{/each}
<div class="rawrow">
  <button class="lnk" type="button" aria-expanded={raw} onclick={() => (raw = !raw)}>View raw JSON</button>
  <button class="lnk" type="button" onclick={copy}><PhoneIcon name="copy" />Copy</button>
</div>
{#if raw}<RawJson value={spec} />{/if}
</div>
