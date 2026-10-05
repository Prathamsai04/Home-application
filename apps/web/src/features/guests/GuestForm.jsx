import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { guestCreateSchema } from '@homestay/shared';
import { Button, Checkbox, Input, Select, Textarea } from '../../components/ui';
import { useServerErrors } from '../../hooks';

const ID_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID' },
  { value: 'driving_license', label: 'Driving licence' },
  { value: 'other', label: 'Other' },
];

export function GuestForm({ guest, onSubmit, onCancel, submitting, serverErrors }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(guestCreateSchema),
    defaultValues: {
      firstName: guest?.firstName ?? '',
      lastName: guest?.lastName ?? '',
      email: guest?.email ?? '',
      phone: guest?.phone ?? '',
      nationality: guest?.nationality ?? 'India',
      idType: guest?.idType ?? 'national_id',
      idNumberLast4: guest?.idNumberLast4 ?? '',
      city: guest?.city ?? '',
      notes: guest?.notes ?? '',
      vip: guest?.vip ?? false,
    },
  });
  useServerErrors(serverErrors, setError);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="First name" required error={errors.firstName?.message} {...register('firstName')} />
        <Input label="Last name" required error={errors.lastName?.message} {...register('lastName')} />
        <Input label="Email" type="email" required error={errors.email?.message} {...register('email')} />
        <Input label="Phone" type="tel" required error={errors.phone?.message} {...register('phone')} />
        <Input label="Nationality" required error={errors.nationality?.message} {...register('nationality')} />
        <Input label="City" error={errors.city?.message} {...register('city')} />
        <Select label="ID type" options={ID_TYPES} error={errors.idType?.message} {...register('idType')} />
        <Input
          label="ID last 4 characters"
          maxLength={4}
          hint="Only the last 4 characters are stored for privacy"
          error={errors.idNumberLast4?.message}
          {...register('idNumberLast4')}
        />
      </div>
      <Textarea label="Notes & preferences" error={errors.notes?.message} {...register('notes')} />
      <Checkbox label="VIP guest" description="Highlight this guest for special attention." {...register('vip')} />
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {guest ? 'Save changes' : 'Add guest'}
        </Button>
      </div>
    </form>
  );
}
