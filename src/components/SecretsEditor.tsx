/** @jsxImportSource preact */
import { useEffect, useState } from 'preact/hooks';
import { fetchDeployment, updateDeployment } from '~/lib/api';
import { encryptSecrets, decryptSecrets, generateRecoveryKey } from '~/lib/crypto';
import type { Deployment } from '~/lib/types';
import { UnlockModal } from '~/components/UnlockModal';

interface Props { id: number; }

const KEY_STORAGE = 'hippocampus:secretKey';

export function SecretsEditor({ id }: Props) {
  const [dep, setDep] = useState<Deployment | null>(null);
  const [unlocked, setUnlocked] = useState<string | null>(null);
  const [plaintext, setPlaintext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetchDeployment(id).then(setDep).catch((e) => setError(String(e)));
    const stored = sessionStorage.getItem(KEY_STORAGE);
    if (stored) setUnlocked(stored);
  }, [id]);

  function handleUnlock(key: string) {
    if (!dep?.encrypted_secrets) {
      sessionStorage.setItem(KEY_STORAGE, key);
      setUnlocked(key);
      setEditing(true);
      return;
    }
    decryptSecrets(JSON.parse(dep.encrypted_secrets), key)
      .then((pt) => {
        sessionStorage.setItem(KEY_STORAGE, key);
        setUnlocked(key);
        setPlaintext(pt);
      })
      .catch(() => setError('Wrong passphrase or recovery key'));
  }

  async function handleSave() {
    try {
      const key = sessionStorage.getItem(KEY_STORAGE)!;
      const recoveryKey = generateRecoveryKey();
      const blob = await encryptSecrets(plaintext, key, recoveryKey);
      await updateDeployment(id, { encrypted_secrets: JSON.stringify(blob) });
      const updated = await fetchDeployment(id);
      setDep(updated);
      setEditing(false);
      alert('Saved. A new recovery key was generated — copy it from the dev tools or back up before closing this tab.');
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleDelete() {
    if (!confirm('Delete encrypted secrets?')) return;
    await updateDeployment(id, { encrypted_secrets: '' });
    const updated = await fetchDeployment(id);
    setDep(updated);
    setUnlocked(null);
    sessionStorage.removeItem(KEY_STORAGE);
    setPlaintext('');
  }

  function handleLock() {
    setUnlocked(null);
    sessionStorage.removeItem(KEY_STORAGE);
    setPlaintext('');
  }

  if (error) return <p class="status-down">{error}</p>;
  if (!dep) return <p class="muted">Loading…</p>;

  if (!unlocked) {
    return <UnlockModal onUnlock={handleUnlock} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <h2 class="t-xl">Encrypted secrets</h2>
        <button onClick={handleLock}>Lock now</button>
      </div>
      {editing || !dep.encrypted_secrets ? (
        <>
          <textarea
            rows={15}
            value={plaintext}
            onInput={(e) => setPlaintext((e.target as HTMLTextAreaElement).value)}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 'var(--text-sm)' }}
            placeholder="Enter secrets here. Encrypted in your browser before upload."
          />
          <div style={{ marginTop: 'var(--space-3)' }}>
            <button onClick={handleSave} class="primary">Save</button>
            {dep.encrypted_secrets && <button onClick={() => setEditing(false)} style={{ marginLeft: 'var(--space-2)' }}>Cancel</button>}
          </div>
        </>
      ) : (
        <>
          <pre style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap', overflow: 'auto' }}>{plaintext}</pre>
          <div style={{ marginTop: 'var(--space-3)' }}>
            <button onClick={() => setEditing(true)}>Edit</button>
            <button onClick={handleDelete} style={{ marginLeft: 'var(--space-2)', color: 'var(--color-status-down)', borderColor: 'var(--color-status-down)' }}>Delete</button>
          </div>
        </>
      )}
    </div>
  );
}

export default SecretsEditor;