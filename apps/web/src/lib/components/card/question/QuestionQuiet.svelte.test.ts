// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/svelte';
import { ask, mountQuestion, questionPanelContract } from './question-panel.contract';
import QuestionQuiet from './QuestionQuiet.svelte';

questionPanelContract(QuestionQuiet, { decision: 'radio', submit: 'Submit decision', noteLabel: 'Note for Sample agent (optional)', answerLabel: /^Your answer/, busy: { kind: 'aria', status: 'Sending…' },
  words: { heading: 'Your answer is needed', waiting: 'Sample agent asked:', auth: 'Your sign-in is needed' } });

describe('QuestionQuiet', () => {
  afterEach(() => cleanup());
  it('is one fieldset under one legend, with the caption the reference prints', () => {
    const { container } = mountQuestion(QuestionQuiet, ask({ options: [] }));
    expect(screen.getByRole('group', { name: 'Your answer is needed' }).tagName).toBe('FIELDSET');
    expect(container.querySelector('.elicitation')).toBeTruthy();
    expect(screen.getByText('If empty: “Type an answer first.”')).toBeTruthy();
  });
  it('an empty free answer says to type one, as an alert', async () => {
    mountQuestion(QuestionQuiet, ask({ options: [] }));
    await fireEvent.click(screen.getByRole('button', { name: 'Send answer' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Type an answer first.');
  });
});
