// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { Badge } from '@superjackfruitlabs/vibekit-ui';
import { parityTree, primaryActionsPerRow, rawMachineText, repeatedParagraphs, truncatedNames } from './guards';
import { renderInVibes } from './render-vibes';

const html = (s: string): Element => {
  const root = document.createElement('div');
  root.innerHTML = s;
  document.body.append(root);
  return root;
};
afterEach(() => { document.body.innerHTML = ''; });

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
});

describe('renderInVibes', () => {
  it('renders one root per vibe, each marked with its vibe and reduced motion', async () => {
    const roots = await renderInVibes(Badge, { count: 3 });
    expect(Object.keys(roots)).toEqual(['daylight', 'paper', 'studio', 'quiet']);
    for (const [vibe, root] of Object.entries(roots)) {
      expect(root.getAttribute('data-vibe')).toBe(vibe);
      expect(root.getAttribute('data-motion')).toBe('reduce');
      expect(root.childElementCount).toBeGreaterThan(0);
    }
  });
});
