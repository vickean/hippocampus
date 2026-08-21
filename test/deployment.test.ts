import { describe, it, expect } from 'vitest';
import {
  DeploymentCreateSchema,
  DeploymentUpdateSchema,
  DeploymentListQuerySchema,
  DeploymentTypes,
  Environments,
  Statuses,
  listMeta,
} from '../src/lib/deployment';

describe('DeploymentTypes / Environments / Statuses', () => {
  it('DeploymentTypes has 5 entries', () => {
    expect(DeploymentTypes).toEqual(['app', 'db', 'vm', 'service', 'other']);
  });
  it('Environments has 6 entries', () => {
    expect(Environments).toEqual(['home', 'dev', 'prod', 'vps', 'customer', 'other']);
  });
  it('Statuses has 3 entries', () => {
    expect(Statuses).toEqual(['up', 'down', 'unknown']);
  });
});

describe('listMeta', () => {
  it('returns the enums object', () => {
    expect(listMeta()).toEqual({
      types: DeploymentTypes,
      environments: Environments,
      statuses: Statuses,
    });
  });
});

describe('DeploymentCreateSchema', () => {
  it('accepts a minimal valid payload', () => {
    const r = DeploymentCreateSchema.safeParse({ name: 'OtterSave', type: 'app', environment: 'prod' });
    expect(r.success).toBe(true);
  });

  it('rejects missing name', () => {
    const r = DeploymentCreateSchema.safeParse({ type: 'app', environment: 'prod' });
    expect(r.success).toBe(false);
  });

  it('rejects invalid type', () => {
    const r = DeploymentCreateSchema.safeParse({ name: 'x', type: 'unknown-type', environment: 'prod' });
    expect(r.success).toBe(false);
  });

  it('rejects invalid url', () => {
    const r = DeploymentCreateSchema.safeParse({
      name: 'x', type: 'app', environment: 'prod', public_url: 'not-a-url',
    });
    expect(r.success).toBe(false);
  });

  it('accepts optional fields', () => {
    const r = DeploymentCreateSchema.safeParse({
      name: 'OtterSave',
      type: 'app',
      environment: 'prod',
      host: '192.168.1.10',
      tags: ['prod', 'qssb'],
      notes: 'Production server',
    });
    expect(r.success).toBe(true);
  });
});

describe('DeploymentUpdateSchema', () => {
  it('accepts a partial payload', () => {
    const r = DeploymentUpdateSchema.safeParse({ status: 'up' });
    expect(r.success).toBe(true);
  });

  it('accepts empty object', () => {
    const r = DeploymentUpdateSchema.safeParse({});
    expect(r.success).toBe(true);
  });
});

describe('DeploymentListQuerySchema', () => {
  it('accepts empty query', () => {
    const r = DeploymentListQuerySchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it('accepts filter params', () => {
    const r = DeploymentListQuerySchema.safeParse({ type: 'app', environment: 'prod', status: 'up' });
    expect(r.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const r = DeploymentListQuerySchema.safeParse({ status: 'invalid' });
    expect(r.success).toBe(false);
  });
});