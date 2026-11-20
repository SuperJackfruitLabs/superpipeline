// apps/web/src/lib/motion/row-motion.ts
/**
 * Live motion (contract rule 9) for rows the page does not draw itself: the List's rows are
 * vibekit's DataTable, which takes no transitions from outside. Measured before the page updates
 * (`measure`, from `$effect.pre`) and played after it (`play`, from `$effect`): a row that moved
 * glides from its old place, a row that changed or arrived flashes once. vibekit's tokens time it,
 * and under reduced motion (`data-motion="reduce"`) nothing moves: `duration` is 0, `replay` does nothing.
 */
import { duration, replay } from '@superjackfruitlabs/vibekit-ui/motion';

/** A changed row flashes at most this often, as vibekit's flashOnChange. */
const FLASH_EVERY_MS = 2000;

export class RowMotion {
  #rects = new Map<string, DOMRect>();
  #seen: ReadonlyMap<string, string> | null = null;
  #view: string | null = null;
  #flashed = new Map<string, number>();

  /** `rows` gives each drawn row's element by its key. */
  constructor(private readonly rows: () => Map<string, HTMLElement>) {}

  /** Before the DOM changes: where each row is now. */
  measure(): void {
    this.#rects = new Map([...this.rows()].map(([k, el]) => [k, el.getBoundingClientRect()]));
  }

  /**
   * After it changes. `versions` holds every row in the list (not just the page), each with what it
   * says; `view` names the grouping, sort and filters. The first call, and the first after the view
   * changed, only record: a regroup or a new filter is the person's own doing, not a live change.
   */
  play(versions: ReadonlyMap<string, string>, view: string): void {
    const was = this.#seen;
    const sameView = this.#view === view;
    this.#seen = versions;
    this.#view = view;
    if (!was || !sameView) return;
    const now = Date.now();
    for (const [key, el] of this.rows()) {
      const v = versions.get(key);
      if (v === undefined) continue;
      if (was.get(key) !== v) {
        if (now - (this.#flashed.get(key) ?? 0) < FLASH_EVERY_MS) continue;
        this.#flashed.set(key, now);
        replay(el, 'vk-flash');
        continue;
      }
      const from = this.#rects.get(key);
      const d = duration('base', el);
      if (!from || !d || typeof el.animate !== 'function') continue;
      const to = el.getBoundingClientRect();
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (!dx && !dy) continue;
      const easing = getComputedStyle(el).getPropertyValue('--vk-ease-standard').trim() || 'ease';
      el.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], { duration: d, easing });
    }
  }
}

/** The drawn row of each `[data-card-open]` link under `root`: the table's row, or the phone's card when that is on screen. */
export function rowsByCard(root: ParentNode | null | undefined): Map<string, HTMLElement> {
  const out = new Map<string, HTMLElement>();
  for (const a of root?.querySelectorAll<HTMLElement>('[data-card-open]') ?? []) {
    const row = a.closest<HTMLElement>('tr[data-row], .vk-datatable__card');
    const key = a.dataset.cardOpen;
    if (!row || !key) continue;
    const held = out.get(key);
    if (!held || (held.getClientRects().length === 0 && row.getClientRects().length > 0)) out.set(key, row);
  }
  return out;
}
