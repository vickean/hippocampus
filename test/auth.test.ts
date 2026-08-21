import { describe, it, expect } from 'vitest';
import { isAuthorized, timingSafeEqualString } from '../src/lib/auth';

const VALID_TOKEN = 'a-very-long-secret-token-1234567890abcdef';

describe('timingSafeEqualString', () => {
  it('returns true for equal strings', () => {
    expect(timingSafeEqualString('foo', 'foo')).toBe(true);
  });
  it('returns false for different strings', () => {
    expect(timingSafeEqualString('foo', 'bar')).toBe(false);
  });
  it('returns false for different-length strings', () => {
    expect(timingSafeEqualString('foo', 'foobar')).toBe(false);
  });
});

describe('isAuthorized', () => {
  function req(opts: {
    jwt?: string;
    bearer?: string;
  }): Request {
    const headers = new Headers();
    if (opts.jwt) headers.set('cf-access-jwt-assertion', opts.jwt);
    if (opts.bearer) headers.set('Authorization', `Bearer ${opts.bearer}`);
    return new Request('https://example.com/api/deployments', { headers });
  }

  it('allows requests with Access JWT', async () => {
    const ok = await isAuthorized(req({ jwt: 'valid-jwt' }), { expectedToken: VALID_TOKEN });
    expect(ok).toBe(true);
  });

  it('allows requests with valid bearer token', async () => {
    const ok = await isAuthorized(req({ bearer: VALID_TOKEN }), { expectedToken: VALID_TOKEN });
    expect(ok).toBe(true);
  });

  it('rejects requests with wrong bearer token', async () => {
    const ok = await isAuthorized(req({ bearer: 'wrong' }), { expectedToken: VALID_TOKEN });
    expect(ok).toBe(false);
  });

  it('rejects requests with no auth', async () => {
    const ok = await isAuthorized(req({}), { expectedToken: VALID_TOKEN });
    expect(ok).toBe(false);
  });
});