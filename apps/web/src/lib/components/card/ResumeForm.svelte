<!-- apps/web/src/lib/components/card/ResumeForm.svelte -->
<script lang="ts">
  /**
   * Sending a stopped card back to work, in place of the card's sentence (composition contract §11.3;
   * card-states.html "Stopped"): why it stopped, in the agent's own words, an earlier stage to resume
   * at when there is one, and the note the next attempt reads. Resume is the one primary; Move sits
   * beside it. An empty note is a field error naming the agent; no request is made.
   */
  import { Button, Field } from '@superjackfruitlabs/vibekit-ui';
  import type { CardModel } from './card-model.svelte';
  import { RESUME_NOTE_LABEL, RESUME_PLACEHOLDER, resumeLead } from './card-words';
  import { RESUME_NOTE_MAX } from './resume-model.svelte';

  let { model: m }: { model: CardModel } = $props();
  const r = $derived(m.resume);
  const targets = $derived(r.targets.filter((t) => t.allowed));
  const why = $derived(m.lead?.sentence ?? m.card?.needsHuman?.summary ?? null);
  // vibekit Field keeps its textarea to itself; the attachment hands it to the resume model, which focuses it.
  const noteRef = (el: Element) => {
    const area = el.querySelector('textarea') ?? undefined;
    m.resume.noteEl = area;
    return () => { if (m.resume.noteEl === area) m.resume.noteEl = undefined; };
  };
  function send(e: Event): void {
    e.preventDefault();
    if (!r.busy) void r.submit();
  }
</script>

<form class="cv-panel" data-row="resume" data-section="resume" onsubmit={send}>
  <div class="cv-panel__body">
    <p class="cv-sentence cv-pre"><b>{resumeLead(m.agent.name, m.stageName, m.card?.attemptCount ?? 0)}</b>{#if why}{' '}{why}{/if}</p>
    {#if targets.length > 1}
      <Field id="cv-resume-at" label="Resume at stage" control="select" bind:value={r.target}
        options={targets.map((t) => ({ value: t.key, label: `${t.n} · ${t.name}${t.current ? ' (this stage)' : ''}` }))} />
    {/if}
    <div class="cv-note" {@attach noteRef}>
      <Field id="cv-resume-note" control="textarea" rows={2} maxlength={RESUME_NOTE_MAX} label={RESUME_NOTE_LABEL}
        hint={r.error ? undefined : r.hint} error={r.error ?? undefined} placeholder={RESUME_PLACEHOLDER} bind:value={r.note} />
    </div>
  </div>
  <div class="cv-act">
    <Button type="submit" variant="primary" aria-disabled={r.busy ? 'true' : undefined} data-busy={r.busy ? 'true' : undefined}>Resume</Button>
    <Button variant="secondary" onclick={() => m.openMove()}>Move</Button>
  </div>
  <span class="vk-visually-hidden" role="status">{r.busy ? 'Sending…' : ''}</span>
</form>
