import { describe, expect, it } from 'vitest';
import { greetNamed } from './greet';

describe('greetNamed', () => {
  it('puts the name before the mark, never a comma after it', () => {
    expect(greetNamed('night', 'Rakesh')).toBe('Working late, Rakesh?');
    expect(greetNamed('noon', 'Rakesh')).toBe('Good afternoon, Rakesh.');
  });
  it('leaves the greeting alone with no name', () => {
    expect(greetNamed('night', '')).toBe('Working late?');
    expect(greetNamed('morning', '')).toBe('Good morning.');
  });
});
