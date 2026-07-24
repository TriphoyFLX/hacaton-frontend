import type { CSSProperties } from 'react';

/** Telegram-style star badge for active Platinum users. */
export default function PlatinumBadge({
  plan,
  planExpiresAt,
  role,
  className = '',
  size = 14,
}: {
  plan?: string | null;
  planExpiresAt?: string | Date | null;
  role?: string | null;
  className?: string;
  size?: number;
}) {
  if (!isPlatinumUser({ plan, planExpiresAt, role })) return null;

  return (
    <span
      className={className}
      title="SoundLab Platinum"
      aria-label="Platinum"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 5,
        width: size + 4,
        height: size + 4,
        borderRadius: '50%',
        background: 'linear-gradient(145deg, #f6e27a 0%, #e8b84a 42%, #c48a2a 100%)',
        boxShadow: '0 0 0 1px rgba(255, 220, 140, 0.35), 0 2px 8px rgba(196, 138, 42, 0.35)',
        verticalAlign: 'middle',
        flexShrink: 0,
      }}
    >
      <svg
        width={size - 2}
        height={size - 2}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M12 2.6l2.6 6.3 6.8.6-5.2 4.5 1.6 6.6L12 17.2 6.2 20.6l1.6-6.6L2.6 9.5l6.8-.6L12 2.6z"
          fill="#1a1205"
        />
      </svg>
    </span>
  );
}

export function isPlatinumUser(user?: {
  plan?: string | null;
  planExpiresAt?: string | Date | null;
  role?: string | null;
} | null): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (user.plan !== 'PLATINUM') return false;
  if (user.planExpiresAt) {
    const expires =
      user.planExpiresAt instanceof Date
        ? user.planExpiresAt
        : new Date(user.planExpiresAt);
    if (!Number.isNaN(expires.getTime()) && expires < new Date()) return false;
  }
  return true;
}

/** Shared CSS for platinum avatar rings / name accents. Inject once per page. */
export const PLATINUM_PROFILE_CSS = `
.pt-avatar-ring {
  position: relative;
  display: inline-flex;
  padding: 3px;
  border-radius: 18px;
  background: linear-gradient(135deg, #f6e27a 0%, #e8b84a 35%, #9b7fd4 70%, #e8b4d8 100%);
  background-size: 200% 200%;
  animation: pt-ring-shift 6s ease-in-out infinite;
  box-shadow: 0 0 24px rgba(232, 184, 74, 0.22);
}
.pt-avatar-ring > * {
  border-radius: 15px !important;
  border-color: transparent !important;
}
.pt-name {
  background: linear-gradient(100deg, #f6e27a 0%, #f0ede8 45%, #e8b4d8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.pt-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: 8px;
  padding: 2px 8px 2px 6px;
  border-radius: 999px;
  font-family: 'DM Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #1a1205;
  background: linear-gradient(135deg, #f6e27a, #e8b84a);
  vertical-align: middle;
  font-weight: 600;
}
@keyframes pt-ring-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
`;

export function platinumNameStyle(active: boolean): CSSProperties | undefined {
  if (!active) return undefined;
  return {
    background: 'linear-gradient(100deg, #f6e27a 0%, #f0ede8 45%, #e8b4d8 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  };
}
