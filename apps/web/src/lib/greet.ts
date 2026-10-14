// apps/web/src/lib/greet.ts — the one place a greeting meets a name.
import { greeting, type Phase } from '@superjackfruit/vibekit';

/**
 * "Working late?" + "Rakesh" is "Working late, Rakesh?": the mark goes after the name, never between
 * the greeting and the comma ("Working late?, Rakesh." was the defect). No name leaves the greeting as is.
 */
export function greetNamed(phase: Phase, firstName: string): string {
  const g = greeting(phase, 'daylight');
  if (!firstName) return g;
  const m = /^(.*?)([.?!])$/.exec(g);
  return m ? `${m[1]}, ${firstName}${m[2]}` : `${g}, ${firstName}`;
}
