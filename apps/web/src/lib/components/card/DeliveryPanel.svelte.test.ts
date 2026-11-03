// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import DeliveryPanel from './DeliveryPanel.svelte';
import type { AnyComponent } from './testing/any-component';

describe('DeliveryPanel manual reminder', () => {
  it('lets the person choose a time and schedules a reminder for the unchanged approval', async () => {
    const change = vi.fn<(update: { remindAt: string }) => void>();
    const model = {
      card: { state: 'input-required' },
      deliveryGate: {
        id: 'gate_1',
        decision: 'approve_manual',
        approvalSubject: { id: 'aps_1' },
        delivery: { mode: 'manual', liveUrl: null, remindAt: null, readBackStatus: 'not_checked' },
      },
      gateError: null,
      manualItems: [],
      delivery: { liveUrl: '', remindAt: '', saving: false, copied: null, change, copy: vi.fn<() => void>() },
    };

    render(DeliveryPanel as AnyComponent, { model });
    await fireEvent.input(screen.getByLabelText('Remind me if no live URL is recorded'), {
      target: { value: '2029-01-02T03:04' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Schedule reminder' }));

    expect(change).toHaveBeenCalledWith({ remindAt: new Date('2029-01-02T03:04').toISOString() });
  });

  it('shows a digest mismatch as an alert instead of failing silently', () => {
    render(DeliveryPanel as AnyComponent, {
      model: {
        card: { state: 'input-required' },
        deliveryGate: {
          id: 'gate_1',
          decision: 'approve_manual',
          approvalSubject: { id: 'aps_1' },
          delivery: { mode: 'manual', liveUrl: 'https://x.com/fixture/status/1', remindAt: null, readBackStatus: 'mismatch' },
        },
        gateError: null,
        manualItems: [],
        delivery: { liveUrl: '', remindAt: '', saving: false, copied: null, change: vi.fn<() => void>(), copy: vi.fn<() => void>() },
      },
    });

    expect(screen.getByRole('alert').textContent).toContain('does not match the approved frozen digest');
  });

  it('labels an automatic publisher report as not independently verified', () => {
    render(DeliveryPanel as AnyComponent, {
      model: {
        card: { state: 'working' },
        deliveryGate: {
          id: 'gate_1', decision: 'approve_automatic', approvalSubject: { id: 'aps_1' },
          delivery: { mode: 'automatic', liveUrl: 'https://x.com/fixture/status/2', remindAt: null, readBackStatus: 'service_reported' },
        },
        gateError: null, manualItems: [],
        delivery: { liveUrl: '', remindAt: '', saving: false, copied: null, change: vi.fn<() => void>(), copy: vi.fn<() => void>() },
      },
    });
    expect(screen.getByText(/reported by publisher service/).textContent).toContain('not independently verified');
    expect(screen.queryByText(/read-back matched/)).toBeNull();
  });
});
