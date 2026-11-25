import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, KeyRound } from 'lucide-react';
import '../styles/payroll.css';
import { API_BASE_URL } from '../config/api';

/** Public page opened from the welcome / password-reset e-mail. */
export const ResetPasswordPage: React.FC = () => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const token = params.get('token') || '';
  const isWelcome = params.get('welcome') === '1';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const checks = [
    { ok: password.length >= 8, label: 'At least 8 characters' },
    { ok: /[A-Z]/.test(password) && /[a-z]/.test(password), label: 'Upper- and lower-case letters' },
    { ok: /\d/.test(password), label: 'A number' },
    { ok: password.length > 0 && password === confirm, label: 'Both entries match' },
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checks.every((c) => c.ok)) {
      setError('Please meet all the password requirements.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error?.message || 'This link is invalid or has expired.');
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16, background: 'var(--bg-app)' }}>
      <div className="pp-card" style={{ width: '100%', maxWidth: 420, padding: 24 }}>
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle2 size={40} color="var(--success-text)" />
            <h1 className="pp-title" style={{ justifyContent: 'center', marginTop: 8 }}>Password saved</h1>
            <p className="pp-sub">You can now sign in with your employee ID or e-mail and the new password.</p>
            <button className="pp-btn pp-btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={() => navigate('/login')}>Go to sign in</button>
          </div>
        ) : !token ? (
          <div>
            <h1 className="pp-title">Link incomplete</h1>
            <p className="pp-sub">Open the link from your e-mail again, or ask for a new one from the sign-in page ("Forgot password").</p>
            <Link className="pp-btn" style={{ marginTop: 16 }} to="/login">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h1 className="pp-title"><KeyRound size={22} color="var(--primary-400)" /> {isWelcome ? 'Set your password' : 'Choose a new password'}</h1>
            <p className="pp-sub">{isWelcome ? 'Welcome! Create a password to finish setting up your account.' : 'Enter a new password for your account.'}</p>
            <div className="pp-field" style={{ marginTop: 16 }}>
              <label htmlFor="np">New password</label>
              <input id="np" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="pp-field" style={{ marginTop: 12 }}>
              <label htmlFor="cp">Confirm password</label>
              <input id="cp" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0', fontSize: 13 }}>
              {checks.map((c) => (
                <li key={c.label} style={{ color: c.ok ? 'var(--success-text)' : 'var(--text-muted)' }}>{c.ok ? '✓' : '•'} {c.label}</li>
              ))}
            </ul>
            {error && <div className="pp-banner pp-banner-err" style={{ marginBottom: 12 }}>{error}</div>}
            <button className="pp-btn pp-btn-primary" type="submit" disabled={busy} style={{ width: '100%' }}>{busy ? 'Saving…' : 'Save password'}</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
