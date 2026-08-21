import { describe, it, expect } from 'vitest';
import { DeploymentTypes, Environments, Statuses } from '../worker/schema';

describe('deployment enums', () => {
  it('exposes DeploymentTypes', () => {
    expect(DeploymentTypes).toEqual(['app', 'db', 'vm', 'service', 'other']);
  });
  it('exposes Environments', () => {
    expect(Environments).toEqual(['home', 'dev', 'prod', 'vps', 'customer', 'other']);
  });
  it('exposes Statuses', () => {
    expect(Statuses).toEqual(['up', 'down', 'unknown']);
  });
});
