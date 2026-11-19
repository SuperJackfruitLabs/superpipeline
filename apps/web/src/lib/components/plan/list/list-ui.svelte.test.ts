// apps/web/src/lib/components/plan/list/list-ui.svelte.test.ts
import { describe, expect, it } from 'vitest';
import { LIST_PAGE, ListUi } from './list-ui.svelte';

describe('ListUi.pageFor', () => {
  it('keeps the page for the same view and starts again for a new one', () => {
    const ui = new ListUi();
    ui.pageFor('stage|priority');
    ui.limit = LIST_PAGE * 2;
    ui.pageFor('stage|priority');
    expect(ui.limit).toBe(LIST_PAGE * 2);
    ui.pageFor('state|priority');
    expect(ui.limit).toBe(LIST_PAGE);
  });
  it('the first view it sees keeps whatever page it was given (a re-mounted List)', () => {
    const ui = new ListUi();
    ui.limit = LIST_PAGE * 3;
    ui.pageFor('stage|priority');
    expect(ui.limit).toBe(LIST_PAGE * 3);
  });
});
