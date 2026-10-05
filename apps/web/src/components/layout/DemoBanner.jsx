import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Database, FlaskConical, RefreshCw, RotateCcw } from 'lucide-react';
import { demoActions } from '../../features/demo/demoSlice';
import { usePermission } from '../../hooks';
import { formatDate, formatDateTime } from '../../lib/format';
import { ConfirmDialog } from '../ui';

/** Seed status pill: shows seed version, anchor date and serving instance. */
export function SeedStatusIndicator({ compact = false }) {
  const status = useSelector((state) => state.demo.status);
  const loading = useSelector((state) => state.demo.loading);
  const error = useSelector((state) => state.demo.error);
  const tone = error ? 'bg-rose-400' : loading && !status ? 'bg-slate-300' : 'bg-emerald-400';
  const label = error
    ? 'Seed status unavailable'
    : status
      ? `Seed v${status.seedVersion} · ${formatDate(status.anchorDate)}`
      : 'Checking seed…';
  const title = status
    ? `Instance ${status.instanceId} · seeded ${formatDateTime(status.seededAt)} (${status.seedReason}) · ${status.counts.reservations} reservations`
    : undefined;
  return (
    <span className="inline-flex items-center gap-1.5" title={title} aria-live="polite">
      <span className={`h-2 w-2 rounded-full ${tone} ${loading ? 'animate-pulse' : ''}`} aria-hidden />
      <span>{label}</span>
      {!compact && status && <span className="hidden text-amber-900/60 md:inline">· instance {status.instanceId}</span>}
    </span>
  );
}

/** Persistent banner that makes the temporary nature of demo data explicit. */
export function DemoBanner() {
  const dispatch = useDispatch();
  const allowed = usePermission();
  const pendingAction = useSelector((state) => state.demo.pendingAction);
  const notice = useSelector((state) => state.demo.notice);
  const [confirm, setConfirm] = useState(null);

  const run = () => {
    dispatch(confirm === 'reset' ? demoActions.resetRequest() : demoActions.reloadRequest());
    setConfirm(null);
  };

  return (
    <div className="border-b border-amber-200 bg-amber-50 text-amber-900">
      <div className="flex flex-col gap-2 px-4 py-2 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-200/70 px-2 py-0.5 font-bold tracking-wider">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden /> DEMO MODE
          </span>
          <span className="inline-flex items-center gap-1">
            <Database className="h-3.5 w-3.5" aria-hidden /> Using seeded in-memory data. Changes may reset at any time.
          </span>
          <SeedStatusIndicator />
        </div>
        {allowed('demo:manage') && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirm('reload')}
              disabled={Boolean(pendingAction)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium hover:bg-amber-100 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${pendingAction === 'reload' ? 'animate-spin' : ''}`} aria-hidden /> Reload seed data
            </button>
            <button
              type="button"
              onClick={() => setConfirm('reset')}
              disabled={Boolean(pendingAction)}
              className="inline-flex items-center gap-1 rounded-md bg-amber-200/60 px-2 py-1 font-medium hover:bg-amber-200 disabled:opacity-50"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${pendingAction === 'reset' ? 'animate-spin' : ''}`} aria-hidden /> Reset demo data
            </button>
          </div>
        )}
      </div>
      {notice && <p className="border-t border-amber-200 px-4 py-1.5 text-xs sm:px-6">{notice}</p>}
      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={run}
        tone="warning"
        title={confirm === 'reset' ? 'Reset demo data?' : 'Reload seed data?'}
        confirmLabel={confirm === 'reset' ? 'Reset data' : 'Reload seed'}
        message={
          confirm === 'reset'
            ? 'All changes made on this server instance will be discarded and the original seed restored.'
            : 'The seed will be regenerated relative to today so arrivals, departures and charts line up with the current date. All changes will be discarded.'
        }
      />
    </div>
  );
}
