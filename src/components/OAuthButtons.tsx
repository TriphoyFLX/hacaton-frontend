import { useEffect, useState } from 'react';
import { authApi } from '../api/auth';

const oauthCss = `
.oauth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0 16px;
  color: #555;
  font-size: 12px;
  letter-spacing: 0.5px;
}
.oauth-divider::before,
.oauth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #2a2a2a;
}
.oauth-btns {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.oauth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid #2e2e2e;
  background: #151515;
  color: #f0ede8;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.oauth-btn:hover {
  border-color: #444;
  background: #1a1a1a;
}
.oauth-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.oauth-btn svg {
  flex-shrink: 0;
}
`;

export default function OAuthButtons() {
  const [providers, setProviders] = useState({ google: false, vk: false });

  useEffect(() => {
    authApi.getProviders()
      .then((r) => setProviders(r.data))
      .catch(() => setProviders({ google: false, vk: false }));
  }, []);

  if (!providers.google && !providers.vk) {
    return null;
  }

  return (
    <>
      <style>{oauthCss}</style>
      <div className="oauth-divider">или</div>
      <div className="oauth-btns">
        {providers.google && (
          <button
            type="button"
            className="oauth-btn"
            onClick={() => { window.location.href = authApi.googleUrl(); }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.0.0 6.2 5.2C39.2 36.9 44 32 44 24c0-1.3-.1-2.5-.4-3.5z"/>
            </svg>
            Войти через Google
          </button>
        )}
        {providers.vk && (
          <button
            type="button"
            className="oauth-btn"
            onClick={() => { window.location.href = authApi.vkUrl(); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#0077FF">
              <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.587-1.496c.596-.19 1.363 1.26 2.174 1.816.613.42 1.078.328 1.078.328l2.163-.03s1.13-.07.594-.958c-.044-.072-.312-.656-1.606-1.855-1.355-1.255-1.173-.052.458-2.574.995-1.538 1.393-2.477 1.268-2.877-.119-.381-.853-.28-.853-.28l-2.434.015s-.18-.025-.314.055c-.13.078-.214.26-.214.26s-.383.99-.893 1.832c-1.076 1.777-1.507 1.872-1.683 1.762-.41-.256-.307-1.001-.307-1.535 0-1.668.253-2.361-.493-2.541-.247-.06-.429-.1-1.061-.106-.812-.008-1.5.003-1.889.197-.26.13-.46.418-.338.435.151.021.493.093.675.34.234.32.225 1.037.225 1.037s.134 1.965-.314 2.208c-.307.167-.728-.174-1.633-1.736-.463-.8-.813-1.684-.813-1.684s-.067-.165-.187-.254c-.145-.108-.348-.142-.348-.142l-2.313.015s-.347.01-.475.16c-.114.134-.009.41-.009.41s1.8 4.215 3.838 6.336c1.868 1.944 3.99 1.816 3.99 1.816h.96z"/>
            </svg>
            Войти через VK
          </button>
        )}
      </div>
    </>
  );
}
