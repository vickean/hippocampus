import type { Deployment, DeploymentCreate, DeploymentMeta } from './types';

function apiBase(): string {
  if (typeof window !== 'undefined') return window.location.origin + '/api';
  return 'http://localhost:4321/api';
}

export async function fetchDeployments(filters?: {
  type?: string;
  environment?: string;
  status?: string;
  q?: string;
}): Promise<Deployment[]> {
  const params = new URLSearchParams();
  if (filters?.type) params.set('type', filters.type);
  if (filters?.environment) params.set('environment', filters.environment);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.q) params.set('q', filters.q);
  const url = `${apiBase()}/deployments${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  const body = await res.json() as { deployments: Deployment[] };
  return body.deployments;
}

export async function fetchDeployment(id: number): Promise<Deployment> {
  const res = await fetch(`${apiBase()}/deployments/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`GET deployment ${id} → ${res.status}`);
  return res.json();
}

export async function createDeployment(d: DeploymentCreate): Promise<Deployment> {
  const res = await fetch(`${apiBase()}/deployments`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(d),
  });
  if (!res.ok) throw new Error(`POST deployment → ${res.status}`);
  return res.json();
}

export async function updateDeployment(id: number, patch: Partial<DeploymentCreate>): Promise<Deployment> {
  const res = await fetch(`${apiBase()}/deployments/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH deployment ${id} → ${res.status}`);
  return res.json();
}

export async function deleteDeployment(id: number): Promise<void> {
  const res = await fetch(`${apiBase()}/deployments/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`DELETE deployment ${id} → ${res.status}`);
}

export async function fetchMeta(): Promise<DeploymentMeta> {
  const res = await fetch(`${apiBase()}/meta`);
  if (!res.ok) throw new Error(`GET meta → ${res.status}`);
  return res.json();
}