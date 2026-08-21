/** @jsxImportSource preact */
import { useState } from 'preact/hooks';

interface Props {
  onUnlock: (key: string) => void;
}

export function UnlockModal({ onUnlock }: Props) {
  const [key, setKey] = useState('');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 'var(--space-4)' }}>
      <div style={{ background: 'white', padding: 'var(--space-6)', borderRadius: 'var(--radius-md)', maxWidth: '400px', width: '100%' }}>
        <h2 class="t-lg" style="margin-top: 0">Unlock secrets</h2>
        <p class="muted t-sm">Enter your passphrase or recovery key.</p>
        <form onSubmit={(e) => { e.preventDefault(); onUnlock(key); }}>
          <input
            type="password"
            required
            value={key}
            onInput={(e) => setKey((e.target as HTMLInputElement).value)}
            style={{ marginBottom: 'var(--space-3)' }}
          />
          <button type="submit" class="primary">Unlock</button>
        </form>
      </div>
    </div>
  );
}

export default UnlockModal;