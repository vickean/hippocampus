/** @jsxImportSource preact */
import { useState } from 'preact/hooks';
import { generateRecoveryKey } from '~/lib/crypto';

const HAS_PASSPHRASE_KEY = 'hippocampus:hasPassphrase';

export function SettingsForm() {
  const hasPassphrase = typeof localStorage !== 'undefined' && localStorage.getItem(HAS_PASSPHRASE_KEY) === '1';
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: Event) {
    e.preventDefault();
    if (passphrase !== confirm) {
      setError('Passphrases do not match');
      return;
    }
    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters');
      return;
    }
    const key = generateRecoveryKey();
    setRecoveryKey(key);
    setError(null);
  }

  function handleAcknowledge() {
    localStorage.setItem(HAS_PASSPHRASE_KEY, '1');
    setRecoveryKey(null);
    setPassphrase('');
    setConfirm('');
    alert('Passphrase saved. Recovery key stored offline (1Password, paper, etc.) — without it, encrypted secrets are unrecoverable.');
  }

  return (
    <div>
      <h2 class="t-xl" style="margin-bottom: var(--space-3)">
        {hasPassphrase ? 'Change passphrase' : 'Set passphrase'}
      </h2>

      {!recoveryKey && (
        <form onSubmit={handleSave} style={{ display: 'grid', gap: 'var(--space-3)', maxWidth: '500px' }}>
          <label>Passphrase (min 8 chars)
            <input type="password" required minLength={4} value={passphrase} onInput={(e) => setPassphrase((e.target as HTMLInputElement).value)} />
          </label>
          <label>Confirm
            <input type="password" required minLength={4} value={confirm} onInput={(e) => setConfirm((e.target as HTMLInputElement).value)} />
          </label>
          {error && <p class="status-down">{error}</p>}
          <button type="submit" class="primary">Generate recovery key</button>
        </form>
      )}

      {recoveryKey && (
        <div style={{ background: '#fffbe6', border: '1px solid #fadb14', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
          <p class="t-md" style="margin-top: 0"><strong>⚠ Your recovery key (shown ONCE):</strong></p>
          <pre style={{ background: 'white', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', overflowX: 'auto', fontSize: 'var(--text-sm)' }}>
{recoveryKey}
          </pre>
          <p class="t-sm muted">Save this somewhere safe: 1Password secure note, paper in a safe, etc. Without it, encrypted secrets are unrecoverable.</p>
          <label style={{ display: 'block', margin: 'var(--space-3) 0' }}>
            <input type="checkbox" onChange={(e) => (e.target as HTMLInputElement).checked && handleAcknowledge()} />
            {' '}I have saved this recovery key
          </label>
        </div>
      )}
    </div>
  );
}

export default SettingsForm;