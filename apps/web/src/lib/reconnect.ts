/**
 * Reconnect: sign in again without losing your place.
 *
 * The Worker's /auth/callback always lands on "/", and changing that is an API change this
 * redesign does not make. So the page remembers where it was, in this tab only, and goes back
 * there once after sign-in. Only same-origin app paths are honoured: anything else in the slot
 * is ignored rather than followed.
 */
export const RETURN_KEY = 'superpipeline.returnTo';
// Every page a person can be on (nav v2): a board and its card/operate/settings pages, Inbox, Plan and a
// project, Crew's tabs, Settings, and the old /workspace paths (they redirect). Ids are word characters only.
const ID = '[A-Za-z0-9_-]+';
const SAFE = new RegExp(
  `^/(b/${ID}(/(c/${ID}(/page)?|operate(/(telemetry|log))?|settings))?|inbox|plan(/projects(/${ID})?)?|crew(/[a-z-]+)?|settings|workspace(/[a-z-]+)?)?/?(\\?[^#]*)?$`,
);

/**
 * Where you are, including a card open in the board's drawer. Opening a card from the board only sets
 * the app's open card and leaves the address at /b/<board>, so the place saved before sign-in was the
 * board and the card came back closed. A card open over a board is saved as that card's address.
 */
export function placeOf(path: string, openCardId: string | null | undefined): string {
  const m = /^\/b\/([A-Za-z0-9_-]+)\/?(\?[^#]*)?$/.exec(path);
  return m && openCardId && /^[A-Za-z0-9_-]+$/.test(openCardId) ? `/b/${m[1]}/c/${openCardId}${m[2] ?? ''}` : path;
}
let openCard: () => string | null | undefined = () => null;
/** The layout tells Reconnect which card is open (the store is not imported here). */
export function registerOpenCard(fn: () => string | null | undefined): void {
  openCard = fn;
}

export function reconnect(
  navigate: (url: string) => void = (url) => globalThis.location.assign(url),
  here: string = placeOf(globalThis.location ? location.pathname + location.search : '/', openCard()),
): void {
  try { sessionStorage.setItem(RETURN_KEY, here); } catch { /* no storage: you land on your board instead */ }
  navigate('/auth/login');
}

export function takeReturnTo(storage: Storage | undefined = globalThis.sessionStorage): string | null {
  if (!storage) return null;
  let v: string | null = null;
  try {
    v = storage.getItem(RETURN_KEY);
    storage.removeItem(RETURN_KEY);
  } catch {
    return null;
  }
  return v && !v.startsWith('//') && SAFE.test(v) ? v : null;
}

/**
 * The return-to place, taken out of storage once at boot and held until the app is ready. The front
 * door (routes/+page.svelte) redirects to the Inbox as soon as auth is ready; without this hold it
 * raced the layout's goto(back) and won, so Reconnect landed on the Inbox (or a board) with the card closed.
 */
let held: string | null = null;
export function holdReturnTo(storage?: Storage): string | null {
  held = takeReturnTo(storage);
  return held;
}
/** Whether a return-to place is waiting: the front door must not redirect over it. */
export function returnToHeld(): boolean {
  return held !== null;
}
export function releaseReturnTo(): string | null {
  const v = held;
  held = null;
  return v;
}
