// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { ask, mountQuestion, questionPanelContract } from './question-panel.contract';
import QuestionStudio from './QuestionStudio.svelte';

questionPanelContract(QuestionStudio, { decision: 'button', noteLabel: 'Note to Sample agent' });

describe('QuestionStudio', () => {
  it('reads who is waiting as an uppercase line with a light, and keeps the options on a command bar', () => {
    const { container } = mountQuestion(QuestionStudio, ask());
    expect(container.querySelector('.uppercase')?.textContent).toBe('Sample agent is waiting');
    expect(container.querySelector('.status-led')?.getAttribute('data-mood')).toBe('needs');
    expect(container.querySelectorAll('.command-bar button')).toHaveLength(2);
  });
});
