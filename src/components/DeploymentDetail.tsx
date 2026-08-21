/** @jsxImportSource preact */
import { useEffect, useState } from 'preact/hooks';
import { fetchDeployment, updateDeployment, deleteDeployment } from '~/lib/api';
import type { Deployment } from '~/lib/types';
import { DeploymentForm } from '~/components/DeploymentForm';

interface Props { id: number; }

export function DeploymentDetail({ id }: Props) {
  const [dep, setDep] = useState<Deployment | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDeployment(id).then(setDep).catch((e) => setError(String(e)));
  }, [id]);

  async function handleSave(patch: any) {
    const saved = await updateDeployment(id, patch);
    setDep(saved);
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${dep ? dep.name : id}"?`)) return;
    await deleteDeployment(id);
    window.location.href = '/';
  }

  async function handleCopyAccessCommand() {
    if (!dep?.access_command) return;
    await navigator.clipboard.writeText(dep.access_command);
  }

  if (error) return <p class="status-down">{error}</p>;
  if (!dep) return <p class="muted">Loading…</p>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <h1 class="t-2xl">{dep.name}</h1>
        <div>
          <span class={`status-${dep.status}`}>{dep.status}</span>
          <button onClick={() => setEditing(!editing)} style={{ marginLeft: 'var(--space-3)' }}>
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button onClick={handleDelete} style={{ marginLeft: 'var(--space-2)', color: 'var(--color-status-down)', borderColor: 'var(--color-status-down)' }}>
            Delete
          </button>
        </div>
      </div>

      {editing ? (
        <DeploymentForm initial={dep as any} onSaved={() => handleSave(dep)} />
      ) : (
        <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: 'var(--space-2) var(--space-4)' }}>
          <dt class="muted">Type</dt><dd>{dep.type}</dd>
          <dt class="muted">Environment</dt><dd>{dep.environment}</dd>
          <dt class="muted">Purpose</dt><dd>{dep.purpose ?? '—'}</dd>
          <dt class="muted">Host</dt><dd>{dep.host ?? '—'}</dd>
          <dt class="muted">Public URL</dt><dd>{dep.public_url ? <a href={dep.public_url}>{dep.public_url}</a> : '—'}</dd>
          <dt class="muted">Access command</dt>
          <dd>
            <code>{dep.access_command ?? '—'}</code>
            {dep.access_command && <button onClick={handleCopyAccessCommand} style={{ marginLeft: 'var(--space-2)' }}>Copy</button>}
          </dd>
          <dt class="muted">Software version</dt><dd>{dep.software_version ?? '—'}</dd>
          <dt class="muted">Last verified</dt><dd>{dep.last_verified_at ?? '—'}</dd>
          <dt class="muted">Tags</dt><dd>{dep.tags ?? '—'}</dd>
          <dt class="muted">Notes</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{dep.notes ?? '—'}</dd>
        </dl>
      )}

      <p style={{ marginTop: 'var(--space-6)' }}>
        <a href={`/deployments/${dep.id}/secrets`}>🔒 Manage encrypted secrets</a>
      </p>
    </div>
  );
}

export default DeploymentDetail;