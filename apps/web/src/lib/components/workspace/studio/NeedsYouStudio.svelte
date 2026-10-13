<!-- apps/web/src/lib/components/workspace/studio/NeedsYouStudio.svelte -->
<script lang="ts">
  import { untrack } from 'svelte';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { NeedsModel } from '../needs-model.svelte';
  import { actionLink, clip, metaLine, needsHeadMeta, studioUnit, unansweredFoot, WS_KIND_LABEL } from '../needs-row';
  import type { WorkspaceTabProps } from '../types';

  let { review, initial }: WorkspaceTabProps = $props();
  const model = new NeedsModel(untrack(() => initial));
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void model.load();
  const pad = (n: number) => String(n).padStart(2, '0');
  const foot = $derived(model.unanswered > 0 ? unansweredFoot(model.unanswered) : (review?.note ?? null));
</script>

<section class="ar-sec" aria-labelledby="nt-h">
  <div class="hd">
    <span class="no">{review?.no ?? '01'}</span>
    {#if review}<span class="kick">{review.tag}</span>{/if}
    <h2 id="nt-h">Waiting on you, across every board{#if model.items.length > 0}{' '}<span class="wo-ct">{model.items.length}</span>{/if}</h2>
    <span class="r">{#if model.cards !== null}{needsHeadMeta(model.unanswered)}{' '}{/if}<button class="ar-btn2" type="button" onclick={() => void model.load()}><LineIcon name="refresh" size={16} stroke={1.75} />{model.refreshing && model.cards !== null ? 'Refreshing…' : 'Refresh'}</button></span>
  </div>
  {#if model.error}
    <p class="ar-hint" role="alert">Could not load what is waiting: {model.error}</p>
  {:else if model.cards === null}
    <p class="ar-hint" role="status">Loading…</p>
  {:else if model.items.length === 0}
    <p class="wo-plain">Nothing on any board is waiting on you.</p>
  {:else}
    <table class="ar-tbl wo-tbl">
      <caption class="sr">Cards waiting on you across every board, oldest first</caption>
      <thead><tr>
        <th style="width: 34px;" scope="col">No.</th><th style="width: 96px;" scope="col">Kind</th><th style="width: 31%;" scope="col">Card · where</th><th scope="col">Why</th><th style="width: 168px;" scope="col">Actions</th>
      </tr></thead>
      <tbody>
        {#each model.items as item, i (item.id)}
          {@const c = item.detail ? clip(item.detail) : null}
          {@const full = model.expanded.includes(item.id)}
          {@const open = model.openId === item.cardId}
          <tr class="wo-need">
            <td><span class="ix">{pad(i + 1)}</span></td>
            <td><span class="wo-kind{studioUnit(item.kind) === 'needs' ? ' needs' : ''}"><span class="u {studioUnit(item.kind)}" aria-hidden="true"></span>{WS_KIND_LABEL[item.kind]}</span></td>
            <td><a class="ttl" href="/b/{item.boardId}/c/{item.cardId}">{item.title}</a><p class="wo-sub">{metaLine(item)}</p></td>
            <td>
              {#if c}
                <div class="ar-q"><blockquote>{full ? item.detail : c.shown}</blockquote>{#if c.long}<button class="ar-lk" aria-expanded={full} type="button" onclick={() => model.toggleFull(item.id)}>{full ? 'Show less' : 'Show all'}</button>{/if}</div>
                <p class="wo-ins">{item.instruction}</p>
              {:else}
                <p class="wo-plain">{item.instruction}</p>
              {/if}
            </td>
            <td><div class="wo-acts">
              {#each item.actions as a (a)}
                {#if a === 'resume'}<button class="ar-btn" aria-expanded={open} type="button" onclick={() => void model.toggleResume(item.cardId)}>Resume</button>
                {:else}{@const l = actionLink(item, a)}{#if l}<a class={l.primary ? 'ar-btn' : 'ar-btn2'} href={l.href}>{l.label}</a>{/if}{/if}
              {/each}
            </div></td>
          </tr>
          {#if open}
            <tr class="wo-resume"><td></td><td></td><td colspan="3">
              <form aria-label="Resume this card" onsubmit={(e) => { e.preventDefault(); void model.send(item); }}>
                <div class="ar-field"><label for="rs-note">Note for the agent</label><textarea class="ar-ta" id="rs-note" style="min-height: 72px;" maxlength="8000" bind:value={model.drafts[item.cardId]}></textarea></div>
                {#if model.refusal}<p class="ar-hint" role="alert">{model.refusal}</p>{/if}
                <div class="row">
                  <button class="ar-btn" type="submit" disabled={model.sending || (model.drafts[item.cardId] ?? '').trim() === ''}>Send back to work</button>
                  <button class="ar-lk" type="button" onclick={() => void model.toggleResume(item.cardId)}>Cancel</button>
                </div>
              </form>
            </td></tr>
          {/if}
        {/each}
      </tbody>
    </table>
  {/if}
  {#if foot}<p class="wo-foot">{foot}</p>{/if}
</section>
