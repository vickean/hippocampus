import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const DeploymentTypes = ['app', 'db', 'vm', 'service', 'other'] as const;
export const Environments = ['home', 'dev', 'prod', 'vps', 'customer', 'other'] as const;
export const Statuses = ['up', 'down', 'unknown'] as const;

export type DeploymentType = typeof DeploymentTypes[number];
export type Environment = typeof Environments[number];
export type Status = typeof Statuses[number];

export const deployments = sqliteTable(
  'deployments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    type: text('type', { enum: DeploymentTypes }).notNull(),
    environment: text('environment', { enum: Environments }).notNull(),
    purpose: text('purpose'),
    host: text('host'),
    publicUrl: text('public_url'),
    accessCommand: text('access_command'),
    softwareVersion: text('software_version'),
    status: text('status', { enum: Statuses }).notNull().default('unknown'),
    lastVerifiedAt: text('last_verified_at'),
    notes: text('notes'),
    tags: text('tags'),
    encryptedSecrets: text('encrypted_secrets'),
    createdAt: text('created_at').notNull().default("(datetime('now'))"),
    updatedAt: text('updated_at').notNull().default("(datetime('now'))"),
  },
  (t) => ({
    typeIdx: index('idx_deployments_type').on(t.type),
    envIdx: index('idx_deployments_environment').on(t.environment),
    statusIdx: index('idx_deployments_status').on(t.status),
  })
);