// apps/web/src/lib/components/settings/settings-model.svelte.ts
import { capabilityTag } from '@superpipeline/contract';
import { renameBoard, setGithubConfig, setStages, patchStage, getProfiles, createProfile, type BoardSnapshot, type Profile, type Stage } from '$lib/api';
import { app } from '$lib/stores/app.svelte';
import { cardsPerStage, ownerText, unsavedCount, type WorksBy } from './settings-words';

export interface SettingsContext { board: BoardSnapshot; onChanged: () => void }
const parts = (raw: string) => [...new Set(raw.split(',').map(capabilityTag).filter((c) => c !== ''))];

export class SettingsModel {
  private ctx: () => SettingsContext;
  get board(): BoardSnapshot { return this.ctx().board; }
  agents = $derived(app.agents);

  nameInput = $state('');
  nameBusy = $state(false);
  nameError = $state<string | null>(null);
  draft = $state<Stage[]>([]);
  stagesError = $state<string | null>(null);
  newStageName = $state('');
  savingStages = $state(false);
  /** When each stage's standing rule was last saved here (ms); the line reads "Rule saved · {ago}". */
  ruleSavedAt = $state<Record<string, number>>({});
  now = $state(Date.now());
  githubSecret = $state('');
  issueTrigger = $state(false);
  ghBusy = $state(false);
  ghError = $state<string | null>(null);
  copied = $state<'url' | 'secret' | null>(null);
  profiles = $state<Profile[]>([]);
  /** The profiles' read: pending until it answers (never "No profiles yet" before), failed is said as such. */
  profilesState = $state<'loading' | 'ready' | 'failed'>('loading');
  pKey = $state('');
  pModel = $state('');
  profileBusy = $state(false);
  profileError = $state<string | null>(null);

  cardsPerStage = $derived(cardsPerStage(this.board.cards));
  unsaved = $derived(unsavedCount(this.draft, this.board.stages));
  nameDirty = $derived(this.nameInput.trim() !== '' && this.nameInput.trim() !== this.board.name);
  webhookUrl = $derived(this.board.github.webhookUrl || `${location.origin}/v1/boards/${this.board.boardId}/webhooks/github?tenant=${this.board.tenantId}`);

  constructor(ctx: () => SettingsContext) {
    this.ctx = ctx;
    const b = ctx().board;
    this.nameInput = b.name ?? '';
    this.issueTrigger = b.github.issueTrigger;
    this.draft = b.stages.map((s) => ({ ...s }));
    void getProfiles(b.boardId!).then((p) => { this.profiles = p; this.profilesState = 'ready'; }).catch(() => { this.profilesState = 'failed'; });
  }

  /** Call from an $effect: ticks `now` every 30 s and returns the cleanup. */
  startClock(): () => void {
    const t = setInterval(() => (this.now = Date.now()), 30_000);
    return () => clearInterval(t);
  }

  private changed(): void { this.ctx().onChanged(); }
  /** What a screen reader hears while a section saves (role=status). */
  busyWords = $derived(this.nameBusy ? 'Renaming the board…' : this.savingStages ? 'Saving the pipeline…' : this.ghBusy ? 'Saving the GitHub settings…' : this.profileBusy ? 'Adding the profile…' : '');

  async saveName(): Promise<void> {
    if (!this.nameDirty || this.nameBusy) return;
    this.nameBusy = true;
    this.nameError = null;
    try {
      const res = await renameBoard(this.board.boardId!, this.nameInput.trim());
      if (!res.ok) { this.nameError = `Could not rename the board (${res.status}).`; return; }
      this.changed();
    } finally { this.nameBusy = false; }
  }

  setWorksBy(stage: Stage, by: WorksBy): void {
    if (by === 'person') { stage.ownerKind = 'human'; delete stage.owner; delete stage.requires; }
    else { stage.ownerKind = 'capability'; }
  }

  setOwner(stage: Stage, raw: string): void {
    const p = parts(raw);
    if (p.length > 1) { stage.requires = stage.requires?.any ? { any: p } : { all: p }; delete stage.owner; }
    else { delete stage.requires; stage.owner = p[0] ?? ''; }
  }

  setMatch(stage: Stage, match: 'all' | 'any'): void {
    const p = parts(ownerText(stage));
    stage.requires = match === 'any' ? { any: p } : { all: p };
  }

  addStage(): void {
    const name = this.newStageName.trim();
    if (name === '') return;
    let key = capabilityTag(name) || `stage-${this.draft.length + 1}`;
    let n = 2;
    while (this.draft.some((s) => s.key === key)) key = `${capabilityTag(name)}-${n++}`;
    this.draft = [...this.draft, { key, name, order: this.draft.length }];
    this.newStageName = '';
  }

  removeStage(key: string): void { this.draft = this.draft.filter((s) => s.key !== key).map((s, i) => ({ ...s, order: i })); }

  move(index: number, by: number): void {
    const to = index + by;
    if (to < 0 || to >= this.draft.length) return;
    const next = [...this.draft];
    [next[index], next[to]] = [next[to]!, next[index]!];
    this.draft = next.map((s, i) => ({ ...s, order: i }));
  }

  async saveRule(stage: Stage, text: string): Promise<void> {
    const next = text.trim();
    if (next === (stage.instructions ?? '').trim()) return;
    const res = await patchStage(this.board.boardId!, stage.key, { instructions: next === '' ? null : next });
    if (!res.ok) { this.stagesError = `Could not save the rule for ${stage.name} (${res.status}).`; return; }
    stage.instructions = next === '' ? undefined : next;
    this.ruleSavedAt = { ...this.ruleSavedAt, [stage.key]: Date.now() };
    this.now = Date.now();
    this.changed();
  }

  async saveStages(): Promise<void> {
    if (this.savingStages) return;
    this.savingStages = true;
    this.stagesError = null;
    try {
      const res = await setStages(this.board.boardId!, this.draft);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        this.stagesError = body?.error?.message ?? `Saving the pipeline failed (${res.status})`;
        return;
      }
      this.changed();
      // SE-G17: re-seed from what was sent, so the editor reads "Saved" without waiting for the refresh.
      this.draft = this.draft.map((s) => ({ ...s }));
    } finally { this.savingStages = false; }
  }

  genSecret(): void {
    const b = new Uint8Array(24);
    crypto.getRandomValues(b);
    this.githubSecret = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  }

  async copy(what: 'url' | 'secret'): Promise<void> {
    await navigator.clipboard?.writeText(what === 'url' ? this.webhookUrl : this.githubSecret);
    this.copied = what;
    setTimeout(() => (this.copied = this.copied === what ? null : this.copied), 1600);
  }

  async saveGithub(): Promise<void> {
    if (this.ghBusy) return;
    this.ghBusy = true;
    this.ghError = null;
    try {
      const res = await setGithubConfig(this.board.boardId!, { issueTrigger: this.issueTrigger, ...(this.githubSecret.trim() !== '' ? { secret: this.githubSecret.trim() } : {}) });
      if (!res.ok) { this.ghError = `Could not save the GitHub settings (${res.status}).`; return; }
      this.githubSecret = '';
      this.changed();
    } finally { this.ghBusy = false; }
  }

  async addProfile(): Promise<void> {
    if (this.profileBusy) return;
    if (this.pKey.trim() === '') { this.profileError = 'Give the profile a key.'; return; }
    this.profileBusy = true;
    this.profileError = null;
    try {
      const res = await createProfile(this.board.boardId!, { key: this.pKey.trim(), model: this.pModel.trim() || undefined });
      if (!res.ok) { this.profileError = `Could not add the profile (${res.status}).`; return; }
      this.pKey = '';
      this.pModel = '';
      this.profiles = await getProfiles(this.board.boardId!);
    } finally { this.profileBusy = false; }
  }
}
