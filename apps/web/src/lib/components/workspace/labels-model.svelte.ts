// apps/web/src/lib/components/workspace/labels-model.svelte.ts
import { listLabels, createLabel, updateLabel, deleteLabel, type Label } from '$lib/api';
import { app } from '$lib/stores/app.svelte';
import { recolourLabel, removeLabel, renameLabel } from './label-manager';
import { NEW_LABEL_COLOUR } from './workspace-words';
import { workspaceCounts } from './workspace-counts.svelte';

const deps = { updateLabel, deleteLabel };

export class LabelsModel {
  labels = $state<Label[] | null>(null);
  error = $state<string | null>(null);
  removing = $state<string | null>(null);
  newName = $state('');
  /** Null until a colour is picked: the swatch shows the needs mood, the request sends NEW_LABEL_COLOUR. */
  newColour = $state<string | null>(null);
  creating = $state(false);

  async refresh(): Promise<void> {
    const req = listLabels();
    app.markBusy(req);
    try { this.labels = await req; } catch (e) { this.error = e instanceof Error ? e.message : String(e); this.labels ??= []; }
  }

  private async fail(res: Response, what: string): Promise<void> {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    this.error = body?.error ?? `Couldn't ${what} (${res.status})`;
  }

  async rename(l: Label, name: string): Promise<void> {
    const trimmed = name.trim();
    if (trimmed === '' || trimmed === l.name) return;
    this.error = null;
    const res = await renameLabel(deps, l.id, trimmed);
    if (!res.ok) await this.fail(res, 'rename that label');
    await this.refresh();
  }

  async recolour(l: Label, colour: string): Promise<void> {
    if (colour === l.colour) return;
    const res = await recolourLabel(deps, l.id, colour);
    if (!res.ok) await this.fail(res, 'recolour that label');
    await this.refresh();
  }

  async remove(l: Label): Promise<void> {
    if (!confirm(`Delete the label "${l.name}"? Cards carrying it will drop it on their next edit.`)) return;
    this.removing = l.id;
    try {
      const res = await removeLabel(deps, l.id);
      if (!res.ok) await this.fail(res, 'remove that label');
      await this.refresh();
      await workspaceCounts.refresh();
    } finally { this.removing = null; }
  }

  async add(): Promise<void> {
    const name = this.newName.trim();
    if (name === '' || this.creating) return;
    this.creating = true;
    this.error = null;
    try {
      const res = await createLabel({ name, colour: this.newColour ?? NEW_LABEL_COLOUR });
      if (!res.ok) { await this.fail(res, 'add that label'); return; }
      this.newName = '';
      this.newColour = null;
      await this.refresh();
      await workspaceCounts.refresh();
    } finally { this.creating = false; }
  }
}
