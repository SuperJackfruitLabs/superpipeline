// apps/web/src/lib/components/workspace/menu-state.svelte.ts
/** One action menu open at a time; Escape closes it and puts focus back on its summary; a click outside closes it. */
export class MenuState {
  open = $state<string | null>(null);
  toggle(id: string, isOpen: boolean): void {
    if (isOpen) this.open = id;
    else if (this.open === id) this.open = null;
  }
  close(): void { this.open = null; }
  onKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Escape' || this.open === null) return;
    const details = e.currentTarget as HTMLDetailsElement;
    this.open = null;
    details.open = false;
    details.querySelector('summary')?.focus();
  }
  onDocumentClick(e: MouseEvent): void {
    if (!(e.target as Element | null)?.closest?.('details.menu')) this.open = null;
  }
}
