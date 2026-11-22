// apps/web/src/lib/components/dialogs/appearance-copy.ts
import { greeting, type Phase, type Vibe } from '@superjackfruitlabs/vibekit-ui';

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
  const g = greeting(phase, 'daylight');
  // A Record, so a new vibe fails the typecheck here until it has its readout. Quiet and Console say the phase alone.
  const READOUT: Readonly<Record<Vibe, () => string>> = {
    daylight: () => `${p} · ${firstName ? g.replace(/([.?!])$/, `, ${firstName}$1`) : g}`,
    paper: () => (phase === 'noon' ? `${p} · ${PAPER_NOON}` : p),
    studio: () => `${p}, ${clock}`,
    quiet: () => p,
    console: () => p,
  };
  return READOUT[vibe]();
}
