// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { Badge, VIBES } from '@superjackfruitlabs/vibekit-ui';
import { parityTree, primaryActionsPerRow, rawMachineText, repeatedParagraphs, truncatedNames } from './guards';
import { renderInVibes } from './render-vibes';

const html = (s: string): Element => {
  const root = document.createElement('div');
  root.innerHTML = s;
  document.body.append(root);
  return root;
};
afterEach(() => { document.body.innerHTML = ''; });

const size = (el: Element, scroll: number, client: number) => {
  Object.defineProperty(el, 'scrollWidth', { value: scroll });
  Object.defineProperty(el, 'clientWidth', { value: client });
};
const lede = (out: string, sig: string) => `<main><h1>Board</h1><p>${out}</p><div data-signature><p>${sig}</p></div><p class="meta">Updated <time>2 min</time> ago</p></main>`;
const facts = (n: string) => `<h2><span data-signature>${n}</span> Facts</h2><section aria-labelledby="t"><b id="t"><span data-signature>${n}</span></b></section>`;
const view = (label: string) => `<section aria-labelledby="h"><h2 id="h">${label}</h2></section><label for="f">${label} filter</label><input id="f">`;
const GUIDANCE = 'Review the attempt and approve it, or send it back with a note.';

describe('primaryActionsPerRow', () => {
  it('reports a row with two primary buttons, and only that row', () => {
    const root = html(`
      <div data-row="c-1"><button class="vk-button vk-button--primary">Review</button><a href="#">Open</a></div>
      <div data-row="c-2"><button class="vk-button vk-button--primary">Review</button><button class="vk-button vk-button--primary">Resume</button></div>`);
    expect(primaryActionsPerRow(root)).toEqual([{ row: 'c-2', count: 2 }]);
  });
});

describe('repeatedParagraphs', () => {
  it('reports a paragraph said twice', () => {
    expect(repeatedParagraphs(html(`<p>${GUIDANCE}</p><p>  ${GUIDANCE.replace(/ /g, '\n  ')} </p><p>Short line.</p><p>Short line.</p>`))).toEqual([GUIDANCE]);
  });
  it('counts a paragraph with inline markup as one, at its innermost container', () => {
    const p = '<p>No agent <b>works</b> this stage — <a href="#">assign one</a> before moving cards.</p>';
    expect(repeatedParagraphs(html(`<section>${p}</section><ul><li>${p}</li></ul>`))).toEqual(['No agent works this stage — assign one before moving cards.']);
    expect(repeatedParagraphs(html(`<ul><li>${p}</li></ul>`))).toEqual([]);
  });
  it('ignores a repeat inside the signature', () => {
    expect(repeatedParagraphs(html(`<p>${GUIDANCE}</p><div data-signature><p>${GUIDANCE}</p></div>`))).toEqual([]);
  });
});

describe('rawMachineText', () => {
  it('reports an id or JSON outside a disclosure, not inside one', () => {
    const root = html(`
      <span> lbl_d937a9269d4d499f </span><pre>{"stage":"test"}</pre>
      <details><summary>Detail</summary><span>lbl_d937a9269d4d499f</span><pre>{"a":1}</pre><code>card_0001</code></details>
      <p>label lbl_x is fine mid-sentence</p>`);
    expect(rawMachineText(root)).toEqual(['lbl_d937a9269d4d499f', '{"stage":"test"}']);
  });
  it('is empty when the id is only inside details', () => {
    expect(rawMachineText(html('<details><summary>Ids</summary>lbl_d937a9269d4d499f</details>'))).toEqual([]);
  });
});

describe('truncatedNames', () => {
  it('reports a name set to clip with an ellipsis on one line', () => {
    const root = html(`
      <ol><li><span class="vk-stages__name" style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden">Reproduce</span></li>
      <li><span class="vk-stages__name">Integrate</span></li></ol>`);
    expect(truncatedNames(root)).toEqual(['Reproduce']);
  });
  it('with layout, measures only: a styled name that fits passes, one that overflows is reported', () => {
    const root = html(`
      <span class="vk-stages__name" style="text-overflow: ellipsis; white-space: nowrap">Test</span>
      <span class="vk-stages__name">Signed off by the reviewer</span>`);
    const [fits, clipped] = root.querySelectorAll('.vk-stages__name');
    size(fits, 40, 80);
    size(clipped, 180, 120);
    expect(truncatedNames(root)).toEqual(['Signed off by the reviewer']);
  });
});

const page = (sig: string, action: string) => `
  <main><h1>Inbox</h1>
    <div data-signature>${sig}</div>
    <nav aria-label="Boards"><a href="/b/1">Developer Experience</a></nav>
    <button class="vk-button vk-button--primary">${action}<span class="sr-only"> card 42</span></button>
    <span aria-hidden="true"><button>Hidden</button></span>
  </main>`;

describe('parityTree', () => {
  it('is equal when two trees differ only inside the signature', () => {
    const a = parityTree(html(page('<h2>Good morning</h2><p>3 need you</p>', 'Review')));
    const b = parityTree(html(page('<section aria-label="Today"><button>Sun</button></section>', 'Review')));
    expect(a).toBe(b);
    expect(a).toContain('§');
    expect(a).toContain('button "Review card 42"');
    expect(a).toContain('heading "Inbox" level=1');
    expect(a).not.toContain('Hidden');
    expect(a).not.toContain('Good morning');
  });
  it('differs when the trees differ outside the signature', () => {
    expect(parityTree(html(page('', 'Review')))).not.toBe(parityTree(html(page('', 'Resume'))));
  });
  it('reads text that has no role: a lede outside the signature counts, one inside does not', () => {
    const a = parityTree(html(lede('Three cards need you.', 'Good morning')));
    expect(a).toContain('text "Three cards need you."');
    expect(a).toContain('text "Updated 2 min ago"');
    expect(a).not.toBe(parityTree(html(lede('Two cards need you.', 'Good morning'))));
    expect(a).toBe(parityTree(html(lede('Three cards need you.', 'Good evening'))));
    expect(a).toBe(parityTree(html(lede('Three <span>cards</span> need you.', 'Good morning'))));
  });
  it('reads a signature inside a name as §', () => {
    const a = parityTree(html(facts('01')));
    expect(a).toContain('heading "§ Facts" level=2');
    expect(a).toContain('region "§"');
    expect(a).toBe(parityTree(html(facts('IV.'))));
  });
  it('resolves ids inside its own root when copies share a document', () => {
    const daylight = html(view('Needs you'));
    const paper = html(view('Waiting on you'));
    expect(parityTree(paper)).toContain('region "Waiting on you"');
    expect(parityTree(paper)).toContain('textbox "Waiting on you filter"');
    expect(parityTree(daylight)).not.toBe(parityTree(paper));
  });
});

describe('renderInVibes', () => {
  it('renders one root per vibe, each marked with its vibe and reduced motion', async () => {
    const roots = await renderInVibes(Badge, { count: 3 });
    expect(Object.keys(roots)).toEqual(['daylight', 'paper', 'studio', 'quiet']);
    for (const vibe of VIBES) {
      const root = roots[vibe];
      expect(root.getAttribute('data-vibe')).toBe(vibe);
      expect(root.getAttribute('data-motion')).toBe('reduce');
      expect(root.childElementCount).toBeGreaterThan(0);
      expect(root.isConnected).toBe(true);
    }
    expect(document.body.childElementCount).toBe(4);
    roots.unmount();
    expect(document.body.childElementCount).toBe(0);
    expect(VIBES.some((v) => roots[v].isConnected)).toBe(false);
  });
});
