<!-- apps/web/src/lib/components/card/CardHistory.svelte -->
<script lang="ts">
  /**
   * "Conversation and history", closed until asked for, with its count (rule 5; §11.3): each attempt
   * (the newest open) with its own timeline and its own tool-call toggle, the decisions, the handoff
   * the card carries, the approved delivery, related prior work, and the comments with their composer.
   */
  import { Button, Disclosure, Field } from '@superjackfruitlabs/vibekit-ui';
  import { clockHM } from '$lib/when';
  import { isControlRow, isNarrative, visibleActivities } from '$lib/activity-groups';
  import type { CardModel } from './card-model.svelte';
  import HandoffView from './HandoffView.svelte';
  import ToolCallDetails from './ToolCallDetails.svelte';
  import DeliveryPanel from './DeliveryPanel.svelte';
  import { safeHref } from './spec-details';
  import { attemptWord, eventSentence, eventVerb } from './state-words';
  import { attemptsLine, handoffLine, historyMeta, relatedLine } from './card-words';

  let { model: m }: { model: CardModel } = $props();
  const card = $derived(m.card!);
  const name = (id: string | null) => (id ? m.agents.find((a) => a.id === id)?.name?.trim() || 'An agent' : 'An agent');
  const runs = $derived([...m.activityGroups].reverse());
  const stageNameOf = (key: string | null) => m.stages.find((s) => s.key === key)?.name ?? 'an earlier stage';
  const comments = $derived(m.comments.comments);
  const entries = $derived(m.activityGroups.reduce((n, g) => n + g.counts.total, 0) + m.decidedGates.length + comments.length);
  const lastAt = $derived(
    [...(m.detail?.activities ?? []).map((a) => a.ts), ...comments.map((c) => c.createdAt)].sort().at(-1) ?? null,
  );

  $effect(() => m.comments.attach());
  function commentKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void m.comments.submit(); }
  }
</script>

<div class="cv-disc" data-block="history">
  <Disclosure summary="Conversation and history" meta={historyMeta(entries, lastAt, Date.now())}>
    <div class="cv-history">
      <div class="cv-runs" data-section="activity">
        {#each runs as g, ri (g.runId)}
          {@const a = m.attempts.find((x) => x.runId === g.runId)}
          {@const who = name(g.agentId)}
          {@const tools = m.toolsShown(g.runId)}
          {@const view = visibleActivities(g.activities, isNarrative, tools, isControlRow)}
          {@const entry = m.stageByRun.get(g.runId)}
          {@const isOpen = m.isRunOpen(g.runId, ri === 0)}
          {@const n = (m.attempts.findIndex((x) => x.runId === g.runId) + 1) || runs.length - ri}
          <!-- data-reveal: opening an attempt grows it into place (lib/motion/reveal.ts), as the forks' attempts did. -->
          <div class="cv-run" data-attempt={g.runId} data-reveal>
            <button class="cv-runhead" type="button" data-attempt-head={g.runId} aria-expanded={isOpen} aria-controls={isOpen ? `cv-run-${g.runId}` : undefined} onclick={() => m.toggleRun(g.runId, ri === 0)}>
              <b>Attempt {n} · {stageNameOf(g.stageKey)} · {who}</b> <span class="cv-meta">{a ? attemptWord(a) : (g.outcome ?? 'working')} · {g.counts.total} events · {g.counts.error} errors</span>
            </button>
            {#if isOpen}
              <div class="cv-runbody" id="cv-run-{g.runId}">
                <ul class="cv-events">
                  {#each view.rows as ev (ev.seq)}
                    <li data-stop={ev.signal === 'stop' ? '1' : '0'}><span class="cv-time">{clockHM(ev.ts)}</span><span><b>{eventVerb(ev)}</b> {eventSentence(ev)}<ToolCallDetails parameter={ev.parameter} result={ev.result} /></span></li>
                  {/each}
                </ul>
                {#if tools || (g.counts.action > 0 && !view.shownBecauseNoNarrative)}
                  <Button variant="quiet" data-attempt-tools={g.runId} pressed={tools} onclick={() => m.toggleTools(g.runId)}>{tools ? 'Hide tool calls' : 'Show tool calls'}</Button>
                {/if}
                {#if entry?.failureReason}<p class="cv-meta">{entry.failureReason}</p>
                {:else if entry && entry.handoff && typeof entry.handoff === 'object' && Object.keys(entry.handoff).length}<div class="cv-handed"><p class="cv-grouphead">Handed on</p><HandoffView handoff={entry.handoff} testid="handed-on-{g.runId}" /></div>{/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
      {#if m.attempts.length}<p class="cv-meta" data-section="attempts">{attemptsLine(m.attempts, name)}</p>{:else}<span hidden data-section="attempts"></span>{/if}
      {#if m.decidedGates.length}
        <div data-section="decisions">
          <p class="cv-grouphead">Decisions</p>
          <ul class="cv-list">{#each m.decidedGates as d (d.id)}<li>{d.decision ?? d.status} at {stageNameOf(d.stageKey)}{d.decidedBy ? ` by ${m.principalName(d.decidedBy)}` : ''}{d.comment ? `: ${d.comment}` : ''}</li>{/each}</ul>
        </div>
      {:else}<span hidden data-section="decisions"></span>{/if}
      {#if m.counts.handoff}
        <div data-section="handoff"><p class="cv-grouphead">Handoff from {m.stages[m.stageIndex - 1]?.name ?? 'the last stage'}</p><HandoffView handoff={m.handoff} testid="carried-handoff" /></div>
      {:else}
        <p class="cv-meta" data-section="handoff">{handoffLine({ handoff: null, stageIndex: m.stageIndex, stages: m.stages, queuedByName: m.queuedByName || 'someone', createdAt: card.createdAt })}</p>
      {/if}
      {#if m.counts.deliveryActive}<div data-section="delivery"><DeliveryPanel model={m} /></div>{:else}<span hidden data-section="delivery"></span>{/if}
      {#if m.related.phase !== 'absent'}
        <div data-section="related">
          <p class="cv-grouphead">Related prior work</p>
          <p class="cv-meta">{relatedLine(m.related.phase, m.related.items.length)}</p>
          {#if m.related.items.length}<ul class="cv-list">{#each m.related.items as r (r.itemId)}<li>{#if safeHref(r.url)}<a class="cv-link" href={safeHref(r.url)!}>{r.title}</a>{:else}{r.title}{/if} <span class="cv-meta">· {r.snippet}</span></li>{/each}</ul>{/if}
        </div>
      {:else}<span hidden data-section="related"></span>{/if}
      <div class="cv-comments" data-section="comments">
        <p class="cv-grouphead">Comments</p>
        {#if comments.length}
          <ul class="cv-list">{#each comments as c (c.id)}<li><b>{m.authorName(c.author)}:</b> <span class="cv-pre">{c.deletedAt ? 'Comment deleted' : c.body}</span></li>{/each}</ul>
        {:else if !m.comments.loaded}<p class="cv-meta">Loading comments…</p>
        {:else}<p class="cv-meta">No comments yet. The agent that works this card reads them.</p>{/if}
        <Field id="cv-comment-{card.id}" label="Add a comment" control="textarea" rows={2} maxlength={8192} placeholder="⌘ or Ctrl + Enter posts it" bind:value={m.comments.draft} onkeydown={commentKey} />
        {#if m.comments.error}<p class="cv-alert" role="alert">{m.comments.error}</p>{/if}
        <div class="cv-row">
          <Button variant="secondary" aria-disabled={m.comments.posting ? 'true' : undefined} onclick={() => { if (!m.comments.posting) void m.comments.submit(); }}>Comment</Button>
          <span class="vk-visually-hidden" role="status">{m.comments.posting ? 'Posting…' : ''}</span>
        </div>
      </div>
    </div>
  </Disclosure>
</div>
