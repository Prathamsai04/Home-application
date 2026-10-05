import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Skeleton } from './Loader';
import { EmptyState } from './EmptyState';

/**
 * Data table with sortable headers, skeleton loading rows and empty state.
 * columns: [{ key, header, render?(row), sortKey?, className?, align? }]
 */
export function Table({
  columns,
  rows,
  loading = false,
  rowKey = (row) => row.id,
  sortBy,
  sortOrder,
  onSort,
  onRowClick,
  empty,
  caption,
}) {
  const showSkeleton = loading && rows.length === 0;

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-slate-50/80">
          <tr>
            {columns.map((column) => {
              const active = column.sortKey && sortBy === column.sortKey;
              const SortIcon = active ? (sortOrder === 'desc' ? ArrowDown : ArrowUp) : ArrowUpDown;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={active ? (sortOrder === 'desc' ? 'descending' : 'ascending') : undefined}
                  className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${column.align === 'right' ? 'text-right' : ''} ${column.className ?? ''}`}
                >
                  {column.sortKey && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(column.sortKey, active && sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="inline-flex items-center gap-1 uppercase hover:text-slate-800"
                    >
                      {column.header}
                      <SortIcon className={`h-3.5 w-3.5 ${active ? 'text-brand-600' : 'text-slate-300'}`} aria-hidden />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className={`divide-y divide-slate-100 bg-white ${loading && rows.length ? 'opacity-60' : ''}`}>
          {showSkeleton &&
            Array.from({ length: 5 }, (_, index) => (
              <tr key={`skeleton-${index}`}>
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3.5">
                    <Skeleton className="h-4 w-full max-w-[160px]" />
                  </td>
                ))}
              </tr>
            ))}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length}>{empty ?? <EmptyState title="No records found" />}</td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer transition-colors hover:bg-slate-50' : ''}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`whitespace-nowrap px-4 py-3 text-slate-700 ${column.align === 'right' ? 'text-right' : ''} ${column.className ?? ''}`}
                >
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
