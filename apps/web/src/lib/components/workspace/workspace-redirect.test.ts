import { describe, expect, it } from 'vitest';
import { workspaceRedirect } from './workspace-redirect';

describe('old Workspace links', () => {
  it('land where each tab lives now', () => {
    expect(['needs-you', 'labels', 'connections', 'agents', 'people', 'capabilities', 'nope'].map(workspaceRedirect)).toEqual([
      '/inbox', '/settings#labels', '/settings#connections', '/crew/agents', '/crew/people', '/crew/capabilities', '/crew/agents',
    ]);
  });
});
