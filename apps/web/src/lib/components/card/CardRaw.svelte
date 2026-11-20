<!-- apps/web/src/lib/components/card/CardRaw.svelte -->
<script lang="ts">
  /**
   * "Raw data", closed until asked for (rule 5): the card's id and its spec exactly as stored, each with
   * Copy, and the sealed subject of its last approved delivery. Machine detail lives here and nowhere else.
   * The card's last block, so the card's footer line ends it: the card's keys (rule 13).
   */
  import { Button, Disclosure } from '@superjackfruitlabs/vibekit-ui';
  import type { CardModel } from './card-model.svelte';
  import RawJson from './RawJson.svelte';
  import { RAW_META } from './card-words';
  import KeysLine from '$lib/components/shell/KeysLine.svelte';
  import { CARD_KEYS } from '$lib/keys';

  let { model: m }: { model: CardModel } = $props();
  const card = $derived(m.card!);
  const sealed = $derived(m.deliveryGate?.approvalSubject ?? null);
</script>

<div class="cv-disc" data-block="raw">
  <Disclosure summary="Raw data" meta={RAW_META}>
    <div class="cv-raw">
      <p class="cv-meta"><span class="cv-mono">{card.id}</span> <Button variant="quiet" onclick={() => m.copyId()}>{m.copied === 'id' ? 'Copied the id' : 'Copy the id'}</Button></p>
      <div class="cv-row"><span class="cv-grouphead">The spec</span><Button variant="quiet" onclick={() => m.copySpec()}>{m.copied === 'spec' ? 'Copied' : 'Copy'}</Button></div>
      <RawJson value={card.spec ?? {}} bare />
      {#if sealed}<p class="cv-meta">Approved delivery sealed with <span class="cv-mono">{sealed.digest}</span></p>{/if}
    </div>
  </Disclosure>
  <p class="cv-foot"><KeysLine keys={CARD_KEYS} /></p>
</div>
