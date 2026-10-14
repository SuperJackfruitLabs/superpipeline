<script lang="ts">
  /**
   * The Superpipeline mark: the translucent-v2 "Channel" (static/brand/README.md).
   *
   * This is the pack's compact one-colour form (mark-current.svg), inlined so it takes its
   * colour from CSS: the brand amber on a light ground, white on a dark one (app.css `.brandmark`),
   * which is what the pack's adaptive favicon does. Every place the app shows the mark is 48px or
   * under, where the pack asks for the compact form rather than the full translucent artwork.
   * The geometry is the pack's; do not redraw it.
   *
   * Decorative wherever it sits beside the name, so it is hidden from assistive technology
   * unless a `label` says it stands alone.
   */
  let { class: className = '', label }: { class?: string; label?: string } = $props();
</script>

<svg
  class="brandmark {className}"
  viewBox="0 0 256 256"
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
  focusable="false"
>
  <g transform="translate(7.68 7.68) scale(.94)">
    <path d="M24 105C24 91 32 81 45 75L171 18C187 11 200 17 200 31V65C200 75 197 81 188 85L161 101C154 105 151 110 150 118L147 134C146 142 143 146 136 150L38 199C28 204 24 199 24 189Z" fill="currentColor" />
    <path d="M64 198L156 145C164 141 167 138 168 129L170 113C171 106 173 102 180 98L215 77C223 72 229 77 229 86V166C229 184 222 195 207 201L87 240C70 245 56 239 53 225C50 213 54 204 64 198Z" fill="currentColor" />
  </g>
</svg>
