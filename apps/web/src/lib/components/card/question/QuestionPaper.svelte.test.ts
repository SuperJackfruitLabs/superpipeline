// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/svelte';
import { ask, mountQuestion, questionPanelContract } from './question-panel.contract';
import QuestionPaper from './QuestionPaper.svelte';

questionPanelContract(QuestionPaper, { decision: 'radio', submit: 'Send reply' });

describe('QuestionPaper', () => {
  it('answers as a reply', () => {
    mountQuestion(QuestionPaper, ask());
    expect(screen.getByRole('group', { name: 'Your reply' })).toBeTruthy();
  });
});
