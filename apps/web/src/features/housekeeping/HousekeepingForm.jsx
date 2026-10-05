import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSelector } from 'react-redux';
import { HOUSEKEEPING_TYPES, PRIORITIES, housekeepingCreateSchema, humanize } from '@homestay/shared';
import { Button, DatePicker, Select, Textarea, toOptions } from '../../components/ui';
import { useServerErrors } from '../../hooks';
import { localToday } from '../../lib/format';

const emptyToNull = (value) => (value === '' ? null : value);

export function HousekeepingForm({ task, onSubmit, onCancel, submitting, serverErrors }) {
  const { rooms, staff } = useSelector((state) => state.lookups.data);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(housekeepingCreateSchema),
    defaultValues: {
      roomId: task?.roomId ?? '',
      type: task?.type ?? 'daily_service',
      priority: task?.priority ?? 'medium',
      dueDate: task?.dueDate ?? localToday(),
      assignedTo: task?.assignedTo ?? null,
      notes: task?.notes ?? '',
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
      <div className="grid gap-4 sm:grid-cols-3">
        <Select label="Task type" options={toOptions(HOUSEKEEPING_TYPES, humanize)} error={errors.type?.message} {...register('type')} />
        <Select label="Priority" options={toOptions(Object.values(PRIORITIES), humanize)} error={errors.priority?.message} {...register('priority')} />
        <DatePicker label="Due date" required error={errors.dueDate?.message} {...register('dueDate')} />
      </div>
      <Select
        label="Assign to"
        placeholder="Unassigned"
        options={staff.map((member) => ({ value: member.id, label: `${member.name} · ${member.jobTitle || humanize(member.role)}` }))}
        error={errors.assignedTo?.message}
        {...register('assignedTo', { setValueAs: emptyToNull })}
      />
      <Textarea label="Notes" rows={2} error={errors.notes?.message} {...register('notes')} />
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {task ? 'Save changes' : 'Create task'}
        </Button>
      </div>
    </form>
  );
}
