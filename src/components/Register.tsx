import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Eye, EyeOff, UserPlus, Calendar } from 'lucide-react';

// ── Styles ──
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');`;

const css = `
${FONT_IMPORT}

.register-root {
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
  --green: #27ae60;
  --green-dim: #0f1a14;
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
.register-ambient {
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
  right: -150px;
  animation-delay: 0s;
}
.ambient-orb-2 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(197, 192, 184, 0.25) 0%, transparent 70%);
  bottom: -250px;
  left: -150px;
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
.register-noise {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.02;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px;
}
.register-grid-bg {
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
.register-card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 440px;
  margin: 20px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 48px 40px;
  max-height: 90vh;
  overflow-y: auto;
}

/* ── HEADER ── */
.register-header {
  text-align: center;
  margin-bottom: 36px;
}
.register-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 8px;
}
.brand-logo {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}
.brand-logo img {
  width: 100%;
  height: 100%;
  display: block;
}
.brand-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.03em;
}
.register-subtitle {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

/* ── ERROR ── */
.register-error {
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
.register-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
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
.form-input[type="date"] {
  padding-right: 14px;
  color-scheme: dark;
}
.form-input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(0.7);
  cursor: pointer;
}

/* Password toggle */
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

/* Hint */
.form-hint {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.5;
}

/* ── CHECKBOX ── */
.checkbox-group {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 4px 0;
}
.checkbox-input {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  min-width: 18px;
  border: 1px solid var(--border-mid);
  border-radius: 5px;
  background: var(--bg-elevated);
  cursor: pointer;
  position: relative;
  transition: all 0.15s;
  margin-top: 1px;
}
.checkbox-input:checked {
  background: var(--text-primary);
  border-color: var(--text-primary);
}
.checkbox-input:checked::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 5px;
  height: 9px;
  border: solid var(--bg);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.checkbox-input:hover {
  border-color: var(--border-hover);
}
.checkbox-label {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  user-select: none;
}
.checkbox-link {
  background: none;
  border: none;
  color: var(--text-primary);
  font-family: 'Syne', sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
  padding: 0;
  transition: opacity 0.15s;
}
.checkbox-link:hover {
  opacity: 0.7;
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
.register-footer {
  margin-top: 28px;
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

/* ── SCROLLBAR ── */
.register-card::-webkit-scrollbar {
  width: 4px;
}
.register-card::-webkit-scrollbar-track {
  background: transparent;
}
.register-card::-webkit-scrollbar-thumb {
  background: var(--border-mid);
  border-radius: 2px;
}
`;

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
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

    if (!agreedToTerms) {
      setError('Необходимо согласиться с условиями использования');
      return;
    }

    // Валидация возраста (минимум 13 лет)
    if (birthDate) {
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }

      if (age < 13) {
        setError('Вам должно быть не менее 13 лет для регистрации');
        return;
      }
    }

    if (password.length < 8) {
      setError('Пароль должен содержать не менее 8 символов');
      return;
    }

    setLoading(true);

    try {
      await register(username, email, password, birthDate);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-root">
      <style>{css}</style>

      {/* Ambient Background */}
      <div className="register-ambient">
  <div className="ambient-orb ambient-orb-1" />
  <div className="ambient-orb ambient-orb-2" />
  <div className="ambient-orb ambient-orb-3" />
</div>
<div className="register-noise" />
<div className="register-grid-bg" />

<div className="register-card">
  {/* Header */}
  <div className="register-header">
    <div className="register-brand">
      <div className="brand-logo">
        <img src="/soundlab.svg" alt="SoundLab" />
      </div>
      <span className="brand-name">SoundLab</span>
    </div>
    <div className="register-subtitle">Создание аккаунта</div>
  </div>

        {/* Error */}
        {error && (
          <div className="register-error">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="register-form">
          {/* Username */}
          <div className="form-group">
            <label className="form-label" htmlFor="username">Имя пользователя</label>
            <div className="input-wrap">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                placeholder="Придумайте имя"
                minLength={3}
                maxLength={30}
                autoComplete="username"
                required
              />
            </div>
            <span className="form-hint">От 3 до 30 символов</span>
          </div>

          {/* Email */}
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

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">Пароль</label>
            <div className="input-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Минимум 8 символов"
                minLength={8}
                autoComplete="new-password"
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
            <span className="form-hint">Минимум 8 символов</span>
          </div>

          {/* Birth Date */}
          <div className="form-group">
            <label className="form-label" htmlFor="birthdate">Дата рождения</label>
            <div className="input-wrap">
              <input
                id="birthdate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="form-input"
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <span className="form-hint">Вам должно быть не менее 13 лет</span>
          </div>

          {/* Terms Checkbox */}
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="checkbox-input"
              required
            />
            <label htmlFor="terms" className="checkbox-label">
              Я согласен с{' '}
              <button type="button" className="checkbox-link" onClick={() => navigate('/terms')}>
                Условиями использования
              </button>
              {' '}и{' '}
              <button type="button" className="checkbox-link" onClick={() => navigate('/privacy')}>
                Политикой конфиденциальности
              </button>
            </label>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? (
              <>
                <div className="btn-spinner" />
                Создание...
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Создать аккаунт
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="register-footer">
          <p className="footer-text">
            Уже есть аккаунт?{' '}
            <button
              onClick={() => navigate('/login')}
              className="footer-link"
            >
              Войти
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}