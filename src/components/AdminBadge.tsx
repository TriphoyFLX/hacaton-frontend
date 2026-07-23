import { ShieldCheck } from 'lucide-react';

/** Small badge shown next to admin usernames across the app. */
export default function AdminBadge({
  role,
  className = '',
  size = 14,
}: {
  role?: string | null;
  className?: string;
  size?: number;
}) {
  if (role !== 'ADMIN') return null;

  return (
    <span
      className={className}
      title="Администратор SoundLab"
      aria-label="Администратор"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        marginLeft: 6,
        padding: '1px 7px',
        borderRadius: 999,
        fontSize: Math.max(10, size - 2),
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: '#0b0b0b',
        background: 'linear-gradient(135deg, #e8e4dc 0%, #c5b89a 100%)',
        verticalAlign: 'middle',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      <ShieldCheck size={size - 2} strokeWidth={2.4} />
      Admin
    </span>
  );
}
