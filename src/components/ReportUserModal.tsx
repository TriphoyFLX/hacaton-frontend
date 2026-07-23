import { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { REPORT_REASON_OPTIONS, reportsApi, type ReportReason } from '../api/reports';

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
  const [reason, setReason] = useState<ReportReason>('BULLYING');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!open) return null;

  const submit = async () => {
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
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Не удалось отправить жалобу';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#141414',
          border: '1px solid #2a2a2a',
          borderRadius: 16,
          padding: 20,
          color: '#f0ede8',
          fontFamily: 'Syne, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flag size={18} /> Жалоба на @{reportedUsername}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 0, color: '#888', cursor: 'pointer' }}
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div>
            <p style={{ color: '#9ccc9c', marginTop: 0 }}>Жалоба отправлена. Модераторы проверят её.</p>
            <button
              type="button"
              onClick={onClose}
              style={{
                marginTop: 8,
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: 0,
                background: '#e8e4dc',
                color: '#111',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Закрыть
            </button>
          </div>
        ) : (
          <>
            <label style={{ display: 'block', fontSize: 13, color: '#aaa', marginBottom: 6 }}>Причина</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #333',
                background: '#0f0f0f',
                color: '#f0ede8',
                marginBottom: 12,
              }}
            >
              {REPORT_REASON_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>

            <label style={{ display: 'block', fontSize: 13, color: '#aaa', marginBottom: 6 }}>
              Подробности (необязательно)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
              rows={4}
              placeholder="Опишите, что произошло…"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #333',
                background: '#0f0f0f',
                color: '#f0ede8',
                resize: 'vertical',
                marginBottom: 12,
                boxSizing: 'border-box',
              }}
            />

            {error && (
              <div style={{ color: '#e88', fontSize: 13, marginBottom: 10 }}>{error}</div>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={() => void submit()}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: 0,
                background: loading ? '#444' : '#c0392b',
                color: '#fff',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'Отправка…' : 'Отправить жалобу'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
