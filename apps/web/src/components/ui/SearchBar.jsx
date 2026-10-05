import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

/** Debounced search input. Calls onSearch after the user pauses typing. */
export function SearchBar({ value = '', onSearch, placeholder = 'Search…', delay = 350, className = '' }) {
  const [text, setText] = useState(value);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;
  const lastSent = useRef(value);

  useEffect(() => {
    setText(value);
    lastSent.current = value;
  }, [value]);

  useEffect(() => {
    if (text === lastSent.current) return undefined;
    const timer = setTimeout(() => {
      lastSent.current = text;
      onSearchRef.current(text.trim());
    }, delay);
    return () => clearTimeout(timer);
  }, [text, delay]);

  return (
    <div className={`relative w-full sm:max-w-xs ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-8 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      {text && (
        <button
          type="button"
          onClick={() => setText('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
