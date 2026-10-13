// apps/web/src/lib/components/card/layouts/reads-only-model.test.ts
/** Studio's and Quiet's card surfaces read the CardModel, never the app store (spec §7.5: one place owns the data). */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../', import.meta.url);
const FILES = [
  'layouts/CardStudio.svelte', 'layouts/CardQuiet.svelte', 'states/CardStatesStudio.svelte', 'states/CardStatesQuiet.svelte',
  'gate/GateStudioBar.svelte', 'gate/GateStudioFrame.svelte', 'gate/GateQuiet.svelte', 'question/QuestionStudioBar.svelte',
  'question/QuestionStudioFrame.svelte', 'question/QuestionQuiet.svelte', 'state/CardStateStudio.svelte', 'state/CardStateQuiet.svelte',
  'layouts/CardPhoneDaylight.svelte', 'layouts/CardPhonePaper.svelte', 'layouts/CardPhoneQuiet.svelte', 'layouts/CardPhoneStudio.svelte',
  'phone/PhoneDetails.svelte', 'phone/PhoneRuns.svelte', 'phone/PhoneAttempts.svelte', 'phone/PhoneRefs.svelte', 'phone/PhoneLinks.svelte',
  'phone/PhoneSubtasks.svelte', 'phone/PhoneComments.svelte', 'phone/PhonePlan.svelte', 'phone/PhoneEditForm.svelte', 'phone/StudioPhonePanes.svelte',
];
describe('Studio and Quiet read only the model', () => {
  for (const f of FILES) {
    it(`${f} neither imports the app store nor calls displayPrincipal`, () => {
      const src = readFileSync(new URL(f, ROOT), 'utf8');
      expect(src).not.toMatch(/stores\/app\.svelte/);
      expect(src).not.toMatch(/\bapp\./);
      expect(src).not.toMatch(/displayPrincipal/);
    });
  }
});
