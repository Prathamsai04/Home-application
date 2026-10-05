import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSelector } from 'react-redux';
import { MAINTENANCE_CATEGORIES, PRIORITIES, humanize, maintenanceCreateSchema } from '@homestay/shared';
import { Button, Checkbox, Input, Select, Textarea, toOptions } from '../../components/ui';
import { useServerErrors } from '../../hooks';

export function MaintenanceForm({ request, onSubmit, onCancel, submitting, serverErrors }) {
  const rooms = useSelector((state) => state.lookups.data.rooms);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(maintenanceCreateSchema),
    defaultValues: {
      roomId: request?.roomId ?? '',
      title: request?.title ?? '',
      description: request?.description ?? '',
      category: request?.category ?? 'plumbing',
      priority: request?.priority ?? 'medium',
      blocksRoom: request?.blocksRoom ?? false,
    },
  });
  useServerErrors(serverErrors, setError);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Select
        label="Room"
        required
        placeholder="Select a room"
        options={rooms.map((room) => ({ value: room.id, label: room.label }))}
        error={errors.roomId?.message}
        {...register('roomId')}
      />
      <Input label="Title" required placeholder="e.g. Leaking shower head" error={errors.title?.message} {...register('title')} />
      <Textarea label="Description" rows={3} error={errors.description?.message} {...register('description')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Category" options={toOptions(MAINTENANCE_CATEGORIES, humanize)} {...register('category')} />
        <Select label="Priority" options={toOptions(Object.values(PRIORITIES), humanize)} {...register('priority')} />
      </div>
      <Checkbox
        label="Block room for bookings"
        description="The room shows as Maintenance and cannot be booked until the request is resolved."
        {...register('blocksRoom')}
      />
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {request ? 'Save changes' : 'Report issue'}
        </Button>
      </div>
    </form>
  );
}
