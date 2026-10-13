// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { nameOperateCount, scopedNeedWords } from './nav-scope';

describe('which cards a nav count counts', () => {
  it('says the scope in words', () => {
    expect(scopedNeedWords(3, true)).toBe('3 need you on this board');
    expect(scopedNeedWords(1, true)).toBe('1 needs you on this board');
    expect(scopedNeedWords(5, false)).toBe('5 need you across all boards');
  });
  it('names the Operate link in the rail and on the tab bar, and clears the name at zero', () => {
    document.body.innerHTML = '<nav class="vk-appnav"><a href="/b/x/operate">Operate</a></nav><nav class="vk-phonetabbar"><a href="/b/x/operate">Operate</a></nav><a href="/b/x/operate" id="other">x</a>';
    expect(nameOperateCount(document, '/b/x/operate', 3, true)).toHaveLength(2);
    const a = document.querySelector('.vk-appnav a')!;
    expect(a.getAttribute('aria-label')).toBe('Operate, 3 need you on this board');
    expect(a.getAttribute('title')).toBe('Operate · 3 need you on this board');
    expect(document.getElementById('other')!.hasAttribute('aria-label')).toBe(false);
    nameOperateCount(document, '/b/x/operate', 5, false);
    expect(a.getAttribute('aria-label')).toBe('Operate, 5 need you across all boards');
    nameOperateCount(document, '/b/x/operate', 0, false);
    expect(a.hasAttribute('aria-label')).toBe(false);
  });
});
