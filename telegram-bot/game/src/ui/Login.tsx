import { useState, type FormEvent } from 'react';
import { api } from '@shared/api';
import { setToken } from '@shared/auth';
import { GUEST_KEY } from '../session';
import { s } from './strings';

export function Login({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(mode: 'login' | 'register') {
    if (!username.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      const r = mode === 'login' ? await api.login(username.trim(), password) : await api.register(username.trim(), password);
      setToken(r.token);
      localStorage.removeItem(GUEST_KEY);
      onDone();
    } catch (e) {
      const msg = String(e);
      setError(msg.includes('409') ? s('userExists') : msg.includes('API 4') ? s('loginFailed') : s('networkError'));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit('login');
  }

  return (
    <div className="screen">
      <form className="panel login" onSubmit={onSubmit}>
        <h1>{s('title')}</h1>
        <input placeholder={s('username')} value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        <input placeholder={s('password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>{s('login')}</button>
        <button type="button" disabled={busy} onClick={() => void submit('register')}>{s('register')}</button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            localStorage.setItem(GUEST_KEY, '1');
            onDone();
          }}
        >
          {s('guest')}
        </button>
      </form>
    </div>
  );
}
