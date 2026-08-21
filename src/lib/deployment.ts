import { z } from 'zod';

export const DeploymentTypes = ['app', 'db', 'vm', 'service', 'other'] as const;
export const Environments = ['home', 'dev', 'prod', 'vps', 'customer', 'other'] as const;
export const Statuses = ['up', 'down', 'unknown'] as const;

export const DeploymentTypeSchema = z.enum(DeploymentTypes);
export const EnvironmentSchema = z.enum(Environments);
export const StatusSchema = z.enum(Statuses);

export const DeploymentCreateSchema = z.object({
  name: z.string().min(1).max(200),
  type: DeploymentTypeSchema,
  environment: EnvironmentSchema,
  purpose: z.string().max(500).optional(),
  host: z.string().max(500).optional(),
  public_url: z.string().url().max(500).optional(),
  access_command: z.string().max(2000).optional(),
  software_version: z.string().max(100).optional(),
  status: StatusSchema.optional(),
  last_verified_at: z.string().datetime().optional(),
  notes: z.string().max(10_000).optional(),
  tags: z.array(z.string().max(50)).max(50).optional(),
  encrypted_secrets: z.string().max(50_000).optional(),
});

export const DeploymentUpdateSchema = DeploymentCreateSchema.partial();

export const DeploymentListQuerySchema = z.object({
  type: DeploymentTypeSchema.optional(),
  environment: EnvironmentSchema.optional(),
  status: StatusSchema.optional(),
  q: z.string().max(200).optional(),
});

export function listMeta() {
  return {
    types: DeploymentTypes,
    environments: Environments,
    statuses: Statuses,
  };
}

export type DeploymentCreate = z.infer<typeof DeploymentCreateSchema>;
export type DeploymentUpdate = z.infer<typeof DeploymentUpdateSchema>;