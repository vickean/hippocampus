export type DeploymentType = 'app' | 'db' | 'vm' | 'service' | 'other';
export type Environment = 'home' | 'dev' | 'prod' | 'vps' | 'customer' | 'other';
export type Status = 'up' | 'down' | 'unknown';

export interface Deployment {
  id: number;
  name: string;
  type: DeploymentType;
  environment: Environment;
  purpose: string | null;
  host: string | null;
  public_url: string | null;
  access_command: string | null;
  software_version: string | null;
  status: Status;
  last_verified_at: string | null;
  notes: string | null;
  tags: string | null;
  encrypted_secrets: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeploymentCreate {
  name: string;
  type: DeploymentType;
  environment: Environment;
  purpose?: string;
  host?: string;
  public_url?: string;
  access_command?: string;
  software_version?: string;
  status?: Status;
  last_verified_at?: string;
  notes?: string;
  tags?: string[];
  encrypted_secrets?: string;
}

export interface DeploymentMeta {
  types: DeploymentType[];
  environments: Environment[];
  statuses: Status[];
}