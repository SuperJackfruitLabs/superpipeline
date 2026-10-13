// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/svelte';
import { ask, mountQuestion, questionPanelContract } from './question-panel.contract';
import QuestionPaper from './QuestionPaper.svelte';

questionPanelContract(QuestionPaper, { decision: 'radio', submit: 'Send reply', busy: { kind: 'aria', status: 'Sending…' }, answerLabel: /^Your answer/, words: { heading: 'Your reply', waiting: 'Sample agent', auth: 'needs you to sign in' } });

describe('QuestionPaper', () => {
  it('asks in a letter and answers as a reply', () => {
    mountQuestion(QuestionPaper, ask());
    expect(screen.getByText('Hello,')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Run the tests' })).toBeTruthy();
  });
  it('a free answer carries the caption the reference prints', () => {
    mountQuestion(QuestionPaper, ask({ options: [] }));
    expect(screen.getByText('With no answer: “Type an answer first.”')).toBeTruthy();
    expect(screen.getByLabelText('Your answer goes straight back to Sample agent')).toBeTruthy();
  });
});
