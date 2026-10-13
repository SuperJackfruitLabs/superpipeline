// apps/web/src/lib/components/dialogs/appearance-copy.ts
import { greeting, type Phase, type Vibe } from '@superjackfruit/vibekit';

/** The phase in words, as the Appearance readout starts ("Midday · …"). */
export const PHASE_WORDS: Record<Phase, string> = { dawn: 'Dawn', morning: 'Morning', noon: 'Midday', golden: 'Golden hour', dusk: 'Dusk', night: 'Night' };

/** Paper's readout at midday, the line SP-Dlg-Appearance-Paper draws. No other phase has a reference line. */
const PAPER_NOON = 'The light is high and even.';

export interface ReadoutInput { vibe: Vibe; phase: Phase; timeOff: boolean; firstName: string; clock: string }

/**
 * The Appearance readout's line (SP-Dlg-Appearance): the phase, then only words a reference draws or vibekit
 * supplies (Daylight's greeting, Paper's midday line); otherwise the phase alone. Studio adds the clock.
 */
export function appearanceReadout({ vibe, phase, timeOff, firstName, clock }: ReadoutInput): string {
  const p = PHASE_WORDS[phase];
  if (timeOff) return `Time of day is off · ${p}.`;
  if (vibe === 'paper') return phase === 'noon' ? `${p} · ${PAPER_NOON}` : p;
  if (vibe === 'studio') return `${p}, ${clock}`;
  if (vibe === 'quiet') return p;
  const g = greeting(phase, 'daylight');
  return `${p} · ${firstName ? g.replace(/([.?!])$/, `, ${firstName}$1`) : g}`;
}
