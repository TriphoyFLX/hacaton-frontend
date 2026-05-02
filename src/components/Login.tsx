import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Eye, EyeOff, LogIn } from 'lucide-react';

// ── Styles ──
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');`;

const css = `
${FONT_IMPORT}

.login-root {
  --bg: #0b0b0b;
  --bg-surface: #111111;
  --bg-elevated: #181818;
  --border: #232323;
  --border-mid: #2e2e2e;
  --border-hover: #3d3d3d;
  --text-primary: #f0ede8;
  --text-secondary: #6b6b6b;
  --text-muted: #3a3a3a;
  --accent: #e8e4dc;
  --accent-dim: #c5c0b8;
  --red: #c0392b;
  --red-dim: #1a0f0f;
  font-family: 'Syne', sans-serif;
  background: var(--bg);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  position: relative;
  overflow: hidden;
}

/* ── AMBIENT ── */
.login-ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(140px);
  opacity: 0.07;
  animation: orb-float 24s ease-in-out infinite;
}
.ambient-orb-1 {
  width: 700px;
  height: 700px;
  background: radial-gradient(circle, rgba(232, 228, 220, 0.3) 0%, transparent 70%);
  top: -300px;
  left: -150px;
  animation-delay: 0s;
}
.ambient-orb-2 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(197, 192, 184, 0.25) 0%, transparent 70%);
  bottom: -250px;
  right: -150px;
  animation-delay: -12s;
}
.ambient-orb-3 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(180, 175, 168, 0.2) 0%, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -6s;
}
@keyframes orb-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(40px, -50px) scale(1.1); }
  66% { transform: translate(-30px, 30px) scale(0.95); }
}
.login-noise {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.02;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px;
}
.login-grid-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.01;
  background-image: 
    linear-gradient(rgba(232, 228, 220, 0.2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(232, 228, 220, 0.2) 1px, transparent 1px);
  background-size: 64px 64px;
}

/* ── CARD ── */
.login-card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 420px;
  margin: 20px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 48px 40px;
}

/* ── HEADER ── */
.login-header {
  text-align: center;
  margin-bottom: 40px;
}
.login-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}
.brand-logo {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}
.brand-logo svg {
  width: 100%;
  height: 100%;
}
.brand-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.03em;
}
.login-subtitle {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

/* ── ERROR ── */
.login-error {
  background: var(--red-dim);
  border: 1px solid rgba(192, 57, 43, 0.3);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 24px;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--red);
  line-height: 1.5;
}

/* ── FORM ── */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-label {
  font-family: 'DM Mono', monospace;
  font-size: 10.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
.input-wrap {
  position: relative;
}
.form-input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  padding-right: 44px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-mid);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}
.form-input:focus {
  border-color: var(--border-hover);
}
.form-input::placeholder {
  color: var(--text-muted);
}
.password-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  display: flex;
  transition: color 0.15s;
}
.password-toggle:hover {
  color: var(--text-secondary);
}
.password-toggle svg {
  width: 16px;
  height: 16px;
}

/* ── SUBMIT BUTTON ── */
.submit-btn {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: var(--text-primary);
  border: 1px solid var(--text-primary);
  border-radius: 10px;
  color: var(--bg);
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.15s;
  margin-top: 4px;
}
.submit-btn:hover {
  background: var(--accent-dim);
  border-color: var(--accent-dim);
}
.submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.submit-btn:disabled:hover {
  background: var(--text-primary);
  border-color: var(--text-primary);
}
.submit-btn svg {
  width: 16px;
  height: 16px;
  stroke-width: 2;
}

/* ── LOADING SPINNER ── */
.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--bg);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── FOOTER ── */
.login-footer {
  margin-top: 32px;
  text-align: center;
}
.footer-text {
  font-size: 13px;
  color: var(--text-secondary);
}
.footer-link {
  background: none;
  border: none;
  color: var(--text-primary);
  font-family: 'Syne', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
  padding: 0 2px;
  transition: opacity 0.15s;
}
.footer-link:hover {
  opacity: 0.7;
}
`;

// ── SoundLab Logo SVG ──
const SoundLabLogo = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="12" fill="#f0ede8"/>
    <path d="M14 24C14 18.477 18.477 14 24 14C29.523 14 34 18.477 34 24" stroke="#0b0b0b" strokeWidth="3" strokeLinecap="round"/>
    <path d="M18 24C18 20.686 20.686 18 24 18C27.314 18 30 20.686 30 24" stroke="#0b0b0b" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="24" cy="24" r="3" fill="#0b0b0b"/>
    <path d="M24 27V34" stroke="#0b0b0b" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M20 31H28" stroke="#0b0b0b" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const token = useAuthStore((state) => state.token);

  // Редирект если уже авторизован
  useEffect(() => {
    if (token) {
      navigate('/dashboard');
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <style>{css}</style>

      {/* Ambient Background */}
      <div className="login-ambient">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-orb ambient-orb-3" />
      </div>
      <div className="login-noise" />
      <div className="login-grid-bg" />

            <div className="login-card">
        <div className="login-header">
          <div className="login-brand">
            <div className="brand-logo">
              <img src="/soundlab.svg" alt="SoundLab" />
            </div>
            <span className="brand-name">SoundLab</span>
          </div>
          <div className="login-subtitle">Вход в аккаунт</div>
        </div>

        {/* Error */}
        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <div className="input-wrap">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="your@email.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Пароль</label>
            <div className="input-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Введите пароль"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? (
              <>
                <div className="btn-spinner" />
                Вход...
              </>
            ) : (
              <>
                <LogIn size={16} />
                Войти
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="login-footer">
          <p className="footer-text">
            Нет аккаунта?{' '}
            <button
              onClick={() => navigate('/register')}
              className="footer-link"
            >
              Создать
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}