import { useState } from 'react';
import { X } from 'lucide-react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { pwaFeedbackApi, type PwaUninstallReason } from '../api/pwaFeedback';

const REASONS: Array<{ id: PwaUninstallReason; label: string }> = [
  { id: 'bugs', label: 'Были баги / глючило' },
  { id: 'slow', label: 'Работало медленно' },
  { id: 'dont_need', label: 'Пока не нужно' },
  { id: 'prefer_browser', label: 'Удобнее в обычном браузере' },
  { id: 'privacy', label: 'Вопросы к приватности' },
  { id: 'other', label: 'Другое' },
];

const css = `
.pwa-fb-overlay {
  position: fixed;
  inset: 0;
  z-index: 140;
  background: rgba(0,0,0,0.62);
  display: grid;
  place-items: center;
  padding: 16px;
}
.pwa-fb-modal {
  width: min(440px, 100%);
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.1);
  background: #141414;
  color: #f0ede8;
  box-shadow: 0 24px 64px rgba(0,0,0,0.55);
  font-family: 'Syne', system-ui, sans-serif;
  padding: 18px 18px 16px;
}
.pwa-fb-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.pwa-fb-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.pwa-fb-sub {
  margin: 0 0 14px;
  color: rgba(240,237,232,0.55);
  font-size: 13px;
  line-height: 1.45;
}
.pwa-fb-close {
  border: 0;
  background: transparent;
  color: rgba(240,237,232,0.45);
  cursor: pointer;
  padding: 2px;
}
.pwa-fb-close:hover { color: #f0ede8; }
.pwa-fb-reasons {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}
.pwa-fb-reason {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  background: transparent;
  color: #f0ede8;
  padding: 10px 12px;
  cursor: pointer;
  font: 13px 'Syne', system-ui, sans-serif;
}
.pwa-fb-reason:hover { background: rgba(255,255,255,0.04); }
.pwa-fb-reason.active {
  border-color: rgba(240,237,232,0.35);
  background: rgba(240,237,232,0.08);
}
.pwa-fb-radio {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid rgba(240,237,232,0.35);
  flex-shrink: 0;
  position: relative;
}
.pwa-fb-reason.active .pwa-fb-radio::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: #f0ede8;
}
.pwa-fb-textarea {
  width: 100%;
  min-height: 84px;
  resize: vertical;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: #0f0f0f;
  color: #f0ede8;
  padding: 10px 12px;
  font: 13px 'Syne', system-ui, sans-serif;
  outline: none;
  margin-bottom: 12px;
  box-sizing: border-box;
}
.pwa-fb-textarea:focus { border-color: rgba(240,237,232,0.28); }
.pwa-fb-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.pwa-fb-btn {
  border: 0;
  border-radius: 9px;
  padding: 9px 14px;
  font: 700 12px 'Syne', system-ui, sans-serif;
  cursor: pointer;
}
.pwa-fb-btn.ghost {
  background: transparent;
  color: rgba(240,237,232,0.55);
}
.pwa-fb-btn.primary {
  background: #f0ede8;
  color: #0a0a0a;
}
.pwa-fb-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.pwa-fb-error {
  margin: 0 0 10px;
  color: #f5a9a3;
  font-size: 12px;
}
.pwa-fb-thanks {
  margin: 8px 0 4px;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(240,237,232,0.75);
}
`;

/**
 * Shown once on a device after we detect the PWA was uninstalled.
 */
export default function PwaUninstallFeedbackModal() {
  const { ready, uninstallFeedbackPending, clearUninstallFeedback } = usePwaInstall();
  const [reason, setReason] = useState<PwaUninstallReason | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  if (!ready || !uninstallFeedbackPending) return null;

  const close = () => {
    clearUninstallFeedback();
  };

  const submit = async () => {
    if (!reason || sending) return;
    setSending(true);
    setError('');
    try {
      await pwaFeedbackApi.submitUninstallFeedback({
        reason,
        details: details.trim() || undefined,
      });
      setSent(true);
      window.setTimeout(close, 1600);
    } catch {
      setError('Не удалось отправить. Можно закрыть и попробовать позже.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <style>{css}</style>
      <div className="pwa-fb-overlay" role="dialog" aria-modal="true" aria-label="Отзыв об удалении SoundLab">
        <div className="pwa-fb-modal">
          <div className="pwa-fb-head">
            <h2 className="pwa-fb-title">Вы удалили приложение SoundLab</h2>
            <button type="button" className="pwa-fb-close" aria-label="Закрыть" onClick={close}>
              <X size={16} />
            </button>
          </div>

          {sent ? (
            <p className="pwa-fb-thanks">Спасибо за отзыв — мы получили его на почту и учтём.</p>
          ) : (
            <>
              <p className="pwa-fb-sub">
                Если удобно, расскажите почему — это поможет сделать SoundLab лучше. Можно пропустить.
              </p>

              <div className="pwa-fb-reasons">
                {REASONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`pwa-fb-reason${reason === item.id ? ' active' : ''}`}
                    onClick={() => setReason(item.id)}
                  >
                    <span className="pwa-fb-radio" />
                    {item.label}
                  </button>
                ))}
              </div>

              <textarea
                className="pwa-fb-textarea"
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
                placeholder="Подробности (необязательно)…"
                maxLength={1000}
              />

              {error && <p className="pwa-fb-error">{error}</p>}

              <div className="pwa-fb-actions">
                <button type="button" className="pwa-fb-btn ghost" onClick={close} disabled={sending}>
                  Пропустить
                </button>
                <button
                  type="button"
                  className="pwa-fb-btn primary"
                  onClick={() => void submit()}
                  disabled={!reason || sending}
                >
                  {sending ? 'Отправка…' : 'Отправить отзыв'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
