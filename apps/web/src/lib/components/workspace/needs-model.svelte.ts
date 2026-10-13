// apps/web/src/lib/components/workspace/needs-model.svelte.ts
import { tick } from 'svelte';
import { listAttention, resumeCard, type StaleCard } from '$lib/api';
import { itemsFromStale, type AttentionItem } from '$lib/components/attention/attention';
import { refusalOf } from '$lib/components/attention/refusal';
import { app } from '$lib/stores/app.svelte';
import { sortOldestFirst } from './needs-row';
import { workspaceCounts } from './workspace-counts.svelte';
import type { WorkspaceTabProps } from './types';

export class NeedsModel {
  cards = $state<StaleCard[] | null>(null);
  unanswered = $state(0);
  error = $state<string | null>(null);
  refreshing = $state(false);
  /** Card id whose resume form is open — one at a time. */
  openId = $state<string | null>(null);
  drafts = $state<Record<string, string>>({});
  expanded = $state<string[]>([]);
  sending = $state(false);
  refusal = $state<string | null>(null);
  items: AttentionItem[] = $derived(this.cards ? sortOldestFirst(itemsFromStale(this.cards)) : []);

  constructor(initial?: WorkspaceTabProps['initial']) {
    if (initial?.expandedResume) {
      this.openId = initial.expandedResume;
      this.drafts = { [initial.expandedResume]: initial.resumeText ?? '' };
    }
  }

  async load(): Promise<void> {
    this.refreshing = true;
    const req = listAttention();
    app.markBusy(req);
    try {
      const res = await req;
      this.cards = res.cards;
      this.unanswered = res.boardsUnanswered;
      this.error = null;
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.refreshing = false;
    }
  }

  async toggleResume(cardId: string): Promise<void> {
    this.refusal = null;
    this.openId = this.openId === cardId ? null : cardId;
    if (this.openId) {
      await tick();
      document.getElementById('rs-note')?.focus();
    }
  }

  toggleFull(id: string): void {
    this.expanded = this.expanded.includes(id) ? this.expanded.filter((x) => x !== id) : [...this.expanded, id];
  }

  async send(item: AttentionItem): Promise<void> {
    const text = (this.drafts[item.cardId] ?? '').trim();
    if (text === '' || this.sending) return;
    this.sending = true;
    this.refusal = null;
    try {
      const refused = await refusalOf(await resumeCard(item.boardId, item.cardId, text));
      if (refused) { this.refusal = refused; return; }
      this.openId = null;
      const { [item.cardId]: _sent, ...rest } = this.drafts;
      this.drafts = rest;
      await this.load();
      await workspaceCounts.refresh();
    } finally {
      this.sending = false;
    }
  }
}
