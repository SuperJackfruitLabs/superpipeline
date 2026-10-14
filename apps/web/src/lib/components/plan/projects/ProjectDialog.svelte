<script lang="ts">
  /**
   * New project, and Edit project (SP-Dlg-NewProject): vibekit's sectioned Dialog, like the New card
   * dialog. Name, goal, target date, declared health and, for a new project, a first milestone.
   * Health is declared here; the project page also computes one from milestones and cards.
   */
  import { untrack } from 'svelte';
  import { Button, Dialog, Field, Segmented } from '@superjackfruit/vibekit';
  import { createMilestone, createProject, updateProject, type Project, type ProjectHealth } from '$lib/api';
  import { MOD_KEY } from '$lib/components/dialogs/dialog-copy';
  import './project-dialog.css';

  let { open = $bindable(false), project = null, onsaved, onclose }: {
    open?: boolean;
    project?: Project | null;
    onsaved: (id: string) => void;
    onclose: () => void;
  } = $props();

  const HEALTH_OPTIONS = [
    { value: 'on-track', label: 'On track' }, { value: 'at-risk', label: 'At risk' }, { value: 'off-track', label: 'Off track' },
  ];

  let name = $state('');
  let goal = $state('');
  let target = $state('');
  let health = $state<string>('on-track');
  let msName = $state('');
  let msDate = $state('');
  let saving = $state(false);
  let error = $state<string | null>(null);

  const editing = $derived(project !== null);
  const empty = $derived(name.trim() === '');

  // Each opening starts from the project (Edit) or blank (New).
  $effect(() => {
    if (!open) return;
    untrack(() => {
      name = project?.name ?? '';
      goal = project?.description ?? '';
      target = project?.targetDate?.slice(0, 10) ?? '';
      health = project?.health ?? 'on-track';
      msName = ''; msDate = ''; error = null; saving = false;
    });
  });

  async function refusal(res: Response, fallback: string): Promise<string | null> {
    if (res.ok) return null;
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return body?.error ?? `${fallback} (${res.status})`;
  }

  async function save(): Promise<void> {
    if (empty || saving) return;
    saving = true;
    error = null;
    try {
      if (project) {
        const res = await updateProject(project.id, { name: name.trim(), description: goal.trim() || null, targetDate: target || null, health: health as ProjectHealth });
        error = await refusal(res, 'Couldn’t save the project');
        if (!error) { open = false; onsaved(project.id); }
        return;
      }
      const res = await createProject({ name: name.trim(), description: goal.trim() || undefined, targetDate: target || undefined, health: health as ProjectHealth });
      error = await refusal(res, 'Couldn’t create the project');
      if (error) return;
      const id = ((await res.json()) as { project: Project }).project.id;
      if (msName.trim() !== '') {
        // The project exists by now; a refused milestone is said on the project page, not here.
        await createMilestone(id, { name: msName.trim(), targetDate: msDate || undefined });
      }
      open = false;
      onsaved(id);
    } finally {
      saving = false;
    }
  }

  function close(): void { open = false; onclose(); }
  function onkey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void save(); }
  }
</script>

<Dialog bind:open title={editing ? 'Edit project' : 'New project'} eyebrow="Plan · Projects" width="640px" frame="sectioned" close="Close without saving" class="pjd" onclose={close}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="pjd-content" onkeydown={onkey}>
    {#if !editing}<p class="pjd-lead">A project gathers cards from any board. You can add cards to it afterwards, from the card or from the project page.</p>{/if}
    <Field id="pjd-name" label="Name" bind:value={name} data-autofocus />
    <Field id="pjd-goal" label="Goal (optional)" control="textarea" rows={3} hint="One or two sentences: what is true when this project is done." bind:value={goal} />
    <Field id="pjd-date" label="Target date (optional)" type="date" bind:value={target} />
    <fieldset class="pjd-fieldset">
      <legend class="vk-field__label">Declared health</legend>
      <Segmented size="sm" label="Declared health" options={HEALTH_OPTIONS} bind:value={health} />
      <p class="vk-field__hint">You declare it. The project page also shows a computed health from milestones and cards.</p>
    </fieldset>
    {#if !editing}
      <fieldset class="pjd-fieldset">
        <legend class="vk-field__label">First milestone (optional)</legend>
        <div class="pjd-ms">
          <Field id="pjd-ms" label="Milestone" bind:value={msName} />
          <Field id="pjd-msd" label="Date" type="date" bind:value={msDate} />
        </div>
        <p class="vk-field__hint">Add more milestones on the project page.</p>
      </fieldset>
    {/if}
    {#if error}<p role="alert" class="pjd-error">{error}</p>{/if}
    <span class="vk-visually-hidden" role="status">{saving ? 'Saving…' : ''}</span>
  </div>
  {#snippet actions()}
    <span class="pjd-hint small muted"><span class="kbd">{MOD_KEY}</span> <span class="kbd">↵</span> to {editing ? 'save' : 'create'}</span>
    <Button variant="secondary" onclick={close}>Cancel</Button>
    <Button aria-disabled={empty || saving ? 'true' : undefined} onclick={() => void save()}>{editing ? 'Save' : 'Create project'}</Button>
  {/snippet}
</Dialog>
