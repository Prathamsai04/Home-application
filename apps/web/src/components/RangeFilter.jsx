import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Button, DatePicker, Segmented, Select } from './ui';

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'custom', label: 'Custom' },
];

/** Range preset + custom date window + property scope selector. */
export function RangeFilter({ filters, onChange }) {
  const properties = useSelector((state) => state.lookups.data.properties);
  const [custom, setCustom] = useState({ from: filters.from, to: filters.to });

  useEffect(() => setCustom({ from: filters.from, to: filters.to }), [filters.from, filters.to]);

  const invalid = custom.from && custom.to && custom.from > custom.to;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
      <Segmented label="Date range" options={RANGES} value={filters.range} onChange={(range) => onChange({ range })} />
      {filters.range === 'custom' && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!invalid) onChange(custom);
          }}
        >
          <DatePicker label="From" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="w-40" />
          <DatePicker
            label="To"
            value={custom.to}
            onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
            error={invalid ? 'End must be after start' : undefined}
            className="w-40"
          />
          <Button type="submit" size="md" variant="secondary" disabled={!custom.from || !custom.to || invalid}>
            Apply
          </Button>
        </form>
      )}
      <Select
        aria-label="Property"
        className="w-full lg:w-56"
        placeholder="All properties"
        value={filters.propertyId}
        onChange={(e) => onChange({ propertyId: e.target.value })}
        options={properties.map((p) => ({ value: p.id, label: p.name }))}
      />
    </div>
  );
}
