// apps/web/e2e/pixel/vk-guard.mjs — the one rule for what a reference's own CSS may say about a vibekit
// component (Task 5b, fix round 1 ruling). vibekit draws its components; a page may only place them:
// a selector may name a `.vk-*` component class only behind a class of the page's own (an ancestor in
// the selector), and every declaration must be layout. Colour, radius, padding and type stay vibekit's.

/**
 * Component classes vibekit 0.0.1 draws, with their BEM parts: `.vk-segmented__item` is the component
 * too (a plain `\b` stops at `__`, which let element rules through before fix round 1).
 */
export const VK = /\.vk-(button|segmented|field|choice|tabs|pill|statelabel|stages|dialog|drawer|sheet|commandpalette|commandfield|menu|appshell|appnav|masthead|statusline|phoneheader|phonetabbar|face|iconbutton|icon|appearancepicker)(?=__|--|[^\w-]|$)/;

/** Layout properties a page may set on a vibekit component (placement only). */
export const LAYOUT = /^(display|flex(-[a-z]+)*|grid(-[a-z]+)*|gap|row-gap|column-gap|width|min-width|max-width|height|margin(-[a-z]+)*|overflow(-x|-y)?|text-overflow|white-space|align(-[a-z]+)*|justify(-[a-z]+)*|order|top|right|bottom|left|inset(-[a-z]+)*)$/;

/** True when a page class (not vk-*) sits in the selector before the first vibekit class, as its ancestor. */
export function scopedByPage(sel) {
  const at = sel.search(VK);
  if (at < 0) return true;
  const before = sel.slice(0, at);
  // The page class must end a compound that a combinator separates from the vibekit class.
  return /\.(?!vk-)[A-Za-z_][\w-]*[^\s>+~]*\s*[\s>+~]\s*[^\s>+~]*$/.test(before) && /[\s>+~]\s*[^\s>+~]*$/.test(before + 'x');
}

export const declNames = (body) => body.split(';').map((d) => d.split(':')[0].trim().toLowerCase()).filter(Boolean);

/** A selector without its negations: `:not(.vk-button)` excludes vibekit's buttons, it never targets them. */
export const withoutNegations = (sel) => sel.replace(/:not\([^()]*\)/g, '');

/** Rules (selector + body) in a stylesheet that break the guard. */
export function violations(css) {
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  for (const m of flat.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = withoutNegations(m[1].trim());
    if (!VK.test(sel) || sel.startsWith('@')) continue;
    const items = sel.split(/,(?![^(]*\))/).map((s) => s.trim()).filter((s) => VK.test(s));
    const ok = items.every(scopedByPage) && declNames(m[2]).every((d) => LAYOUT.test(d));
    if (!ok) out.push(`${sel}{${m[2].trim()}}`);
  }
  return out;
}
