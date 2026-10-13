// apps/web/scripts/pixel/resync/components.ts — which reference region is which vibekit 0.0.1 component.
//
// One entry per component the controller ruling names. `select` is the reference's root selector for it;
// `props` reads what the artboard said (words, counts, current item, state) so the rendered component says
// the same. An entry with `replace: false` names the region for later tasks but is not re-rendered: its
// reference markup is a bespoke layout (a whole dialog body, a whole shell) that the component would
// discard, so only its vibekit rules change (the reference's own rules for it are dropped, vibekit.css
// draws it). `why` says what would have been lost.
import { html, type Html } from './render';

export type Entry = {
  /** The vibekit export that renders it. */
  component: string;
  select: string;
  /** null: this element is not one the component can draw without losing content; it is left alone. */
  props: (el: Element) => Record<string, unknown> | null;
  replace: boolean;
  why?: string;
};

const SVG_TAGS = new Set(['svg']);
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const extraClasses = (el: Element, own: RegExp) => [...el.classList].filter((c) => !own.test(c)).join(' ') || undefined;
const SKIP_ATTRS = new Set(['class', 'type', 'href', 'aria-pressed', 'disabled', 'data-dc-tpl']);

/** Attributes the component does not set itself, passed through unchanged (aria-label, style, …). */
function restAttrs(el: Element, skip: Set<string> = SKIP_ATTRS): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of el.getAttributeNames()) if (!skip.has(a)) out[a] = el.getAttribute(a)!;
  return out;
}

/** A leading <svg> (or vibekit's own icon span) is the icon; everything after it is the label. */
function splitIcon(el: Element, iconClass: string): { icon?: Html; label: string } {
  const first = el.firstElementChild;
  const lead = el.innerHTML.trimStart();
  if (first && first.classList.contains(iconClass)) {
    const outer = first.outerHTML;
    return { icon: html(first.innerHTML), label: el.innerHTML.replace(outer, '').trim() };
  }
  if (first && SVG_TAGS.has(first.tagName.toLowerCase()) && lead.startsWith(first.outerHTML)) {
    return { icon: html(first.outerHTML), label: lead.slice(first.outerHTML.length).trim() };
  }
  return { label: el.innerHTML.trim() };
}

const VARIANTS = ['primary', 'secondary', 'quiet', 'ghost', 'text', 'signal', 'danger'] as const;

function buttonProps(el: Element): Record<string, unknown> | null {
  const tag = el.tagName.toLowerCase();
  if (tag !== 'button' && tag !== 'a') return null; // <summary>/<span> styled as buttons: no Button form
  const variant = VARIANTS.find((v) => el.classList.contains(`vk-button--${v}`)) ?? 'primary';
  const { icon, label } = splitIcon(el, 'vk-button__icon');
  if (!label) return null;
  const p: Record<string, unknown> = { variant, children: html(label), ...restAttrs(el) };
  if (el.classList.contains('vk-button--sm')) p.size = 'sm';
  const cls = extraClasses(el, /^vk-(button|hit)\b/);
  if (cls) p.class = cls;
  if (icon) p.icon = icon;
  if (tag === 'a') p.href = el.getAttribute('href') ?? '';
  else {
    const type = el.getAttribute('type');
    if (type === 'submit' || type === 'reset') p.type = type;
    if (el.hasAttribute('disabled')) p.disabled = true;
  }
  const pressed = el.getAttribute('aria-pressed');
  if (pressed !== null) p.pressed = pressed === 'true';
  return p;
}

function iconButtonProps(el: Element): Record<string, unknown> | null {
  if (el.tagName.toLowerCase() !== 'button') return null;
  const label = el.getAttribute('aria-label');
  const svg = el.querySelector(':scope > svg, :scope > .vk-iconbutton__glyph > svg');
  if (!label || !svg || text(el) !== '' && !el.classList.contains('vk-iconbutton--quiet')) return null;
  const p: Record<string, unknown> = { label, icon: html(svg.outerHTML), ...restAttrs(el, new Set([...SKIP_ATTRS, 'aria-label', 'aria-expanded'])) };
  const cls = extraClasses(el, /^(icon-btn|vk-iconbutton)/);
  if (cls) p.class = cls;
  const exp = el.getAttribute('aria-expanded');
  if (exp !== null) p.expanded = exp === 'true';
  return p;
}

function segmentedProps(el: Element): Record<string, unknown> | null {
  const items = [...el.querySelectorAll(':scope > .vk-segmented__item')];
  if (!items.length || items.length !== el.children.length - el.querySelectorAll(':scope > input[type="hidden"]').length) return null;
  const on = (b: Element) => b.getAttribute('aria-checked') === 'true' || b.getAttribute('aria-pressed') === 'true' || b.getAttribute('data-state') === 'checked';
  const options = items.map((b) => ({ value: b.getAttribute('data-value') ?? text(b), label: text(b) }));
  const cur = items.find(on);
  return { label: el.getAttribute('aria-label') ?? '', options, value: cur ? (cur.getAttribute('data-value') ?? text(cur)) : undefined };
}

/** Only the plain shapes: a label, one control, an optional hint and error. Composite fields stay. */
function fieldProps(el: Element): Record<string, unknown> | null {
  if (el.tagName.toLowerCase() !== 'div') return null;
  const kids = [...el.children];
  const label = kids[0];
  if (!label || label.tagName.toLowerCase() !== 'label' || !label.classList.contains('vk-field__label') || label.children.length) return null;
  const control = kids.find((k) => /^(input|textarea|select)$/i.test(k.tagName) || k.classList.contains('vk-field__select'));
  const ctl = control?.classList.contains('vk-field__select') ? control.querySelector('select') : control;
  if (!ctl) return null;
  const hint = kids.find((k) => k.classList.contains('vk-field__hint'));
  const error = kids.find((k) => k.classList.contains('vk-field__error'));
  const counted = kids.find((k) => k.classList.contains('vk-field__count'));
  if (kids.some((k) => k !== label && k !== control && k !== hint && k !== error && k !== counted)) return null;
  const id = ctl.getAttribute('id') ?? label.getAttribute('for');
  if (!id) return null;
  const tag = ctl.tagName.toLowerCase();
  const p: Record<string, unknown> = { id, label: text(label) };
  if (hint) p.hint = text(hint);
  if (error) p.error = text(error);
  for (const a of ['placeholder', 'name', 'autocomplete', 'required', 'readonly', 'disabled', 'maxlength', 'style']) {
    if (ctl.hasAttribute(a)) p[a] = a === 'maxlength' ? Number(ctl.getAttribute(a)) : ['required', 'readonly', 'disabled'].includes(a) ? true : ctl.getAttribute(a);
  }
  if (counted) p.counter = true;
  const cls = extraClasses(ctl, /^vk-field__input/);
  if (cls) p.class = cls;
  if (tag === 'textarea') {
    p.control = 'textarea';
    p.value = (ctl as HTMLTextAreaElement).value;
    if (ctl.hasAttribute('rows')) p.rows = Number(ctl.getAttribute('rows'));
  } else if (tag === 'select') {
    p.control = 'select';
    const opts = [...ctl.querySelectorAll('option')];
    p.options = opts.map((o) => ({ value: o.getAttribute('value') ?? text(o), label: text(o), ...(o.hasAttribute('disabled') ? { disabled: true } : {}) }));
    const sel = opts.find((o) => o.hasAttribute('selected')) ?? opts[0];
    p.value = sel ? (sel.getAttribute('value') ?? text(sel)) : '';
  } else {
    const t = ctl.getAttribute('type') ?? 'text';
    if (!['text', 'email', 'password', 'search', 'number'].includes(t)) return null;
    if (t !== 'text') p.type = t;
    p.value = ctl.getAttribute('value') ?? '';
  }
  return p;
}

const STATES = ['needs', 'working', 'thinking', 'queued', 'blocked', 'stopped', 'failed', 'done', 'resting', 'off'];

function stateLabelProps(el: Element): Record<string, unknown> | null {
  const state = STATES.find((s) => el.classList.contains(`vk-pill--${s}`)) ?? el.getAttribute('data-state');
  if (!state || !STATES.includes(state)) return null;
  const word = el.querySelector('.vk-statelabel__word');
  return { state, label: text(word ?? el), form: 'pill' };
}

function stageTrackProps(el: Element): Record<string, unknown> | null {
  const steps = [...el.querySelectorAll(':scope > .vk-stages__step')];
  if (!steps.length) return null;
  const stages = steps.map((s) => text(s.querySelector('.vk-stages__name')));
  const st = steps.map((s) => s.getAttribute('data-state') ?? 'todo');
  const p: Record<string, unknown> = { stages, label: el.getAttribute('aria-label') ?? 'Stages' };
  if (st.every((s) => s === 'done')) return { ...p, current: stages.length - 1, state: 'finished' };
  const hereAt = st.findIndex((s) => s !== 'done');
  const here = st[hereAt];
  const state = here === 'stopped' || here === 'needs' || here === 'failed' ? here : 'current';
  if (el.classList.contains('vk-stages--phone')) p.size = 'phone';
  return { ...p, current: hereAt, state };
}

/**
 * A face is the same generator in the mockups and in vibekit; its seed (the agent id) is not written in
 * the markup. It is re-rendered only when the face is named (aria-label "name, mood") and the name as id
 * reproduces the drawing; resyncHtml checks that and otherwise leaves the face alone.
 */
function faceProps(el: Element): Record<string, unknown> | null {
  const svg = el.querySelector(':scope > svg');
  const named = svg?.getAttribute('aria-label') ?? el.querySelector('img')?.getAttribute('alt');
  if (!named) return null;
  const [label, ...rest] = named.split(', ');
  const mood = svg?.getAttribute('data-mood') ?? el.getAttribute('data-mood') ?? rest.join(', ');
  const size = Number(/--vk-face-size:\s*(\d+)px/.exec(el.getAttribute('style') ?? '')?.[1] ?? svg?.getAttribute('width') ?? 44);
  const img = el.querySelector('img');
  return { id: label, label, mood, size, ...(img ? { src: img.getAttribute('src') } : {}), ...(el.classList.contains('vk-face--ring') ? { ring: true } : {}) };
}

const frame = (component: string, select: string, why: string): Entry => ({ component, select, props: () => null, replace: false, why });

export const COMPONENT_MAP: Record<string, Entry> = {
  Button: { component: 'Button', select: 'button.vk-button, a.vk-button', props: buttonProps, replace: true },
  IconButton: { component: 'IconButton', select: 'button.icon-btn[aria-label], button.vk-iconbutton[aria-label]', props: iconButtonProps, replace: true },
  Segmented: { component: 'Segmented', select: '.vk-segmented', props: segmentedProps, replace: true },
  Field: { component: 'Field', select: '.vk-field', props: fieldProps, replace: true },
  StateLabel: { component: 'StateLabel', select: '.vk-pill, .vk-statelabel', props: stateLabelProps, replace: true },
  StageTrack: { component: 'StageTrack', select: 'ol.vk-stages', props: stageTrackProps, replace: true },
  Face: { component: 'Face', select: '.vk-face', props: faceProps, replace: true },
  Tabs: frame('Tabs', '.vk-tabs, [role="tablist"]', 'the boards draw their view switch as a pressed-button group, not a tablist'),
  Dialog: frame('Dialog', 'section.dlg', 'each dialog body is a bespoke layout (stage list, form, sign-in card) that Dialog would reduce to title + children'),
  Drawer: frame('Drawer', '.dw', 'no reference draws a drawer'),
  Sheet: frame('Sheet', '.sheet', 'no reference draws a sheet'),
  CommandPalette: frame('CommandPalette', '.pal', 'the palette rows carry state chips, ids and per-row hints that PaletteItem does not model'),
  CommandField: frame('CommandField', '.pal-in', 'the field is part of the palette frame above'),
  Menu: frame('Menu', '.vk-menu, [role="menu"]', 'the account menus are <details> popovers holding a sentence and one item'),
  AppShell: frame('AppShell', '.dy-app, .ar-app, .qn-app, .pp-app', 'the shell grid is the artboard layout itself'),
  AppNav: frame('AppNav', '.dy-rail, .mh, .ar-rail, .qn', 'each vibe’s rail/masthead carries board titles, live state, counts and actions that AppNav’s items/account do not model'),
  Masthead: frame('Masthead', '.dy-top, .mh-ed, .ar-top, .qn-head', 'the page heads mix filter, search and write actions with per-page facts'),
  StatusLine: frame('StatusLine', '.mh-showing, .dy-status, .ar-status', 'status rows are prose with inline counts'),
  PhoneHeader: frame('PhoneHeader', '.ph-top', 'the phone header holds the sky greeting and filters'),
  PhoneTabBar: frame('PhoneTabBar', '.ph-tabs', 'no reference draws it under this selector'),
  AppearancePicker: frame('AppearancePicker', '.ap-body', 'the Appearance dialog writes its own hints per choice'),
};
