// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { nameInboxCount, scopedNeedWords } from './nav-scope';

describe('which cards a nav count counts', () => {
  it('says the scope in words', () => {
    expect(scopedNeedWords(3, true)).toBe('3 need you on this board');
    expect(scopedNeedWords(1, true)).toBe('1 needs you on this board');
    expect(scopedNeedWords(5, false)).toBe('5 need you across all boards');
  });
  it('names the Inbox link in the rail and on the tab bar with the all-boards count, and clears the name at zero', () => {
    // The mark also links home (/inbox): it keeps its own name.
    document.body.innerHTML = '<nav class="vk-appnav"><a class="vk-appnav__mark" href="/inbox" aria-label="Superpipeline home">S</a><a class="vk-appnav__item" href="/inbox">Inbox</a></nav><nav class="vk-phonetabbar"><a href="/inbox">Inbox</a></nav><a href="/inbox" id="other">x</a>';
    expect(nameInboxCount(document, '/inbox', 5)).toHaveLength(2);
    const a = document.querySelector('.vk-appnav a.vk-appnav__item')!;
    expect(a.getAttribute('aria-label')).toBe('Inbox, 5 need you across all boards');
    expect(document.querySelector('.vk-appnav__mark')!.getAttribute('aria-label')).toBe('Superpipeline home');
    expect(a.getAttribute('title')).toBe('Inbox · 5 need you across all boards');
    expect(document.getElementById('other')!.hasAttribute('aria-label')).toBe(false);
    nameInboxCount(document, '/inbox', 0);
    expect(a.hasAttribute('aria-label')).toBe(false);
  });
});
