// apps/web/src/lib/components/card/reads-only-model.test.ts
/** The card's view reads the CardModel, never the app store (spec §7.5: one place owns the data). */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FILES = ['CardView.svelte', 'CardHead.svelte', 'CardState.svelte', 'CardFacts.svelte', 'CardBrief.svelte', 'CardProduced.svelte', 'CardHistory.svelte', 'CardRaw.svelte', 'ResumeForm.svelte', 'gate/GatePanel.svelte', 'question/QuestionPanel.svelte', 'phone/CardPhoneSheet.svelte'];
describe('the card view reads only the model', () => {
  for (const f of FILES) {
    it(`${f} neither imports the app store nor calls displayPrincipal`, () => {
      const src = readFileSync(new URL(f, import.meta.url), 'utf8');
      expect(src).not.toMatch(/stores\/app\.svelte/);
      expect(src).not.toMatch(/\bapp\./);
      expect(src).not.toMatch(/displayPrincipal/);
    });
  }
});
