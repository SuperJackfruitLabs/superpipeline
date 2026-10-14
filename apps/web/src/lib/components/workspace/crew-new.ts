// apps/web/src/lib/components/workspace/crew-new.ts — Crew's masthead primary action ("New agent", "New person",
// "New capability") opens the dialog the tab owns. The tab registers its opener; the Crew layout calls it.
import { appearance } from '$lib/appearance.svelte';
import { viewport } from '$lib/viewport.svelte';

export type CrewNewTab = 'agents' | 'people' | 'capabilities';
export const CREW_NEW_LABEL: Readonly<Record<CrewNewTab, string>> = { agents: 'New agent', people: 'New person', capabilities: 'New capability' };

const openers = new Map<CrewNewTab, () => void>();

/** A tab registers the function that opens its New dialog; the returned function unregisters it (use in $effect). */
export function onCrewNew(tab: CrewNewTab, open: () => void): () => void {
  openers.set(tab, open);
  return () => { if (openers.get(tab) === open) openers.delete(tab); };
}
export function requestCrewNew(tab: CrewNewTab): void { openers.get(tab)?.(); }

/** The tab draws its own New button only where the masthead has none: a phone, and Quiet (one link row, no actions). */
export function crewNewInPage(): boolean { return viewport.phone || appearance.value.vibe === 'quiet'; }
