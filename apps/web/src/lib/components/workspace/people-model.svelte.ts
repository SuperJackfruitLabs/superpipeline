// apps/web/src/lib/components/workspace/people-model.svelte.ts
import { getMembers, addMember, setMemberRole, removeMember, type Member, type Role } from '$lib/api';
import { app } from '$lib/stores/app.svelte';
import { workspaceCounts } from './workspace-counts.svelte';

export class PeopleModel {
  members = $state<Member[] | null>(null);
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

  async invite(): Promise<void> {
    const addr = this.email.trim();
    if (addr === '' || this.busy) return;
    this.busy = true;
    this.error = null;
    try {
      const res = await addMember(addr, this.role);
      if (!res.ok) { await this.fail(res, 'Inviting failed'); return; }
      this.email = '';
      await this.refresh();
      await workspaceCounts.refresh();
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
