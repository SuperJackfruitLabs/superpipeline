// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/svelte';
import { ask, mountQuestion, questionPanelContract } from './question-panel.contract';
import QuestionQuiet from './QuestionQuiet.svelte';

questionPanelContract(QuestionQuiet, { decision: 'radio', submit: 'Submit decision', noteLabel: 'Note for Sample agent (optional)' });

describe('QuestionQuiet', () => {
  afterEach(() => cleanup());
  it('is a plain form under one legend', () => {
    const { container } = mountQuestion(QuestionQuiet, ask());
    expect(screen.getByRole('group', { name: 'Your decision is needed' }).tagName).toBe('FIELDSET');
    expect(container.querySelector('.elicitation')).toBeTruthy();
  });

  it('keeps the error beside the submit button', async () => {
    mountQuestion(QuestionQuiet, ask());
    await fireEvent.click(screen.getByRole('button', { name: 'Submit decision' }));
    const alert = await screen.findByRole('alert');
    expect(alert.parentElement).toBe(screen.getByRole('button', { name: 'Submit decision' }).parentElement);
  });
});
