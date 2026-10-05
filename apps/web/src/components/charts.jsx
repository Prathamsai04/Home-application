import { ResponsiveContainer } from 'recharts';

export const CHART_COLORS = {
  brand: '#168072',
  brandLight: '#7bd5c2',
  amber: '#f59e0b',
  sky: '#0ea5e9',
  violet: '#8b5cf6',
  rose: '#f43f5e',
  slate: '#94a3b8',
  emerald: '#10b981',
};

export const PIE_COLORS = ['#168072', '#0ea5e9', '#f59e0b', '#8b5cf6', '#f43f5e', '#10b981', '#64748b'];

export const axisProps = {
  tick: { fontSize: 11, fill: '#64748b' },
  tickLine: false,
  axisLine: false,
};

export const tooltipStyle = {
  contentStyle: { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.08)' },
};

/** Fixed-height responsive chart wrapper. */
export function ChartFrame({ height = 260, children, label }) {
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
