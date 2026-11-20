const VIBES = [
  { v: 'daylight', theme: 'dark',  cap: 'Daylight · dark',  note: 'greeting band, raised rows, pills' },
  { v: 'studio',   theme: 'light', cap: 'Studio · light',   note: 'figure, ink rules, ordinals, mono' },
  { v: 'paper',    theme: 'light', cap: 'Paper · light',    note: 'Newsreader, italics, rules, numerals' },
  { v: 'quiet',    theme: 'light', cap: 'Quiet · light',    note: 'plain large type, one column, links' },
];
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII'];
/* ---- component helpers: the same call draws the vibe's own form ---- */
const btn = (v, label, variant = 'primary', sm = true) => `<button class="vk-button vk-button--${variant}${sm ? ' vk-button--sm' : ''}">${label}</button>`;
const tabs = (v, items) => `<div class="vk-tabs vk-tabs--${v}" role="tablist">${v === 'quiet' ? '<span class="vk-tabs__label">View:</span>' : ''}${items.map(([l, c, on]) => `<button class="vk-tabs__item" role="tab" aria-selected="${on ? 'true' : 'false'}">${l}${c !== undefined ? ` <span class="vk-tabs__count">${c}</span>` : ''}</button>`).join('')}</div>`;
const sh = (v, no, title, count) => {
  if (v === 'studio') return `<header class="vk-sectionheader vk-sectionheader--studio"><span class="vk-sectionheader__no">${String(no).padStart(2, '0')}</span><h2 class="vk-sectionheader__title">${title}</h2>${count ? `<span class="vk-sectionheader__count">${count}</span>` : ''}</header>`;
  if (v === 'paper') return `<header class="vk-sectionheader vk-sectionheader--paper"><div class="vk-sectionheader__row"><h2 class="vk-sectionheader__title">${title}</h2>${count ? `<span class="vk-sectionheader__count">${count}</span>` : ''}</div></header>`;
  return `<header class="vk-sectionheader vk-sectionheader--${v}"><h2 class="vk-sectionheader__title">${title}</h2>${count ? `<span class="vk-sectionheader__count">${count}</span>` : ''}</header>`;
};
const state = (v, s, word) => `<span class="vk-statelabel vk-statelabel--${v}" data-state="${s}">${v === 'studio' ? '<span class="vk-statelabel__sq"></span>' : ''}${word}</span>`;
const face = (v, ini, mood) => `<span class="face" data-mood="${mood}" aria-hidden="true">${ini}</span>`;
const scope = (v, items) => {
  if (v === 'studio') return `<div class="sm" role="group" aria-label="Show">${items.map(([l, c, on, needs]) => `<button aria-pressed="${on ? 'true' : 'false'}"><span class="n"${needs ? ' data-tone="needs"' : ''}>${c}</span><span class="l">${l}</span></button>`).join('')}</div>`;
  return `<div class="vk-quickfilter vk-quickfilter--${v}" role="group" aria-label="Show">${items.map(([l, c, on]) => `<button class="vk-quickfilter__item"${on ? ' data-state="checked"' : ''}${c === 0 ? ' data-zero="true"' : ''}><span class="vk-quickfilter__face">${l} <span class="vk-quickfilter__count">${c}</span></span></button>`).join('')}</div>`;
};
const track = (v, stages, cur) => `<ol class="track" aria-label="Stages" style="--n:${stages.length}">${stages.map((s, i) => `<li data-has="${s.n ? 1 : 0}" data-needs="${s.needs ? 1 : 0}" data-cur="${i === cur ? 1 : 0}" style="--_band: var(--vk-stage-${i + 1})"><span class="bar" aria-hidden="true"></span><span class="nm" data-no="${String(i + 1).padStart(2, '0')}" data-ro="${ROMAN[i]}">${s.name}</span><span class="ct">${s.ct}</span></li>`).join('')}</ol>`;
const disc = (v, title, meta, body, open) => `<details class="vk-disclosure vk-disclosure--${v} vk-disclosure--section"${open ? ' open' : ''}><summary class="vk-disclosure__summary">${title}${meta ? ` <span class="vk-disclosure__meta">${meta}</span>` : ''}<span class="vk-disclosure__mark" aria-hidden="true">${v === 'studio' ? (open ? '–' : '+') : (v === 'quiet' ? (open ? 'Hide' : 'Show') : '⌄')}</span></summary><div class="vk-disclosure__body">${body}</div></details>`;
const mast = (v, left, right) => `<div class="mast">${left}<span class="live">Live</span><span class="spacer"></span><span class="search">Search <kbd>⌘K</kbd></span>${right}</div>`;

/* ---- the five pages, each one composition ---- */
