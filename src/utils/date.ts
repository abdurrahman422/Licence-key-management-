export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const pad = (n: number) => (n < 10 ? `0${n}` : n);
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());
    return `${year}-${month}-${day} ${hours}:${mins}`;
  } catch {
    return dateString || '—';
  }
}

export function formatTimeAgo(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return '';
  }
}

export function getExpiryBadge(expiryDate: string | null | undefined, status: string): {
  label: string;
  colorClass: string;
  daysRemaining: number | null;
} {
  if (status === 'CANCELLED') {
    return { label: 'Cancelled', colorClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20', daysRemaining: null };
  }
  if (status === 'EXPIRED') {
    return { label: 'Expired', colorClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20', daysRemaining: 0 };
  }
  if (status === 'AVAILABLE') {
    return { label: 'Available', colorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', daysRemaining: null };
  }
  if (!expiryDate) {
    return { label: status, colorClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20', daysRemaining: null };
  }

  const now = new Date().getTime();
  const exp = new Date(expiryDate).getTime();
  const diffMs = exp - now;
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days <= 0) {
    return { label: 'Expired', colorClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20', daysRemaining: 0 };
  }
  if (days === 1) {
    return { label: 'Expires Today', colorClass: 'bg-red-500/15 text-red-400 border-red-500/30', daysRemaining: 1 };
  }
  if (days <= 3) {
    return { label: `Expires in ${days}d`, colorClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30', daysRemaining: days };
  }
  if (days <= 7) {
    return { label: `${days} days left`, colorClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30', daysRemaining: days };
  }

  return { label: `${days} days left`, colorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', daysRemaining: days };
}
