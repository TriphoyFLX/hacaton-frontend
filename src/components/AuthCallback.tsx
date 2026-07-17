import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import { setAuthToken } from '../lib/authToken';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Нет токена авторизации');
      return;
    }

    (async () => {
      try {
        setAuthToken(token);
        const { data: user } = await authApi.getMe();
        setSession(user, token);
        navigate('/dashboard', { replace: true });
      } catch {
        setError('Не удалось войти через соцсеть');
      }
    })();
  }, [searchParams, setSession, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0b0b0b',
      color: '#f0ede8',
      fontFamily: 'Syne, sans-serif',
    }}>
      {error ? (
        <div style={{ textAlign: 'center' }}>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{
              marginTop: 16,
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid #333',
              background: '#181818',
              color: '#f0ede8',
              cursor: 'pointer',
            }}
          >
            На страницу входа
          </button>
        </div>
      ) : (
        <p>Входим…</p>
      )}
    </div>
  );
}
