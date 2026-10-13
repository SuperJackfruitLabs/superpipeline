<script lang="ts">
  /** Projects — the view, not the catalogue. The vibe picks the layout; the model owns the data. */
  import { appearance } from '$lib/appearance.svelte';
  import { PROJECTS_LAYOUTS } from '$lib/layouts';
  import { ProjectsModel } from './projects-model.svelte';

  const model = new ProjectsModel();
  const vibe = $derived(appearance.value.vibe);
  const Layout = $derived(PROJECTS_LAYOUTS[vibe]);
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void model.refresh();
</script>

<Layout {model} {vibe} />
