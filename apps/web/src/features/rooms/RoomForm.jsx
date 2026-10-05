import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSelector } from 'react-redux';
import { z } from 'zod';
import { ROOM_TYPES, fromMinorUnits, humanize, roomBaseSchema } from '@homestay/shared';
import { Button, Checkbox, Input, Select, Textarea, toOptions } from '../../components/ui';
import { useServerErrors } from '../../hooks';
import { joinList, splitList } from '../../lib/forms';

const formSchema = roomBaseSchema.omit({ amenities: true }).extend({ amenitiesText: z.string().max(600).optional() });

export function RoomForm({ room, onSubmit, onCancel, submitting, serverErrors }) {
  const properties = useSelector((state) => state.lookups.data.properties);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      propertyId: room?.propertyId ?? properties[0]?.id ?? '',
      number: room?.number ?? '',
      name: room?.name ?? '',
      type: room?.type ?? 'double',
      capacity: room?.capacity ?? 2,
      floor: room?.floor ?? 1,
      baseRate: room ? fromMinorUnits(room.baseRateMinor) : '',
      active: room?.active ?? true,
      description: room?.description ?? '',
      amenitiesText: joinList(room?.amenities),
    },
  });
  useServerErrors(serverErrors, setError);

  const submit = ({ amenitiesText, ...values }) => onSubmit({ ...values, amenities: splitList(amenitiesText) });

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <Select
        label="Property"
        required
        error={errors.propertyId?.message}
        options={properties.map((p) => ({ value: p.id, label: p.name }))}
        {...register('propertyId')}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Room number" required error={errors.number?.message} {...register('number')} />
        <Input label="Room name" required className="sm:col-span-2" error={errors.name?.message} {...register('name')} />
        <Select label="Type" options={toOptions(ROOM_TYPES, humanize)} error={errors.type?.message} {...register('type')} />
        <Input label="Capacity" type="number" min={1} max={12} required error={errors.capacity?.message} {...register('capacity')} />
        <Input label="Floor" type="number" min={0} error={errors.floor?.message} {...register('floor')} />
      </div>
      <Input
        label="Base nightly rate"
        required
        inputMode="decimal"
        placeholder="3500.00"
        hint="Stored as exact minor units (no floating point)"
        error={errors.baseRate?.message}
        {...register('baseRate')}
      />
      <Input label="Amenities" hint="Comma separated" {...register('amenitiesText')} />
      <Textarea label="Description" rows={2} error={errors.description?.message} {...register('description')} />
      <Checkbox label="Room is in service" description="Out-of-service rooms are shown under maintenance and cannot be booked." {...register('active')} />
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {room ? 'Save changes' : 'Create room'}
        </Button>
      </div>
    </form>
  );
}
