/** @jsxImportSource preact */
import { useEffect, useState } from 'preact/hooks';
import type { Deployment, DeploymentMeta } from '~/lib/types';
import { fetchDeployments, fetchMeta } from '~/lib/api';

interface Props {
  initialFilters?: { type?: string; environment?: string; status?: string; q?: string };
}

export function DeploymentTable({ initialFilters = {} }: Props) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [meta, setMeta] = useState<DeploymentMeta | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMeta().then(setMeta).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchDeployments(filters)
      .then(setDeployments)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    const newUrl = params.toString() ? `?${params}` : window.location.pathname;
    history.replaceState(null, '', newUrl);
  }, [JSON.stringify(filters)]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
        <select
          value={filters.type ?? ''}
          onChange={(e) => setFilters({ ...filters, type: (e.target as HTMLSelectElement).value || undefined })}
        >
          <option value="">All types</option>
          {meta?.types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filters.environment ?? ''}
          onChange={(e) => setFilters({ ...filters, environment: (e.target as HTMLSelectElement).value || undefined })}
        >
          <option value="">All environments</option>
          {meta?.environments.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filters.status ?? ''}
          onChange={(e) => setFilters({ ...filters, status: (e.target as HTMLSelectElement).value || undefined })}
        >
          <option value="">All statuses</option>
          {meta?.statuses.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          type="search"
          placeholder="Search by name…"
          value={filters.q ?? ''}
          onInput={(e) => setFilters({ ...filters, q: (e.target as HTMLInputElement).value || undefined })}
          style={{ flex: 1, minWidth: '200px' }}
        />
      </div>

      {error && <p class="status-down">{error}</p>}
      {loading && <p class="muted">Loading…</p>}

      {!loading && !error && deployments.length === 0 && (
        <p class="muted">No deployments yet. <a href="/deployments/new">+ New</a></p>
      )}

      {!loading && deployments.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Type</th><th>Env</th><th>Host</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {deployments.map((d) => (
              <tr key={d.id}>
                <td data-label="Name"><a href={`/deployments/${d.id}`}>{d.name}</a></td>
                <td data-label="Type">{d.type}</td>
                <td data-label="Env">{d.environment}</td>
                <td data-label="Host">{d.host ?? '—'}</td>
                <td data-label="Status"><span class={`status-${d.status}`}>{d.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default DeploymentTable;