import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { CalendarSearch } from 'lucide-react';
import { addDays, humanize } from '@homestay/shared';
import { Badge, Button, DatePicker, EmptyState, Input, Select, Spinner } from '../../components/ui';
import { useMoney, usePermission } from '../../hooks';
import { localToday } from '../../lib/format';
import { roomsActions } from './roomsSlice';

/** Search bookable rooms for a stay window (excludes conflicts and maintenance). */
export function AvailabilityPanel({ onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const money = useMoney();
  const allowed = usePermission();
  const properties = useSelector((state) => state.lookups.data.properties);
  const availability = useSelector((state) => state.rooms.availability);
  const today = localToday();
  const [form, setForm] = useState({ checkIn: today, checkOut: addDays(today, 2), guests: 2, propertyId: '' });
  const invalid = !form.checkIn || !form.checkOut || form.checkOut <= form.checkIn;

  const search = (event) => {
    event.preventDefault();
    if (!invalid) dispatch(roomsActions.searchAvailability(form));
  };

  const book = (room) => {
    const params = new URLSearchParams({ new: '1', roomId: room.id, checkIn: form.checkIn, checkOut: form.checkOut, adults: String(form.guests) });
    onClose?.();
    navigate(`/reservations?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="grid gap-3 sm:grid-cols-2">
        <DatePicker label="Check-in" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} />
        <DatePicker
          label="Check-out"
          value={form.checkOut}
          error={invalid && form.checkOut ? 'Check-out must be after check-in' : undefined}
          onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
        />
        <Input label="Guests" type="number" min={1} max={12} value={form.guests} onChange={(e) => setForm({ ...form, guests: Number(e.target.value) || 1 })} />
        <Select
          label="Property"
          placeholder="All properties"
          value={form.propertyId}
          onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
          options={properties.map((p) => ({ value: p.id, label: p.name }))}
        />
        <div className="sm:col-span-2">
          <Button type="submit" icon={CalendarSearch} disabled={invalid} loading={availability.status === 'loading'} className="w-full">
            Check availability
          </Button>
        </div>
      </form>

      {availability.status === 'loading' && (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      )}
      {availability.status === 'failed' && <p className="text-sm text-rose-600">{availability.error}</p>}
      {availability.status === 'succeeded' &&
        (availability.items.length === 0 ? (
          <EmptyState title="No rooms available" description="Try different dates, fewer guests or another property." />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            <li className="bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500">{availability.items.length} room(s) available</li>
            {availability.items.map((room) => (
              <li key={room.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {room.number} · {room.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {room.propertyName} · {humanize(room.type)} · up to {room.capacity} guests
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <Badge tone="green">{money(room.estimatedTotalMinor)}</Badge>
                    <p className="mt-0.5 text-xs text-slate-500">{room.nights} night(s)</p>
                  </div>
                  {allowed('reservations:manage') && (
                    <Button size="sm" variant="soft" onClick={() => book(room)}>
                      Book
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
