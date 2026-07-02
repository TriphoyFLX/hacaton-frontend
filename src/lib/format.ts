export function formatCount(n: number): string {
  if (n < 0) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const val = n / 1000;
    return val >= 10 ? `${Math.floor(val)}K` : `${val.toFixed(1).replace(/\.0$/, '')}K`;
  }
  const val = n / 1_000_000;
  return val >= 10 ? `${Math.floor(val)}M` : `${val.toFixed(1).replace(/\.0$/, '')}M`;
}

export function pluralizeComments(n: number): string {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'комментариев';
  if (mod10 === 1) return 'комментарий';
  if (mod10 >= 2 && mod10 <= 4) return 'комментария';
  return 'комментариев';
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSec < 60) return 'только что';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} мин`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ч`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} д`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
