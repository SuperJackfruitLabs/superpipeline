import { describe, expect, it } from 'vitest';
import { errorText } from './error-text';

describe('errorText', () => {
  it('reads the error.v1 envelope', () => {
    expect(errorText({ error: { code: 'FORBIDDEN', message: 'a viewer may not do that in this workspace' } })).toBe('a viewer may not do that in this workspace');
  });
  it('reads a workspace route’s plain sentence', () => {
    expect(errorText({ error: 'project not found' })).toBe('project not found');
  });
  it('is null for a body that carries neither', () => {
    expect(errorText(null)).toBeNull();
    expect(errorText({})).toBeNull();
    expect(errorText({ error: { code: 'UNAUTHORIZED' } })).toBeNull();
  });
});
