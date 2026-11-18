/**
 * Composition guards (design spec 2026-11-18, §5 rules and §9 guards). Pure checks over a rendered
 * root element; each returns what breaks the rule, so an empty result is a pass. Page tests and the
 * composition suite call these on realistic fixtures, in every vibe.
 *
 * `[data-signature]` marks the one region per page where a vibe may change text or structure.
 */

const SIGNATURE = '[data-signature]';
/** Text in these never reaches a reader. */
const SKIP_TEXT = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT']);

const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** Every text node under `root` whose parent passes `keep`, in document order. */
function textNodes(root: Element, keep: (parent: Element) => boolean): string[] {
  const out: string[] = [];
  const walker = root.ownerDocument.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const parent = n.parentElement;
    if (!parent || SKIP_TEXT.has(parent.tagName) || !keep(parent)) continue;
    out.push(n.textContent ?? '');
  }
  return out;
}

/** Rule 3: rows (`[data-row]`) holding more than one primary button. Nested rows count separately. */
export function primaryActionsPerRow(root: Element): { row: string; count: number }[] {
  return [...root.querySelectorAll('[data-row]')]
    .map((row, i) => ({
      row: row.getAttribute('data-row') || `row ${i + 1}`,
      count: [...row.querySelectorAll('.vk-button--primary')].filter((b) => b.closest('[data-row]') === row).length,
    }))
    .filter((r) => r.count > 1);
}

/** Rule 4: text said more than once (whitespace collapsed, at least `min` characters), outside the signature. */
export function repeatedParagraphs(root: Element, min = 40): string[] {
  const seen = new Map<string, number>();
  for (const raw of textNodes(root, (p) => !p.closest(SIGNATURE))) {
    const t = norm(raw);
    if (t.length >= min) seen.set(t, (seen.get(t) ?? 0) + 1);
  }
  return [...seen].filter(([, n]) => n > 1).map(([t]) => t);
}

const MACHINE = /^\{|^(lbl|card|usr|brd)_/;

/** Rule 5: JSON or a raw id shown outside a disclosure (`<details>`). */
export function rawMachineText(root: Element): string[] {
  return textNodes(root, (p) => !p.closest('details'))
    .map((t) => t.trim())
    .filter((t) => MACHINE.test(t));
}

/**
 * Rule 6: stage names the track clips. A browser measures it: scrollWidth beyond clientWidth.
 * jsdom has no layout (both widths are 0), so an element styled to clip, `text-overflow: ellipsis`
 * on one line (`white-space: nowrap`), also counts here. The real measured check runs in e2e.
 */
export function truncatedNames(root: Element, selector = '.vk-stages__name'): string[] {
  const view = root.ownerDocument.defaultView;
  return [...root.querySelectorAll(selector)]
    .filter((el) => {
      if (el.scrollWidth > el.clientWidth) return true;
      const cs = view?.getComputedStyle(el);
      return cs?.getPropertyValue('text-overflow') === 'ellipsis' && cs.getPropertyValue('white-space') === 'nowrap';
    })
    .map((el) => norm(el.textContent ?? ''));
}

// ── Vibe parity: the accessibility tree as text ──────────────────────────────────────────────────

/** The roles whose names and states make up the parity contract, as vibekit's harness lists them. Static text is left out. */
const ROLES = new Set([
  'alert', 'alertdialog', 'banner', 'button', 'cell', 'checkbox', 'columnheader', 'combobox', 'complementary', 'contentinfo',
  'definition', 'dialog', 'figure', 'form', 'group', 'heading', 'img', 'link', 'list', 'listbox', 'listitem', 'main', 'menu',
  'menuitem', 'menuitemcheckbox', 'menuitemradio', 'meter', 'navigation', 'note', 'option', 'progressbar', 'radio', 'radiogroup',
  'region', 'row', 'rowheader', 'search', 'searchbox', 'slider', 'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel',
  'term', 'textbox', 'tooltip',
]);
/** Roles named by their content (ARIA "name from content"). */
const FROM_CONTENT = new Set([
  'button', 'cell', 'checkbox', 'columnheader', 'heading', 'link', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option',
  'radio', 'row', 'rowheader', 'switch', 'tab', 'tooltip',
]);
/** Roles ARIA does not name from content, whose words are still the contract. */
const TEXT_ROLES = new Set(['listitem', 'term', 'definition', 'status', 'alert', 'note']);
const STATES = [
  'aria-busy', 'aria-checked', 'aria-current', 'aria-disabled', 'aria-expanded', 'aria-haspopup', 'aria-invalid',
  'aria-keyshortcuts', 'aria-level', 'aria-live', 'aria-modal', 'aria-pressed', 'aria-selected', 'aria-sort',
  'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
];
const LANDMARK_SCOPE = 'article, aside, main, nav, section';

/** The element's role: its own `role`, else the implicit role of its tag (the common HTML-AAM mappings). */
function roleOf(el: Element): string | null {
  const explicit = el.getAttribute('role')?.trim().split(/\s+/)[0];
  if (explicit) return explicit === 'none' || explicit === 'presentation' ? null : explicit;
  const tag = el.tagName.toLowerCase();
  const named = el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby');
  switch (tag) {
    case 'a': case 'area': return el.hasAttribute('href') ? 'link' : null;
    case 'button': case 'summary': return 'button';
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': return 'heading';
    case 'nav': return 'navigation';
    case 'main': return 'main';
    case 'aside': return 'complementary';
    case 'header': return el.parentElement?.closest(LANDMARK_SCOPE) ? null : 'banner';
    case 'footer': return el.parentElement?.closest(LANDMARK_SCOPE) ? null : 'contentinfo';
    case 'section': return named ? 'region' : null;
    case 'form': return 'form';
    case 'search': return 'search';
    case 'ul': case 'ol': case 'menu': return 'list';
    case 'li': return 'listitem';
    case 'dt': return 'term';
    case 'dd': return 'definition';
    case 'table': return 'table';
    case 'tr': return 'row';
    case 'td': return 'cell';
    case 'th': return el.getAttribute('scope') === 'row' ? 'rowheader' : 'columnheader';
    case 'img': return el.getAttribute('alt') === '' ? null : 'img';
    case 'textarea': return 'textbox';
    case 'select': return el.hasAttribute('multiple') || Number(el.getAttribute('size')) > 1 ? 'listbox' : 'combobox';
    case 'option': return 'option';
    case 'dialog': return 'dialog';
    case 'progress': return 'progressbar';
    case 'meter': return 'meter';
    case 'fieldset': case 'details': return 'group';
    case 'figure': return 'figure';
    case 'output': return 'status';
    case 'input': {
      const type = (el.getAttribute('type') ?? 'text').toLowerCase();
      if (type === 'hidden') return null;
      if (type === 'checkbox') return el.getAttribute('switch') === null ? 'checkbox' : 'switch';
      if (type === 'radio') return 'radio';
      if (['button', 'submit', 'reset', 'image'].includes(type)) return 'button';
      if (type === 'range') return 'slider';
      if (type === 'search') return 'searchbox';
      return 'textbox';
    }
    default: return null;
  }
}

/** Out of the tree: `aria-hidden="true"`, `hidden`, `display: none` or `visibility: hidden`. Visually hidden text stays in. */
function hiddenSelf(el: Element): boolean {
  if (el.getAttribute('aria-hidden') === 'true' || el.hasAttribute('hidden')) return true;
  const cs = el.ownerDocument.defaultView?.getComputedStyle(el);
  return cs?.display === 'none' || cs?.visibility === 'hidden';
}

const isElement = (n: Node): n is Element => n.nodeType === 1;

/** The words a reader hears for `node`'s content: text, alt text and child labels, hidden subtrees left out. */
function contentText(node: Node): string {
  let s = '';
  for (const c of node.childNodes) {
    if (c.nodeType === 3) s += c.textContent ?? '';
    else if (isElement(c)) {
      const el = c;
      if (hiddenSelf(el) || SKIP_TEXT.has(el.tagName)) continue;
      const label = el.getAttribute('aria-label');
      if (label) s += ` ${label} `;
      else if (el.tagName === 'IMG') s += el.getAttribute('alt') ?? '';
      else s += contentText(el);
    }
  }
  return s;
}

function byId(root: Element, id: string): Element | null {
  return root.ownerDocument.getElementById(id) ?? root.querySelector(`#${CSS.escape(id)}`);
}

/** A simplified accessible-name computation (accname 1.2 steps that this app's markup uses). */
function nameOf(el: Element, role: string, root: Element): string {
  const ids = el.getAttribute('aria-labelledby');
  if (ids) {
    const n = ids.split(/\s+/).map((id) => byId(root, id)).filter((x): x is Element => !!x).map((x) => x.getAttribute('aria-label') ?? contentText(x)).join(' ');
    if (norm(n)) return n;
  }
  const label = el.getAttribute('aria-label');
  if (label && norm(label)) return label;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    const type = el.getAttribute('type');
    if (tag === 'INPUT' && ['button', 'submit', 'reset'].includes(type ?? '')) return el.getAttribute('value') ?? '';
    const id = el.getAttribute('id');
    const forLabel = id ? root.ownerDocument.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
    const wrap = forLabel ?? el.closest('label');
    if (wrap) return contentText(wrap);
    return el.getAttribute('placeholder') ?? el.getAttribute('title') ?? '';
  }
  if (tag === 'IMG') return el.getAttribute('alt') ?? el.getAttribute('title') ?? '';
  if (tag === 'FIELDSET') {
    const legend = el.querySelector(':scope > legend');
    if (legend) return contentText(legend);
  }
  if (FROM_CONTENT.has(role) || TEXT_ROLES.has(role)) {
    const t = contentText(el);
    if (norm(t)) return t;
  }
  return el.getAttribute('title') ?? '';
}

function statesOf(el: Element, role: string): string[] {
  const out = STATES.filter((a) => el.hasAttribute(a)).map((a) => `${a}=${el.getAttribute(a)}`);
  if (el.hasAttribute('disabled')) out.push('disabled');
  if (role === 'heading' && !el.hasAttribute('aria-level') && /^H[1-6]$/.test(el.tagName)) out.push(`level=${el.tagName.slice(1)}`);
  if (el.tagName === 'SUMMARY') out.push(`expanded=${el.parentElement?.hasAttribute('open') ?? false}`);
  if (el.tagName === 'INPUT' && (role === 'checkbox' || role === 'radio' || role === 'switch')) out.push(`checked=${el.matches(':checked')}`);
  return out;
}

/**
 * Vibe parity (§9): the accessibility tree as text, one line per accessible element in document
 * order: `role "name" state=value …`. Visually hidden text counts (it is read aloud); aria-hidden
 * and hidden subtrees do not. Each `[data-signature]` subtree is the single line `§`, since that is
 * where a vibe may differ. Class names never appear, so the same view in two vibes gives one string.
 */
export function parityTree(root: Element): string {
  const out: string[] = [];
  const visit = (el: Element): void => {
    if (hiddenSelf(el) || SKIP_TEXT.has(el.tagName)) return;
    if (el.matches(SIGNATURE)) { out.push('§'); return; }
    const role = roleOf(el);
    if (role && ROLES.has(role)) out.push([role, JSON.stringify(norm(nameOf(el, role, root))), ...statesOf(el, role)].join(' '));
    for (const c of el.children) visit(c);
  };
  for (const c of root.children) visit(c);
  return out.join('\n');
}
