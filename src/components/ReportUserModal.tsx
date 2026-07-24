import { useEffect, useId, useRef, useState } from 'react';
import { Flag, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import {
  REPORT_REASON_OPTIONS,
  mapReportApiError,
  reportsApi,
  type ReportReason,
} from '../api/reports';

const css = `
.report-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 12px;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-family: 'Syne', sans-serif;
}
@media (min-width: 640px) {
  .report-overlay { align-items: center; padding: 20px; }
}
.report-card {
  width: 100%;
  max-width: 440px;
  max-height: min(92dvh, 720px);
  overflow: auto;
  border-radius: 18px 18px 14px 14px;
  border: 1px solid #2a2a2a;
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(192, 57, 43, 0.14), transparent 50%),
    #121212;
  color: #f0ede8;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
}
@media (min-width: 640px) {
  .report-card { border-radius: 16px; }
}
.report-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 0;
}
.report-title-wrap { min-width: 0; }
.report-kicker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font: 11px/1 'DM Mono', monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #c07068;
}
.report-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.25;
}
.report-sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: #8a8680;
  line-height: 1.4;
}
.report-close {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border: 1px solid #2e2e2e;
  border-radius: 10px;
  background: transparent;
  color: #8a8680;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.report-close:hover { color: #f0ede8; background: #1a1a1a; }
.report-body { padding: 16px 18px 18px; }
.report-label {
  display: block;
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: #a8a49c;
}
.report-reasons {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
}
.report-reason {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #2a2a2a;
  background: #0e0e0e;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.report-reason:hover { border-color: #3a3a3a; background: #151515; }
.report-reason.active {
  border-color: rgba(192, 57, 43, 0.55);
  background: rgba(192, 57, 43, 0.1);
}
.report-reason-radio {
  width: 16px;
  height: 16px;
  margin-top: 2px;
  border-radius: 999px;
  border: 1.5px solid #555;
  flex-shrink: 0;
  display: grid;
  place-items: center;
}
.report-reason.active .report-reason-radio {
  border-color: #c0392b;
}
.report-reason.active .report-reason-radio::after {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #c0392b;
}
.report-reason-label { font-size: 14px; font-weight: 600; }
.report-reason-hint { margin-top: 2px; font-size: 12px; color: #7a766f; line-height: 1.35; }
.report-textarea {
  width: 100%;
  min-height: 96px;
  padding: 11px 12px;
  border-radius: 12px;
  border: 1px solid #2a2a2a;
  background: #0e0e0e;
  color: #f0ede8;
  font: 14px/1.45 'Syne', sans-serif;
  resize: vertical;
  box-sizing: border-box;
  outline: none;
}
.report-textarea:focus { border-color: #4a4a4a; }
.report-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  margin-bottom: 12px;
  font-size: 11px;
  color: #6b675f;
}
.report-error {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(192, 57, 43, 0.35);
  background: rgba(192, 57, 43, 0.1);
  color: #f0a8a0;
  font-size: 13px;
  line-height: 1.4;
}
.report-submit {
  width: 100%;
  padding: 12px 14px;
  border: 0;
  border-radius: 12px;
  background: #c0392b;
  color: #fff;
  font: 600 14px 'Syne', sans-serif;
  cursor: pointer;
}
.report-submit:disabled { opacity: 0.45; cursor: not-allowed; }
.report-submit:not(:disabled):hover { background: #a93226; }
.report-done {
  text-align: center;
  padding: 12px 4px 4px;
}
.report-done-icon {
  width: 52px;
  height: 52px;
  margin: 0 auto 12px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(39, 174, 96, 0.14);
  color: #6dca8f;
}
.report-done h3 {
  margin: 0 0 8px;
  font-size: 18px;
}
.report-done p {
  margin: 0 0 16px;
  color: #8a8680;
  font-size: 13px;
  line-height: 1.45;
}
.report-secondary {
  width: 100%;
  padding: 11px 14px;
  border-radius: 12px;
  border: 1px solid #2e2e2e;
  background: #e8e4dc;
  color: #111;
  font: 600 14px 'Syne', sans-serif;
  cursor: pointer;
}
`;

export default function ReportUserModal({
  open,
  onClose,
  reportedUserId,
  reportedUsername,
}: {
  open: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedUsername: string;
}) {
  const titleId = useId();
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const [reason, setReason] = useState<ReportReason>('BULLYING');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const selected = REPORT_REASON_OPTIONS.find((opt) => opt.id === reason) || REPORT_REASON_OPTIONS[0];
  const detailsRequired = Boolean(selected.detailsRequired);
  const detailsOk = !detailsRequired || details.trim().length >= 12;

  useEffect(() => {
    if (!open) return;
    setReason('BULLYING');
    setDetails('');
    setLoading(false);
    setError('');
    setDone(false);
    const t = window.setTimeout(() => firstFocusRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, reportedUserId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  const submit = async () => {
    if (!detailsOk) {
      setError('Кратко опишите ситуацию (хотя бы пару предложений).');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await reportsApi.create({
        reportedUserId,
        reason,
        details: details.trim() || undefined,
      });
      setDone(true);
    } catch (e: unknown) {
      setError(mapReportApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="report-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <style>{css}</style>
      <div
        className="report-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="report-head">
          <div className="report-title-wrap">
            <div className="report-kicker">
              <ShieldAlert size={12} />
              Безопасность
            </div>
            <h2 id={titleId} className="report-title">
              Жалоба на @{reportedUsername}
            </h2>
            <p className="report-sub">
              Модераторы проверят обращение. Ложные жалобы могут ограничить ваш аккаунт.
            </p>
          </div>
          <button
            ref={firstFocusRef}
            type="button"
            className="report-close"
            onClick={onClose}
            aria-label="Закрыть"
            disabled={loading}
          >
            <X size={16} />
          </button>
        </div>

        <div className="report-body">
          {done ? (
            <div className="report-done">
              <div className="report-done-icon" aria-hidden>
                <CheckCircle2 size={26} />
              </div>
              <h3>Жалоба отправлена</h3>
              <p>
                Спасибо. Мы разберём ситуацию и примем меры, если правила сообщества нарушены.
              </p>
              <button type="button" className="report-secondary" onClick={onClose}>
                Готово
              </button>
            </div>
          ) : (
            <>
              <span className="report-label">Причина</span>
              <div className="report-reasons" role="radiogroup" aria-label="Причина жалобы">
                {REPORT_REASON_OPTIONS.map((opt) => {
                  const active = reason === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`report-reason${active ? ' active' : ''}`}
                      onClick={() => {
                        setReason(opt.id);
                        setError('');
                      }}
                    >
                      <span className="report-reason-radio" aria-hidden />
                      <span>
                        <div className="report-reason-label">{opt.label}</div>
                        <div className="report-reason-hint">{opt.hint}</div>
                      </span>
                    </button>
                  );
                })}
              </div>

              <label className="report-label" htmlFor="report-details">
                Подробности{detailsRequired ? ' (обязательно)' : ' (по желанию)'}
              </label>
              <textarea
                id="report-details"
                className="report-textarea"
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
                placeholder={
                  detailsRequired
                    ? 'Расскажите, что произошло, со ссылками или примерами…'
                    : 'Дополнительный контекст поможет модерации…'
                }
                rows={4}
              />
              <div className="report-meta">
                <span>{detailsRequired ? 'Минимум ~12 символов' : 'Поможет быстрее разобрать кейс'}</span>
                <span>{details.length}/1000</span>
              </div>

              {error && <div className="report-error" role="alert">{error}</div>}

              <button
                type="button"
                className="report-submit"
                disabled={loading || !detailsOk}
                onClick={() => void submit()}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Flag size={15} />
                  {loading ? 'Отправка…' : 'Отправить жалобу'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
