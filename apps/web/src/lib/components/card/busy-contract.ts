// apps/web/src/lib/components/card/busy-contract.ts
import { expect } from 'vitest';
import { screen } from '@testing-library/svelte';

/**
 * How a panel holds its controls while a request is in flight. `disabled` (the default) disables them.
 * `aria` keeps them focusable: `aria-disabled="true"`, clicks ignored, the label unchanged and a
 * `role=status` region saying `status` (so the pressed button keeps focus).
 */
export type BusyForm = { kind: 'disabled' } | { kind: 'aria'; status: string };
export function expectBusy(controls: HTMLElement[], busy: BusyForm, labels: string[]): void {
  for (const [i, c] of controls.entries()) {
    if (busy.kind === 'disabled') { expect((c as HTMLButtonElement).disabled).toBe(true); continue; }
    expect((c as HTMLButtonElement).disabled, 'a busy control stays enabled, so it keeps focus').toBe(false);
    expect(c.getAttribute('aria-disabled')).toBe('true');
    expect(c.textContent?.trim()).toBe(labels[i]);
    c.focus();
    expect(document.activeElement, 'a busy control can hold focus').toBe(c);
  }
  if (busy.kind === 'aria') expect(screen.getByRole('status').textContent).toBe(busy.status);
}
