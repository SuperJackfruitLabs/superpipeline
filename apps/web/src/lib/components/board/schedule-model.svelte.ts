// apps/web/src/lib/components/board/schedule-model.svelte.ts
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, type Schedule } from '$lib/api';
import { app } from '$lib/stores/app.svelte';

export class ScheduleModel {
  schedules = $state<Schedule[]>([]);
  busy = $state('');
  formError = $state<string | null>(null);
  title = $state('');
  rule = $state('');
  timezone = $state('');
  stageKey = $state('');
  priority = $state('');
  overlap = $state<'skip' | 'allow'>('skip');

  constructor(private boardId: string) {}

  async load(): Promise<void> {
    const req = getSchedules(this.boardId);
    app.markBusy(req);
    this.schedules = await req.catch(() => []);
  }

  async add(): Promise<void> {
    if (this.busy !== '') return;
    this.formError = null;
    const [t, r, tz] = [this.title.trim(), this.rule.trim(), this.timezone.trim()];
    if (t === '' || r === '' || tz === '') { this.formError = 'Give the card a title, a cadence and a time zone.'; return; }
    this.busy = 'add';
    try {
      const res = await createSchedule(this.boardId, {
        title: t, rule: r, timezone: tz, overlap: this.overlap,
        ...(this.stageKey.trim() !== '' ? { stageKey: this.stageKey.trim() } : {}),
        ...(this.priority.trim() !== '' ? { priority: Number(this.priority) } : {}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        this.formError = body?.error?.message ?? `Could not add the schedule (${res.status}).`;
        return;
      }
      this.title = ''; this.rule = ''; this.timezone = ''; this.stageKey = ''; this.priority = ''; this.overlap = 'skip';
      await this.load();
    } finally { this.busy = ''; }
  }

  async toggle(s: Schedule): Promise<void> {
    if (this.busy !== '') return;
    this.busy = s.id;
    try { await updateSchedule(this.boardId, s.id, { enabled: !s.enabled }); await this.load(); } finally { this.busy = ''; }
  }

  async remove(s: Schedule): Promise<void> {
    if (this.busy !== '') return;
    this.busy = s.id;
    try { await deleteSchedule(this.boardId, s.id); await this.load(); } finally { this.busy = ''; }
  }
}
