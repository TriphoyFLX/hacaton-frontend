import { useState } from 'react';
import { useAuthStore } from '../store/authStore';

const css = `
.verify-box { margin-top: 8px; }
.verify-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}
.verify-hint {
  font-size: 13px;
  color: #6b6b6b;
  margin-bottom: 20px;
  line-height: 1.5;
}
.verify-hint strong { color: #c5c0b8; }
.verify-code-input {
  width: 100%;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid #2e2e2e;
  background: #151515;
  color: #f0ede8;
  font-size: 22px;
  letter-spacing: 10px;
  text-align: center;
  font-family: 'DM Mono', monospace;
  outline: none;
  box-sizing: border-box;
}
.verify-code-input:focus { border-color: #555; }
.verify-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}
.verify-btn {
  width: 100%;
  padding: 12px 16px;
  border-radius: 10px;
  border: none;
  background: #e8e4dc;
  color: #0b0b0b;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  font-family: inherit;
}
.verify-btn:disabled { opacity: 0.5; cursor: default; }
.verify-link {
  background: none;
  border: none;
  color: #6b6b6b;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  padding: 8px;
}
.verify-link:hover { color: #c5c0b8; }
.verify-error {
  background: #1a0f0f;
  border: 1px solid #3d1a1a;
  color: #e07070;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 14px;
}
`;

export default function EmailVerifyStep({
  email,
  onBack,
}: {
  email: string;
  onBack?: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const verifyEmail = useAuthStore((s) => s.verifyEmail);
  const resendCode = useAuthStore((s) => s.resendCode);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyEmail(email, code.trim());
    } catch (err: any) {
      setError(err.response?.data?.error || 'Неверный код');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setResent(false);
    try {
      await resendCode(email);
      setResent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Не удалось отправить код');
    }
  };

  return (
    <div className="verify-box">
      <style>{css}</style>
      <div className="verify-title">Подтвердите email</div>
      <div className="verify-hint">
        Мы отправили 6-значный код на <strong>{email}</strong>.
        Введите его, чтобы активировать аккаунт.
      </div>
      {error && <div className="verify-error">{error}</div>}
      <form onSubmit={handleVerify}>
        <input
          className="verify-code-input"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          minLength={6}
          maxLength={6}
        />
        <div className="verify-actions">
          <button type="submit" className="verify-btn" disabled={loading || code.length !== 6}>
            {loading ? 'Проверяем…' : 'Подтвердить'}
          </button>
          <button type="button" className="verify-link" onClick={handleResend}>
            {resent ? 'Код отправлен ещё раз' : 'Отправить код повторно'}
          </button>
          {onBack && (
            <button type="button" className="verify-link" onClick={onBack}>
              Назад
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
