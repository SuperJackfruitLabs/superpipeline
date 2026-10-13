<!-- apps/web/src/lib/components/card/gate/GateStudioFrame.svelte -->
<script lang="ts">
  /** Studio's gate readout (01 "Waiting for your review" / cell A): the quote, the subject table and the seal. */
  import '../studio/card-studio.css';
  import '../studio/card-states-studio.css';
  import { Face, type Vibe } from '@superjackfruit/vibekit';
  import type { Gate } from '$lib/api';
  import Icon from '$lib/components/parts/Icon.svelte';
  import RawJson from '../RawJson.svelte';
  import StructuredValue from '../StructuredValue.svelte';
  import { humanizeKey } from '../spec-groups';
  import type { CardLead } from '../card-lead';
  import type { CardAgent } from '../layouts/types';
  import { quoteHeader, quoteWhen, shortDigest } from '../studio/studio-format';
  import { sealOf } from './gate-decision.svelte';

  /** `showLead` false: the caller already says who, what is needed and the sentence. */
  let { gate, agent, lead, showLead = true, footnote = 1 }: { gate: Gate; agent: CardAgent; lead: CardLead | null; vibe: Vibe; showLead?: boolean; footnote?: number } = $props();
  const subject = $derived(gate.approvalSubject);
  const rows = $derived(subject ? Object.entries(subject.canonical).map(([k, v]) => ({ k, label: humanizeKey(k), v })) : []);
  const flat = (v: unknown): string | null => (typeof v === 'string' ? v : Array.isArray(v) && v.every((x) => typeof x === 'string') ? v.join(', ') : null);
  const name = $derived(agent.name || 'The agent');
  let rawOpen = $state(false);
  let copied = $state(false);
  async function copy(): Promise<void> {
    if (!subject) return;
    try { await navigator.clipboard.writeText(subject.digest); copied = true; setTimeout(() => (copied = false), 2000); } catch { copied = false; }
  }
</script>

<section class="gate-frame" style="display: contents" aria-label="The approval">
  {#if showLead}
    <div class="ar-q"><h3><Face id={name} label={name} mood="needs" size={24} ring="mood" />{quoteHeader(name, 'review')}{#if lead?.at}<span class="mono">{quoteWhen(lead.at, new Date())}</span>{/if}</h3><blockquote>{lead?.sentence ?? gate.summary ?? 'Waiting for your review.'}</blockquote></div>
  {/if}
  {#if subject}
    <div>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex: a scrollable region must be keyboard reachable -->
      <div tabindex="0" role="region" aria-label="The approval subject" style="overflow-x: auto;">
        <table class="ss-subj">
          <caption class="sr">The subject you are approving</caption>
          <tbody>
            <tr><th scope="row">Revision</th><td class="mono">{subject.revision}</td></tr>
            {#each rows as r (r.k)}<tr><th scope="row">{r.label}</th><td class={(flat(r.v) ?? '').length > 120 ? 'serif' : undefined}>{#if flat(r.v) !== null}{flat(r.v)}{:else}<StructuredValue value={r.v} />{/if}</td></tr>{/each}
            <tr><th scope="row">Digest</th><td><span class="mono">{shortDigest(subject.digest)}</span><sup class="fn">{footnote}</sup> <button class="ar-lk" type="button" aria-label="Copy the full digest" onclick={copy}><Icon name={copied ? 'check' : 'copy'} size={14} strokeWidth={1.75} />{copied ? 'Copied' : 'Copy'}</button></td></tr>
          </tbody>
        </table>
      </div>
      <div class="ss-seal"><Icon name="lock" size={15} strokeWidth={1.75} />Approving exactly this version<span class="mono muted">sealed {sealOf(subject.digest)}</span><button class="ar-lk" type="button" aria-expanded={rawOpen} style="margin-left: auto;" onclick={() => (rawOpen = !rawOpen)}>{rawOpen ? 'Hide raw JSON' : 'View raw JSON'}</button></div>
      {#if rawOpen}<RawJson value={subject.canonical} />{/if}
    </div>
  {/if}
</section>
