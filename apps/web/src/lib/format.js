import { formatMoney, fromMinorUnits, humanize } from '@homestay/shared';

export { formatMoney, fromMinorUnits, humanize };

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const shortDateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** Formats an ISO calendar date (YYYY-MM-DD) without time zone drift. */
export function formatDate(isoDate) {
  if (!isoDate) return '—';
  return dateFormatter.format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));
}

export function formatShortDate(isoDate) {
  if (!isoDate) return '—';
  return shortDateFormatter.format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));
}

export function formatDateTime(instant) {
  if (!instant) return '—';
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
}

export function timeAgo(instant, now = Date.now()) {
  if (!instant) return '';
  const seconds = Math.round((now - new Date(instant).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDateTime(instant);
}

/** Compact currency for chart axes (display only, e.g. "₹1.2L"). */
export function formatCompactMoney(minor, currency = 'INR') {
  const major = Math.trunc((minor ?? 0) / 100);
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(major);
}

export function formatPercent(value) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

/** ISO date of "today" in the browser's local calendar. */
export function localToday() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
