import { humanize } from '@homestay/shared';

const TONES = {
  gray: 'bg-slate-100 text-slate-700 ring-slate-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200',
};

const STATUS_TONES = {
  available: 'green',
  occupied: 'blue',
  reserved: 'violet',
  cleaning: 'amber',
  maintenance: 'red',
  pending: 'amber',
  confirmed: 'brand',
  checked_in: 'blue',
  checked_out: 'gray',
  cancelled: 'red',
  no_show: 'red',
  unpaid: 'red',
  partially_paid: 'amber',
  paid: 'green',
  refunded: 'violet',
  in_progress: 'blue',
  completed: 'green',
  open: 'red',
  assigned: 'amber',
  resolved: 'green',
  active: 'green',
  inactive: 'gray',
  low: 'gray',
  medium: 'blue',
  high: 'amber',
  urgent: 'red',
  payment: 'green',
  refund: 'violet',
  owner: 'violet',
  manager: 'brand',
  staff: 'blue',
  info: 'blue',
  success: 'green',
  warning: 'amber',
  critical: 'red',
};

export function Badge({ tone = 'gray', children, className = '', dot = false, title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/** Badge whose color and label are derived from a domain status value. */
export function StatusBadge({ status, title, dot = true }) {
  return (
    <Badge tone={STATUS_TONES[status] ?? 'gray'} dot={dot} title={title}>
      {humanize(status)}
    </Badge>
  );
}
