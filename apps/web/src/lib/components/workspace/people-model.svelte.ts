// apps/web/src/lib/components/workspace/people-model.svelte.ts
import { getMembers, addMember, setMemberRole, removeMember, type Member, type Role } from '$lib/api';
import { app } from '$lib/stores/app.svelte';
import { workspaceCounts } from './workspace-counts.svelte';

export class PeopleModel {
  members = $state<Member[] | null>(null);
  name = $state('');
  email = $state('');
  role = $state<Role>('member');
  error = $state<string | null>(null);
  busy = $state(false);

  isMe = (m: Member) => m.userId === app.user?.userId;

  async refresh(): Promise<void> {
    const req = getMembers();
    app.markBusy(req);
    try { this.members = await req; } catch (e) { this.error = e instanceof Error ? e.message : String(e); this.members ??= []; }
  }

  private async fail(res: Response, fallback: string): Promise<void> {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    this.error = body?.error ?? `${fallback} (${res.status})`;
  }

  /** A blank New person form, for each opening of the dialog. */
  resetNew(): void { this.name = ''; this.email = ''; this.role = 'member'; this.error = null; }

  /** Adds the person; true when they are in, so the dialog may close. */
  async invite(): Promise<boolean> {
    const addr = this.email.trim();
    if (this.busy) return false;
    if (addr === '') { this.error = 'An email address is required.'; return false; }
    this.busy = true;
    this.error = null;
    try {
      const res = await addMember(addr, this.role, this.name.trim() || undefined);
      if (!res.ok) { await this.fail(res, 'Adding them failed'); return false; }
      this.name = '';
      this.email = '';
      await this.refresh();
      await workspaceCounts.refresh();
      return true;
    } finally { this.busy = false; }
  }

  async change(m: Member, next: Role): Promise<void> {
    this.error = null;
    const res = await setMemberRole(m.userId, next);
    if (!res.ok) await this.fail(res, 'Changing that role failed');
    await this.refresh();
  }

  async remove(m: Member): Promise<void> {
    if (!confirm(`Remove ${m.name ?? m.email} from this workspace? They lose access on their next request.`)) return;
    this.error = null;
    const res = await removeMember(m.userId);
    if (!res.ok) await this.fail(res, 'Removing them failed');
    await this.refresh();
    await workspaceCounts.refresh();
  }
}
