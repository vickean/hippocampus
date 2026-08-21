/** @jsxImportSource preact */
import { useEffect, useState } from 'preact/hooks';
import { createDeployment, fetchMeta } from '~/lib/api';
import type { DeploymentCreate, DeploymentMeta } from '~/lib/types';

interface Props {
  initial?: Partial<DeploymentCreate>;
  onSaved?: (id: number) => void;
}

export function DeploymentForm({ initial = {}, onSaved }: Props) {
  const [meta, setMeta] = useState<DeploymentMeta | null>(null);
  const [form, setForm] = useState<DeploymentCreate>({
    name: '',
    type: 'app',
    environment: 'dev',
    status: 'unknown',
    tags: [],
    ...initial,
  });
  const [tagsCsv, setTagsCsv] = useState((initial.tags ?? []).join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchMeta().then(setMeta).catch((e) => setError(String(e))); }, []);

  function update<K extends keyof DeploymentCreate>(key: K, value: DeploymentCreate[K]) {
    setForm({ ...form, [key]: value });
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: DeploymentCreate = {
        ...form,
        tags: tagsCsv.split(',').map((s) => s.trim()).filter(Boolean),
      };
      const saved = await createDeployment(payload);
      if (onSaved) onSaved(saved.id);
      else window.location.href = `/deployments/${saved.id}`;
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  if (!meta) return <p class="muted">Loading form…</p>;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--space-3)', maxWidth: '600px' }}>
      <label>Name <input required value={form.name} onInput={(e) => update('name', (e.target as HTMLInputElement).value)} /></label>
      <label>Type
        <select value={form.type} onChange={(e) => update('type', (e.target as HTMLSelectElement).value as DeploymentCreate['type'])}>
          {meta.types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label>Environment
        <select value={form.environment} onChange={(e) => update('environment', (e.target as HTMLSelectElement).value as DeploymentCreate['environment'])}>
          {meta.environments.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label>Purpose <input value={form.purpose ?? ''} onInput={(e) => update('purpose', (e.target as HTMLInputElement).value || undefined)} /></label>
      <label>Host <input value={form.host ?? ''} onInput={(e) => update('host', (e.target as HTMLInputElement).value || undefined)} /></label>
      <label>Public URL <input type="url" value={form.public_url ?? ''} onInput={(e) => update('public_url', (e.target as HTMLInputElement).value || undefined)} /></label>
      <label>Access command <input value={form.access_command ?? ''} onInput={(e) => update('access_command', (e.target as HTMLInputElement).value || undefined)} /></label>
      <label>Software version <input value={form.software_version ?? ''} onInput={(e) => update('software_version', (e.target as HTMLInputElement).value || undefined)} /></label>
      <label>Status
        <select value={form.status ?? 'unknown'} onChange={(e) => update('status', (e.target as HTMLSelectElement).value as DeploymentCreate['status'])}>
          {meta.statuses.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label>Tags (comma-separated) <input value={tagsCsv} onInput={(e) => setTagsCsv((e.target as HTMLInputElement).value)} /></label>
      <label>Notes <textarea rows={5} value={form.notes ?? ''} onInput={(e) => update('notes', (e.target as HTMLTextAreaElement).value || undefined)} /></label>

      {error && <p class="status-down">{error}</p>}

      <button type="submit" class="primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}

export default DeploymentForm;