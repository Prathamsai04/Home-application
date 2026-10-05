import { forwardRef, useId } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';

const controlBase =
  'block w-full rounded-lg border bg-white text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';
const controlState = (error) =>
  error
    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
    : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100';

/** Label + control + hint/error wrapper with accessible wiring. */
export function FormField({ label, error, hint, required, htmlFor, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-xs text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, error, hint, required, className = '', leftIcon: LeftIcon, id, ...props }, ref) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <FormField label={label} error={error} hint={hint} required={required} htmlFor={inputId} className={className}>
      <div className="relative">
        {LeftIcon && <LeftIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`${controlBase} ${controlState(error)} h-10 ${LeftIcon ? 'pl-9' : 'pl-3'} pr-3`}
          {...props}
        />
      </div>
    </FormField>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, hint, required, className = '', id, rows = 3, ...props }, ref) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <FormField label={label} error={error} hint={hint} required={required} htmlFor={inputId} className={className}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`${controlBase} ${controlState(error)} px-3 py-2`}
        {...props}
      />
    </FormField>
  );
});

export const Select = forwardRef(function Select(
  { label, error, hint, required, className = '', options = [], placeholder, id, ...props },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <FormField label={label} error={error} hint={hint} required={required} htmlFor={inputId} className={className}>
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`${controlBase} ${controlState(error)} h-10 appearance-none pl-3 pr-9`}
          {...props}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      </div>
    </FormField>
  );
});

export const DatePicker = forwardRef(function DatePicker({ label, error, hint, required, className = '', id, ...props }, ref) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <FormField label={label} error={error} hint={hint} required={required} htmlFor={inputId} className={className}>
      <div className="relative">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          ref={ref}
          id={inputId}
          type="date"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`${controlBase} ${controlState(error)} h-10 pl-9 pr-3`}
          {...props}
        />
      </div>
    </FormField>
  );
});

export const Checkbox = forwardRef(function Checkbox({ label, description, className = '', id, ...props }, ref) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <label htmlFor={inputId} className={`flex cursor-pointer items-start gap-3 ${className}`}>
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 accent-brand-700 focus:ring-brand-500"
        {...props}
      />
      <span>
        <span className="block text-sm font-medium text-slate-700">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
    </label>
  );
});

export const toOptions = (values, labeler) => values.map((value) => ({ value, label: labeler ? labeler(value) : value }));
