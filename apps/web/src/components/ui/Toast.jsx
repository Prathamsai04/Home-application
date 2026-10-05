import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { dismissToast } from '../../features/ui/uiSlice';

const STYLES = {
  success: { icon: CheckCircle2, className: 'text-emerald-600' },
  error: { icon: AlertCircle, className: 'text-rose-600' },
  warning: { icon: TriangleAlert, className: 'text-amber-600' },
  info: { icon: Info, className: 'text-sky-600' },
};

export function Toast({ toast, onDismiss, duration = 4500 }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss, duration]);
  const style = STYLES[toast.type] ?? STYLES.info;
  const Icon = style.icon;
  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className="animate-toast-in pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg"
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.className}`} aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        {toast.title && <p className="font-medium text-slate-900">{toast.title}</p>}
        <p className="text-slate-600">{toast.message}</p>
      </div>
      <button type="button" onClick={() => onDismiss(toast.id)} className="rounded p-0.5 text-slate-400 hover:text-slate-600" aria-label="Dismiss notification">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const dispatch = useDispatch();
  const toasts = useSelector((state) => state.ui.toasts);
  const onDismiss = useCallback((id) => dispatch(dismissToast(id)), [dispatch]);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:bottom-4 sm:right-4 sm:left-auto sm:w-96 sm:items-end">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
