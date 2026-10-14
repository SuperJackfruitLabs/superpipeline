<script lang="ts">
  /**
   * Appearance (SP-Dlg-Appearance): vibekit's sectioned Dialog around its AppearancePicker. Every
   * change applies and is saved at once (appearance.set writes the cookie and <html>); Done closes.
   * Turning the location switch on asks the browser; off forgets the place.
   */
  import { AppearancePicker, Button, Dialog, type Appearance } from '@superjackfruit/vibekit';
  import { appearance } from '$lib/appearance.svelte';
  import { app } from '$lib/stores/app.svelte';
  import { firstName, personName } from './person';
  import { appearanceReadout } from './appearance-copy';
  import { groupByUrgency, summarize } from '$lib/components/board/card-summary';
  import './css/ap.css';

  /** Chrome still resolves some zones to their old IANA links (Asia/Calcutta); the words use the current name. */
  const LINKS: Record<string, string> = { 'Asia/Calcutta': 'Asia/Kolkata', 'Asia/Katmandu': 'Asia/Kathmandu', 'Asia/Saigon': 'Asia/Ho_Chi_Minh', 'Europe/Kiev': 'Europe/Kyiv' };
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timeZone = LINKS[zone] ?? zone;
  const first = $derived(firstName(personName(app.user, app.members)));
  const clock = $derived(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(new Date()));
  const readout = $derived(appearanceReadout({ vibe: appearance.value.vibe, phase: appearance.phase, timeOff: appearance.value.timeStrength === 'off', firstName: first, clock }));
  /** The open board's own counts for the previews (needs you, in progress, waiting to start); none without a board. */
  const counts = $derived.by(() => {
    const b = app.board;
    if (!b) return null;
    const list = summarize(b, b.cards.filter((c) => !c.archivedAt), { agents: app.agents, members: app.members, labels: app.labelById(), nowMs: Date.now() });
    const n = Object.fromEntries(groupByUrgency(list).map((g) => [g.urgency, g.cards.length]));
    return { needs: n.needs ?? 0, working: n.working ?? 0, queued: n.queued ?? 0 };
  });
  /** Studio's ramp caption names the open board's first and last stages (SP-Dlg-Appearance-Studio); vibekit's own line without a board. */
  const rampCaption = $derived.by(() => {
    const st = app.board ? [...app.board.stages].sort((a, b) => a.order - b.order) : [];
    return st.length > 1 ? `Stages, ${st[0]!.name} to ${st[st.length - 1]!.name}: one colour family from the accent.` : undefined;
  });
  /** What a vibe changes in Superpipeline: its board and its card (the SP-Dlg-Appearance copy). */
  const vibeNotes = { daylight: nDaylight, paper: nPaper, studio: nStudio, quiet: nQuiet };
  /** Each vibe card's picture: this product's board in that vibe. */
  const previews = { daylight: pDaylight, paper: pPaper, studio: pStudio, quiet: pQuiet };

  function onchange(next: Appearance): void {
    if (next.useLocation && !appearance.value.useLocation) void appearance.useLocation();
    else if (!next.useLocation && appearance.value.useLocation) appearance.stopUsingLocation();
    else appearance.set(next);
  }
  const close = () => (appearance.pickerOpen = false);
</script>

{#snippet nDaylight()}Playful and sunlit. <b>Board:</b> columns with faces. <b>Card:</b> a conversation.{/snippet}
{#snippet nPaper()}Calm and editorial. <b>Board:</b> a front page. <b>Card:</b> a letter.{/snippet}
{#snippet nStudio()}An annual report: warm paper, ink and one blue. <b>Board:</b> a report led by one big figure. <b>Card:</b> a profile with footnotes.{/snippet}
{#snippet nQuiet()}Plain and focused. <b>Board:</b> one list by urgency. <b>Card:</b> a form.{/snippet}
{#snippet vibeHint()}A vibe changes <strong>the layout of your boards and cards</strong>, not only the colours and type. Operate, settings and Workspace keep one layout in every vibe. Every action stays in every vibe.{/snippet}
{#snippet mark()}<svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10a3 3 0 0 1 0 6H8a3 3 0 0 0 0 6h12"></path><path d="M18 4v6"></path></svg>{/snippet}
{#snippet pDaylight()}<div class="pv" aria-hidden="true"><div class="pv-dl-sky">Good afternoon</div><div class="pv-dl-cols"><div class="pv-dl-col"><div class="pv-dl-tile" data-n="1"><i style="background: var(--vk-mood-needs);"></i><s></s></div><div class="pv-dl-tile"><i style="background: var(--vk-mood-working);"></i><s></s></div></div><div class="pv-dl-col"><div class="pv-dl-tile"><i style="background: var(--vk-mood-thinking);"></i><s></s></div></div><div class="pv-dl-col"><div class="pv-dl-tile"><i style="background: var(--vk-mood-done);"></i><s></s></div><div class="pv-dl-tile"><i style="background: var(--vk-mood-done);"></i><s></s></div></div></div></div>{/snippet}
{#snippet pPaper()}<div class="pv pv-pp" aria-hidden="true"><div class="pv-pp-mast">{app.board?.name ?? ''}</div><div class="pv-pp-cols"><div class="pv-pp-col"><span class="pv-pp-h">Waiting on you</span><span class="pv-pp-q">{#if first}<b>Dear {first},</b>{' '}{/if}I stopped, and I’d rather ask than guess…</span><span class="pv-pp-l"></span></div><div class="pv-pp-col"><span class="pv-pp-h">In progress</span><span class="pv-pp-l"></span><span class="pv-pp-l" style="width: 70%;"></span><span class="pv-pp-l"></span></div><div class="pv-pp-col"><span class="pv-pp-h">Shipped</span><span class="pv-pp-l"></span><span class="pv-pp-l" style="width: 60%;"></span></div></div></div>{/snippet}
{#snippet pStudio()}<div class="pv pv-st" aria-hidden="true"><div class="pv-ar-hero"><b>{counts?.needs ?? ''}</b><span><s></s><s></s></span></div><div class="pv-ar-sm"><span><i style="background: var(--vk-stage-1);"></i><u><em data-k="n"></em></u></span><span><i style="background: var(--vk-stage-2);"></i><u><em data-k="n"></em></u></span><span><i style="background: var(--vk-stage-3);"></i><u><em data-k="n"></em><em data-k="b"></em><em data-k="b"></em></u></span><span><i style="background: var(--vk-stage-4);"></i><u><em data-k="n"></em></u></span><span><i style="background: var(--vk-stage-5);"></i><u></u></span><span><i style="background: var(--vk-stage-6);"></i><u></u></span><span><i style="background: var(--vk-stage-7);"></i><u><em data-k="d"></em></u></span></div><div class="pv-ar-rows"><s></s><s style="width: 80%;"></s></div></div>{/snippet}
{#snippet pQuiet()}<div class="pv pv-qt" aria-hidden="true"><span class="pv-qt-h">{app.board?.name ?? ''}</span><span class="pv-qt-g">Needs your decision{#if counts}{' '}({counts.needs}){/if}</span><div class="pv-qt-i" data-n="1"><s></s><u></u></div><div class="pv-qt-i" data-n="1"><s style="width: 70%;"></s><u></u></div><span class="pv-qt-g">In progress{#if counts}{' '}({counts.working}){/if}</span><span class="pv-qt-g">Waiting to start{#if counts}{' '}({counts.queued}){/if}</span><div class="pv-qt-i"><s style="width: 60%;"></s><u></u></div></div>{/snippet}

<Dialog bind:open={appearance.pickerOpen} title="Appearance" description="Vibe, light or dark and time of day apply to every product on this device. The accent belongs to Superpipeline alone."
  width="1000px" frame="sectioned" close="Close appearance" class="ap" onclose={close}>
  <div class="ap-content">
  <AppearancePicker product="superpipeline" value={appearance.value} {onchange} phase={appearance.phase} {timeZone} {vibeNotes} intro={false} {vibeHint} {previews}
    preview={{ nav: ['Inbox', 'Plan', 'Crew'], ...(counts ? { count: counts.needs } : {}), tabs: ['Board', 'List', 'Projects'], mark }} {readout} {rampCaption} />
  </div>
  {#snippet lead()}<span class="ap-saved">Every change applies at once and is saved on this device.</span>{/snippet}
  {#snippet actions()}<Button onclick={close}>Done</Button>{/snippet}
</Dialog>

<style>
  :global(.vk-dialog.ap) { --vk-dialog-x: 30px; --vk-dialog-close-x: 22px; }
  /* The reference's body starts 6px further under the head's description than vibekit's sectioned frame puts it (placement only). */
  /* The reference artboard's type (.art: 16px / 1.45), which the picker's hints and notes inherit (vibekit's dialog body is 1.5), and its body's room: 6px more above the picker and 4px more above the foot (22px where the sectioned frame leaves 18px). */
  /* The reference's .ap-row sits 2px further down than the body's 20px gap (its own margin-top: placement only). */
  :global(.vk-dialog.ap .vk-appearancepicker__row) { margin-top: 2px; }
  :global(.vk-dialog.ap .ap-content) { margin: 6px 0 4px; font-size: var(--vk-text-md); line-height: 1.45; }
  :global(.vk-dialog.ap .ap-saved) { font-size: 14px; color: var(--vk-color-muted); }
</style>
