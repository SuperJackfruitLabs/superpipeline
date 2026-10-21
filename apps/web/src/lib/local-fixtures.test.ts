import { describe, expect, it } from 'vitest';
import { allowsLocalFixtures } from './local-fixtures';

describe('compiled local fixture admission', () => {
  it('admits only literal loopback hosts outside development builds', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]']) expect(allowsLocalFixtures(false, host)).toBe(true);
    for (const host of ['', 'superpipeline.com', 'localhost.example.com', '127.0.0.1.example.com', '192.168.1.1']) expect(allowsLocalFixtures(false, host)).toBe(false);
    expect(allowsLocalFixtures(true, 'dev.example.com')).toBe(true);
  });
});
