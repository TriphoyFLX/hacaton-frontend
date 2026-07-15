import { useEffect } from 'react';
import { AlertTriangle, Ban, ShieldOff } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  loading?: boolean;
  icon?: 'ban' | 'unblock' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

const css = `
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(6px);
  animation: confirm-fade-in 0.2s ease;
}
@keyframes confirm-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.confirm-dialog {
  width: 100%;
  max-width: 400px;
  background: #111111;
  border: 1px solid #2e2e2e;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
  animation: confirm-slide-in 0.22s ease;
}
@keyframes confirm-slide-in {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.confirm-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.confirm-icon-wrap.danger {
  background: rgba(192, 57, 43, 0.14);
  border: 1px solid rgba(192, 57, 43, 0.3);
  color: #e88a82;
}
.confirm-icon-wrap.default {
  background: #181818;
  border: 1px solid #2e2e2e;
  color: #c5c0b8;
}
.confirm-title {
  font-family: 'Syne', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #f0ede8;
  letter-spacing: -0.02em;
  margin-bottom: 8px;
}
.confirm-message {
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  line-height: 1.55;
  color: #8a8a8a;
  margin-bottom: 24px;
}
.confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
.confirm-btn {
  height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  font-family: 'Syne', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}
.confirm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.confirm-btn-cancel {
  background: transparent;
  border-color: #2e2e2e;
  color: #c5c0b8;
}
.confirm-btn-cancel:hover:not(:disabled) {
  background: #181818;
  border-color: #3d3d3d;
  color: #f0ede8;
}
.confirm-btn-danger {
  background: rgba(192, 57, 43, 0.18);
  border-color: rgba(192, 57, 43, 0.45);
  color: #f0a8a2;
}
.confirm-btn-danger:hover:not(:disabled) {
  background: rgba(192, 57, 43, 0.28);
  border-color: rgba(192, 57, 43, 0.65);
}
.confirm-btn-primary {
  background: #f0ede8;
  border-color: #f0ede8;
  color: #0b0b0b;
}
.confirm-btn-primary:hover:not(:disabled) {
  background: #e8e4dc;
}
`;

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  variant = 'default',
  loading = false,
  icon = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  const Icon = icon === 'ban' ? Ban : icon === 'unblock' ? ShieldOff : AlertTriangle;

  return (
    <div className="confirm-overlay" onClick={loading ? undefined : onCancel}>
      <style>{css}</style>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`confirm-icon-wrap ${variant}`}>
          <Icon size={22} />
        </div>
        <h2 id="confirm-title" className="confirm-title">{title}</h2>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button
            type="button"
            className="confirm-btn confirm-btn-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-btn ${variant === 'danger' ? 'confirm-btn-danger' : 'confirm-btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Подождите...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
