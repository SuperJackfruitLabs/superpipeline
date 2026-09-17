<script lang="ts">
  /**
   * The superpipeline mark: a pipe that leaves a starting stage, winds through the
   * pipeline, and meets a gate.
   *
   * It replaced a fletched arrow, which was the *bāṇ* in the product's old name and
   * meant nothing once the name changed. Every copy of the mark — this component, the
   * favicon in app.html, landing/public/favicon.svg and docs-site/src/assets/mark.svg —
   * is the same three paths; change them together.
   *
   * Decorative wherever it sits beside the wordmark, so it is hidden from assistive
   * technology unless a `label` says it stands alone.
   */
  let { class: className = '', label }: { class?: string; label?: string } = $props();
</script>

<svg
  class="brandmark {className}"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
>
  <circle cx="6" cy="6" r="2.5" /><path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h5.5" /><path d="M18 15v6" />
</svg>
