import { useState, type FormEvent } from 'react';
import { UserRound, KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import { SlideArrow } from '../components/SlideArrow';
import { api, clearCache } from '../api';
import { setToken } from '../auth';
import { haptic, notify } from '../telegram';
import { useLanguage } from '../i18n';
import { Greek } from '../components/greek';
import { MeanderBand, OliveSprig } from '../components/greekArt';
import './authPersonalSeal.css';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

type Mode = 'login' | 'register';

/** Nickname + password sign-in / sign-up, shown in desktop focus mode. */
export function Auth({ onDone, initialMode = 'register' }: { onDone: () => void; initialMode?: Mode }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
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
      setToken(r.token, remember);
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
    <div className="fade-in center-col auth-screen auth-personal-seal">
      <aside className="auth-seal-visual hs-deco" aria-hidden="true">
        <img src={`${import.meta.env.BASE_URL}assets/auth-personal-seal-v1/auth-seal-collage.png`} width={1374} height={1145} alt="" draggable={false} />
        <h2>{t('auth.journey')}</h2>
      </aside>
      <div className="auth-form-column">
      <form className="card auth-card" onSubmit={submit}>
        <MeanderBand className="auth-meander" height={10} />
        <Greek name="temple" className="auth-temple" />
        <h2 className="auth-title">
          {t('auth.title')}
          <OliveSprig className="auth-olive" />
        </h2>
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
          <span className="auth-password-wrap">
          <input
            className="input"
            aria-label={t('auth.password')}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
          <button className="auth-password-toggle" type="button" aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')} aria-pressed={showPassword} onClick={() => setShowPassword((shown) => !shown)}>
            {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
          </button>
          </span>
          {mode === 'register' && <span className="field-hint">{t('auth.passwordHint')}</span>}
        </label>

        <label className="remember-row">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span>{t('auth.remember')}</span>
        </label>

        {err && <div className="auth-err" role="alert">{err}</div>}

        <button className="btn btn-block" type="submit" disabled={busy}>
          {busy ? (
            <Loader2 size={20} strokeWidth={2.6} className="spin" />
          ) : (
            <>
              {mode === 'register' ? t('auth.submit.register') : t('auth.submit.login')}
              <SlideArrow size={20} strokeWidth={2.6} />
            </>
          )}
        </button>
      </form>

      <button className="btn btn-block secondary" onClick={onDone}>
        {t('auth.guest')}
      </button>
      </div>
    </div>
  );
}
