<!-- apps/web/src/lib/components/card/phone/StudioPhonePanes.svelte -->
<script lang="ts">
  import { hasStructuredDetail } from '$lib/components/card/phone/phone-card-words';
  /** The five Studio phone panes (card-studio §6). Only the active one renders. */
  import { Face, Button } from '@superjackfruit/vibekit';
  import type { CardModel } from '../card-model.svelte';
  import PhoneIcon from '$lib/components/parts/PhoneIcon.svelte';
  import RawJson from '../RawJson.svelte';
  import HandoffView from '../HandoffView.svelte';
  import StructuredValue from '../StructuredValue.svelte';
  import { isPlainObject, normaliseValue, rawJson } from '../spec-details';
  import LinkAddForm from '../LinkAddForm.svelte';
  import { detailValue, eventRows, studioDetailsSummary, type PhoneCardView } from './phone-card-words';

  let { model, view, pane }: { model: CardModel; view: PhoneCardView; pane: 'spec' | 'log' | 'links' | 'talk' | 'cost' } = $props();
  const c = $derived(model.card!);
  let open = $state<Record<string, boolean>>({});
  let raw = $state(false);
  const id = $props.id();
  const runsStudio = $derived(view.runs.map((r) => ({ ...r, rows: eventRows(model.activityGroups.find((g) => g.runId === r.key)?.activities ?? [], model.lead?.sentence ?? null, model.showToolCalls, 'studio') })));
  /** What the run handed on, when it is a document (drawn as the drawer draws it). */
  const handedOn = (runId: string): Record<string, unknown> | null => {
    const h = model.stageByRun?.get(runId)?.handoff;
    return h && typeof h === 'object' && Object.keys(h).length ? (h as Record<string, unknown>) : null;
  };
</script>

{#if pane === 'spec'}
  <h3>Facts</h3>
  <dl class="pc-fx3"><div><dt>Priority</dt><dd>{view.priorityWord}</dd></div><div><dt>Due</dt><dd>{view.dueWord ?? 'none'}</dd></div><div><dt>Labels</dt><dd>{view.labelsWord ?? 'none'}</dd></div></dl>
  <h3>Description</h3><p class="p" data-section="description">{c.spec?.description ?? 'No description.'}</p>
  <h3>Things to prove <span class="mono">{model.counts.criteria}</span></h3>
  <ol class="pc-nl" data-section="criteria">{#each model.acceptanceCriteria ?? [] as a, i (i)}<li><span>{a}</span></li>{/each}</ol>
  <h3>Plan</h3>
  <div data-section="plan" style="display: contents;">{#if view.plan?.length}<ol class="pc-nl">{#each view.plan as s, i (i)}<li><span>{s.done ? '✓ ' : ''}{s.text}</span></li>{/each}</ol>{:else}<p class="note">{view.speaker} did not post a plan for this card.</p>{/if}</div>
  <details class="pc-det" data-section="details" data-testid="spec-details" open={!model.counts.description || hasStructuredDetail(view.groups, model.acceptanceCriteria)}>
    <summary><h3>Details <span class="mono">{studioDetailsSummary(view.groups.map((g) => g.label), view.fieldsCount)}</span></h3></summary>
    {#each view.groups as g (g.label)}
      <div class="pc-grp"><h4>{g.label}</h4><dl class="pc-kv">
        {#each g.rows as r (r.key)}
          {@const dv = detailValue(r.value, model.acceptanceCriteria, 'Things to prove')}
          <div><dt>{r.label}</dt><dd data-testid="spec-value-{r.key}">
            {#if dv.kind === 'text'}{open[r.key] && dv.more ? `${dv.shown} ${dv.more}` : dv.shown}{#if dv.more}{' '}<button class="ar-lk" type="button" aria-expanded={!!open[r.key]} style="min-height: 0px;" onclick={() => (open[r.key] = !open[r.key])}>{open[r.key] ? 'Show less' : 'Show more'}</button>{/if}
            {:else if dv.kind === 'evidence'}{dv.text}
            {:else if dv.kind === 'matrix'}<span class="id">{dv.id}</span> · <a href="/b/{model.boardId}/c/{dv.card}">onboarding card</a>
            {:else if dv.kind === 'repo'}{dv.text}<a href={dv.href}>policy</a>
            {:else if isPlainObject(r.value) || (Array.isArray(r.value) && r.value.some((x) => typeof x !== 'string'))}<StructuredValue value={normaliseValue(r.value)} depth={0} />
            {:else}{dv.text}{/if}
          </dd></div>
        {/each}
      </dl></div>
    {/each}
  </details>
  <div class="pc-row">
    <button class="ar-lk" type="button" aria-expanded={raw} onclick={() => (raw = !raw)}>View raw JSON</button>
    <button class="ar-lk" type="button" onclick={() => navigator.clipboard?.writeText(rawJson(c.spec)).catch(() => {})}><PhoneIcon name="copy-studio" form="plain" size={14} />Copy</button>
  </div>
  {#if raw}<RawJson value={c.spec} />{/if}
  <h3>Project</h3>
  <div data-section="project" style="display: contents;">
    {#if view.project.line}<p>{view.project.line}</p><div><button class="ar-lk" type="button" onclick={() => model.project.start()}>Change project</button></div>
    {:else}<p class="note">No project.</p><div><button class="ar-lk" type="button" onclick={() => model.project.start()}>Assign to a project</button></div>{/if}
  </div>
{:else if pane === 'log'}
  <div data-section="activity" style="display: contents;">
    <h3>Session activity <span class="mono">{model.counts.runs} {model.counts.runs === 1 ? 'run' : 'runs'}</span></h3>
    {#if view.grantLine}<p class="note">{view.grantLine}</p>{/if}
    {#each runsStudio as r (r.key)}
      <details class="pc-run" open={r.open}>
        <summary><span class="rt">{r.title}</span><span class="rm">{r.meta}</span></summary>
        <ol class="pc-ev">{#each r.rows as e (e.key)}<li><span class="evt" class:sigt={e.stop}>{e.verb}</span><span>{e.body}</span><span class="tm">{e.time}</span></li>{/each}</ol>
        {#if handedOn(r.key)}<HandoffView handoff={handedOn(r.key)} testid="handed-on-{r.key}" />{/if}
      </details>
    {/each}
    <button class="ar-lk" type="button" aria-pressed={model.showToolCalls} onclick={() => (model.showToolCalls = !model.showToolCalls)}>{model.showToolCalls ? 'Hide tool calls' : 'Show tool calls'}</button>
  </div>
  <h3>Decisions</h3><p class="note" data-section="decisions">{view.decisions ? `${view.decisions} decided.` : 'No decisions on this card yet.'}</p>
  <h3>Handoff</h3>{#if model.counts.handoff}<div data-section="handoff"><HandoffView handoff={model.handoff} testid="carried-handoff" /></div>{:else}<p class="p" data-section="handoff">{view.handoff.text}</p>{/if}
  <h3>Attempts <span class="mono">{model.counts.attempts}</span></h3>
  <ol class="pc-att" data-section="attempts">
    {#each view.attemptRows as a (a.n)}<li><span class="mono">{a.n}</span><span class="who"><Face id={a.agentId} label={a.agentName} mood={a.mood} size={20} /> {a.agentName}</span><span class="mono">{a.usd}</span><span>{a.text}</span></li>{/each}
  </ol>
{:else if pane === 'links'}
  <div data-section="links" style="display: contents;">
    <h3>Links</h3>
    {#if view.links.length}<ul class="pc-refs">{#each view.links as l (l.key)}<li><a href={l.href}><b>{l.title}</b><span>{l.label}</span></a></li>{/each}</ul>
    {:else}<p class="note">Nothing blocks this card and it blocks nothing.</p>{/if}
    <div><Button variant="secondary" class="ar-btn2" type="button" onclick={() => model.links.openAdd()}>{#snippet icon()}<PhoneIcon name="plus" form="plain" size={15} />{/snippet}Add link</Button></div>
    <LinkAddForm {model} />
  </div>
  <div data-section="subtasks" style="display: contents;">
    <h3>Sub-tasks <span class="mono">{view.subtasks.count}</span></h3>
    <p class="note">{view.subtasks.line}</p>
    <form class="pc-add" onsubmit={(e) => { e.preventDefault(); if (!model.subtasks.adding) void model.subtasks.add(); }}>
      <label class="sr" for="pst-{id}">New sub-task title</label>
      <input id="pst-{id}" class="ar-in" type="text" placeholder="Add a sub-task" bind:value={model.subtasks.title} />
      <Button variant="secondary" class="ar-btn2" type="submit" aria-disabled={model.subtasks.adding ? 'true' : undefined}>Add</Button><span class="sr" role="status">{model.subtasks.adding ? 'Adding…' : ''}</span>
    </form>
  </div>
  <div data-section="references" style="display: contents;">
    <h3>References <span class="mono">{model.counts.refs}</span></h3>
    <ul class="pc-refs">{#each view.refs as r (r.id)}<li><a href={r.href}><b>{r.title}</b>{#if r.subtitle}<span>{r.subtitle}</span>{/if}<small>{r.source}</small></a></li>{/each}</ul>
    <form class="pc-add" onsubmit={(e) => { e.preventDefault(); void model.refsForm.add(); }}>
      <label class="sr" for="prf-{id}">Attach a link or Superlibrary item</label>
      <input id="prf-{id}" class="ar-in" type="url" placeholder="Paste a link to attach" bind:value={model.refsForm.url} />
      <Button variant="secondary" class="ar-btn2" type="submit">Add</Button>
    </form>
  </div>
  <h3>Related prior work</h3><p class="note" data-section="related">{view.related ? `${view.related} related.` : 'No related prior work found in Superlibrary.'}</p>
{:else if pane === 'talk'}
  <div data-section="comments" style="display: contents;">
    <h3>Comments</h3>
    {#if model.comments.comments.length === 0}<p class="note">No comments yet.</p>{:else}<ul class="pc-refs">{#each model.comments.comments as cm (cm.id)}<li><b>{cm.author.name ?? 'Someone'}</b> <span>{cm.body}</span></li>{/each}</ul>{/if}
    <div class="ar-field"><label for="pcm-{id}">Comment</label><textarea id="pcm-{id}" class="ar-in" rows="2" placeholder="Write a comment" maxlength="8192" bind:value={model.comments.draft} onkeydown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void model.comments.submit(); } }}></textarea></div>
    <div class="pc-row" style="justify-content: space-between;"><span class="note">⌘ or Ctrl + Enter to post</span><Button variant="secondary" class="ar-btn2" type="button" aria-disabled={model.comments.posting ? 'true' : undefined} onclick={() => { if (!model.comments.posting) void model.comments.submit(); }}>Comment</Button><span class="sr" role="status">{model.comments.posting ? 'Posting…' : ''}</span></div>
  </div>
{:else}
  <h3>Cost</h3><p data-section="cost"><strong class="mono">{view.cost.amount}</strong>{view.cost.rest}</p>
  <h3>Delivery</h3><p class="note" data-section="delivery">{model.counts.deliveryActive ? 'Delivery is active on this card; approve or change it on the card page.' : 'No approved delivery on this card.'}</p>
{/if}
