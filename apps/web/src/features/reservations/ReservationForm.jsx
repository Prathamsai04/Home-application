import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { RESERVATION_SOURCES, addDays, fromMinorUnits, humanize, reservationCreateSchema } from '@homestay/shared';
import { Button, DatePicker, Input, Select, Spinner, Textarea, toOptions } from '../../components/ui';
import { useMoney, useServerErrors } from '../../hooks';
import { localToday } from '../../lib/format';
import { estimateStay } from '../../lib/stay';
import { roomsActions } from '../rooms/roomsSlice';

const emptyToUndefined = (value) => (value === '' || value === null ? undefined : value);

export function ReservationForm({ reservation, prefill = {}, onSubmit, onCancel, submitting, serverErrors }) {
  const dispatch = useDispatch();
  const money = useMoney();
  const { rooms, guests, properties } = useSelector((state) => state.lookups.data);
  const availability = useSelector((state) => state.rooms.availability);
  const inHouse = reservation?.status === 'checked_in';
  const today = localToday();
  const prefillRoom = rooms.find((room) => room.id === (reservation?.roomId ?? prefill.roomId));

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(reservationCreateSchema),
    defaultValues: {
      propertyFilter: prefillRoom?.propertyId ?? '',
      roomId: reservation?.roomId ?? prefill.roomId ?? '',
      guestId: reservation?.guestId ?? '',
      checkIn: reservation?.checkIn ?? prefill.checkIn ?? today,
      checkOut: reservation?.checkOut ?? prefill.checkOut ?? addDays(today, 2),
      adults: reservation?.adults ?? Number(prefill.adults ?? 2),
      children: reservation?.children ?? 0,
      source: reservation?.source ?? 'direct',
      status: 'confirmed',
      nightlyRate: reservation ? fromMinorUnits(reservation.nightlyRateMinor) : undefined,
      specialRequests: reservation?.specialRequests ?? '',
      notes: reservation?.notes ?? '',
    },
  });
  useServerErrors(serverErrors, setError);

  const [propertyFilter, roomId, checkIn, checkOut, adults, children, nightlyRate] = useWatch({
    control,
    name: ['propertyFilter', 'roomId', 'checkIn', 'checkOut', 'adults', 'children', 'nightlyRate'],
  });
  const guestsCount = Number(adults || 0) + Number(children || 0);

  useEffect(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return;
    dispatch(
      roomsActions.searchAvailability({
        checkIn,
        checkOut,
        guests: Math.max(1, guestsCount),
        propertyId: propertyFilter,
        excludeReservationId: reservation?.id,
      }),
    );
  }, [dispatch, checkIn, checkOut, guestsCount, propertyFilter, reservation?.id]);

  useEffect(() => () => dispatch(roomsActions.clearAvailability()), [dispatch]);

  const roomOptions = useMemo(() => {
    const available = availability.status === 'succeeded' ? availability.items : null;
    const source = available ?? rooms.filter((room) => !propertyFilter || room.propertyId === propertyFilter);
    const options = source.map((room) => ({
      value: room.id,
      label: `${room.propertyName ?? properties.find((p) => p.id === room.propertyId)?.name ?? ''} · ${room.number} ${room.name} (${room.capacity} guests, ${money(room.baseRateMinor)})`,
    }));
    if (roomId && !options.some((option) => option.value === roomId)) {
      const selected = rooms.find((room) => room.id === roomId);
      if (selected) options.unshift({ value: roomId, label: `${selected.label} — unavailable for these dates`, disabled: false });
    }
    return options;
  }, [availability, rooms, properties, propertyFilter, roomId, money]);

  const selectedRoom = rooms.find((room) => room.id === roomId);
  const estimate = estimateStay({ checkIn, checkOut, nightlyRate, fallbackRateMinor: selectedRoom?.baseRateMinor });

  const submit = ({ propertyFilter: _ignored, status, ...values }) => {
    const payload = { ...values, nightlyRate: emptyToUndefined(values.nightlyRate) };
    if (!reservation) payload.status = status;
    if (inHouse) {
      onSubmit({ checkOut: values.checkOut, adults: values.adults, children: values.children, notes: values.notes, specialRequests: values.specialRequests });
      return;
    }
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      {inHouse && (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">
          Guest is checked in: only the check-out date, guest count and notes can be changed.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <DatePicker label="Check-in" required disabled={inHouse} error={errors.checkIn?.message} {...register('checkIn')} />
        <DatePicker label="Check-out" required min={checkIn} error={errors.checkOut?.message} {...register('checkOut')} />
        <Input label="Adults" type="number" min={1} max={12} required error={errors.adults?.message} {...register('adults')} />
        <Input label="Children" type="number" min={0} max={12} error={errors.children?.message} {...register('children')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label="Property"
          placeholder="All properties"
          disabled={inHouse}
          options={properties.map((p) => ({ value: p.id, label: p.name }))}
          {...register('propertyFilter', { onChange: () => setValue('roomId', '') })}
        />
        <div className="sm:col-span-2">
          <Select
            label={
              <span className="inline-flex items-center gap-2">
                Room {availability.status === 'loading' && <Spinner className="h-3.5 w-3.5" label="Checking availability" />}
              </span>
            }
            required
            disabled={inHouse}
            placeholder={roomOptions.length ? 'Select an available room' : 'No rooms available for these dates'}
            options={roomOptions}
            hint={availability.status === 'succeeded' ? `${availability.items.length} room(s) available for ${guestsCount} guest(s)` : undefined}
            error={errors.roomId?.message}
            {...register('roomId')}
          />
        </div>
      </div>
      <Select
        label="Guest"
        required
        disabled={inHouse}
        placeholder="Select a guest"
        options={guests.map((g) => ({ value: g.id, label: `${g.name} · ${g.email}` }))}
        error={errors.guestId?.message}
        {...register('guestId')}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Select label="Source" disabled={inHouse} options={toOptions(RESERVATION_SOURCES, humanize)} {...register('source')} />
        {!reservation && (
          <Select
            label="Status"
            options={[
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'pending', label: 'Pending' },
            ]}
            {...register('status')}
          />
        )}
        <Input
          label="Nightly rate"
          inputMode="decimal"
          disabled={inHouse}
          placeholder={selectedRoom ? fromMinorUnits(selectedRoom.baseRateMinor) : 'Room rate'}
          hint="Leave blank to use the room rate"
          error={errors.nightlyRate?.message}
          {...register('nightlyRate', { setValueAs: emptyToUndefined })}
        />
      </div>
      <Textarea label="Special requests" rows={2} error={errors.specialRequests?.message} {...register('specialRequests')} />
      <Textarea label="Internal notes" rows={2} error={errors.notes?.message} {...register('notes')} />

      {estimate && (
        <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3 text-sm">
          <span className="text-brand-900">
            {estimate.nights} night(s){estimate.rateMinor !== null ? ` × ${money(estimate.rateMinor)}` : ''}
          </span>
          <span className="text-base font-semibold text-brand-900">{estimate.totalMinor !== null ? money(estimate.totalMinor) : 'Select a room'}</span>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {reservation ? 'Save changes' : 'Create reservation'}
        </Button>
      </div>
    </form>
  );
}
