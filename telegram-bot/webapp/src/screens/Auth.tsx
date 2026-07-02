import { useState, type FormEvent } from 'react';
import { UserRound, KeyRound, ArrowRight, Loader2 } from 'lucide-react';
import { api, clearCache } from '../api';
import { setToken } from '../auth';
import { haptic, notify } from '../telegram';
import { useLanguage } from '../i18n';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

type Mode = 'login' | 'register';

/** Nickname + password sign-in / sign-up, shown in desktop focus mode. */
export function Auth({ onDone, initialMode = 'register' }: { onDone: () => void; initialMode?: Mode }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = (m: Mode) => {
    haptic('light');
    setMode(m);
    setErr(null);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!USERNAME_RE.test(username) || password.length < 6) {
      setErr(t('auth.error.input'));
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r =
        mode === 'register'
          ? await api.register(username, password)
          : await api.login(username, password);
      setToken(r.token);
      clearCache(); // never show the guest account's numbers to the new user
      notify('success');
      onDone();
    } catch (e) {
      const status = Number(/API (\d+)/.exec(e instanceof Error ? e.message : '')?.[1] ?? 0);
      if (status === 409) setErr(t('auth.error.taken'));
      else if (status === 401) setErr(t('auth.error.invalid'));
      else if (status === 400) setErr(t('auth.error.input'));
      else setErr(t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fade-in center-col">
      <form className="card auth-card" onSubmit={submit}>
        <h2 className="auth-title">{t('auth.title')}</h2>
        <p className="auth-sub">{t('auth.sub')}</p>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={mode === 'register' ? 'active' : ''}
            onClick={() => pick('register')}
          >
            {t('auth.register')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={mode === 'login' ? 'active' : ''}
            onClick={() => pick('login')}
          >
            {t('auth.login')}
          </button>
        </div>

        <label className="field">
          <span className="field-label">
            <UserRound size={14} strokeWidth={2.6} /> {t('auth.username')}
          </span>
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value.trim())}
            placeholder="maria_gr"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
          />
          {mode === 'register' && <span className="field-hint">{t('auth.usernameHint')}</span>}
        </label>

        <label className="field">
          <span className="field-label">
            <KeyRound size={14} strokeWidth={2.6} /> {t('auth.password')}
          </span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
          {mode === 'register' && <span className="field-hint">{t('auth.passwordHint')}</span>}
        </label>

        {err && <div className="auth-err">{err}</div>}

        <button className="btn btn-block" type="submit" disabled={busy}>
          {busy ? (
            <Loader2 size={20} strokeWidth={2.6} className="spin" />
          ) : (
            <>
              {mode === 'register' ? t('auth.submit.register') : t('auth.submit.login')}
              <ArrowRight size={20} strokeWidth={2.6} />
            </>
          )}
        </button>
      </form>

      <button className="btn btn-block secondary" onClick={onDone}>
        {t('auth.guest')}
      </button>
    </div>
  );
}
