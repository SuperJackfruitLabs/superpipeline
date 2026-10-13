import { describe, expect, it } from 'vitest';
import { resolvePorts } from './ports';

describe('resolvePorts', () => {
  it('keeps the long-standing defaults', () => {
    expect(resolvePorts({})).toEqual({ api: 8787, web: 5173, apiUrl: 'http://localhost:8787', webUrl: 'http://localhost:5173' });
  });
  it('reads SP_API_PORT and SP_WEB_PORT independently', () => {
    expect(resolvePorts({ SP_API_PORT: '8797' })).toMatchObject({ api: 8797, web: 5173 });
    expect(resolvePorts({ SP_WEB_PORT: '5183' })).toMatchObject({ api: 8787, web: 5183, webUrl: 'http://localhost:5183' });
  });
  it('treats an empty value as unset', () => {
    expect(resolvePorts({ SP_API_PORT: '', SP_WEB_PORT: ' ' })).toMatchObject({ api: 8787, web: 5173 });
  });
  it('rejects a value that is not a port', () => {
    expect(() => resolvePorts({ SP_API_PORT: 'abc' })).toThrow(/SP_API_PORT/);
    expect(() => resolvePorts({ SP_WEB_PORT: '70000' })).toThrow(/SP_WEB_PORT/);
    expect(() => resolvePorts({ SP_WEB_PORT: '80.5' })).toThrow(/SP_WEB_PORT/);
  });
});
