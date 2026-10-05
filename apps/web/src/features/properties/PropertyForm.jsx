import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PROPERTY_STATUS, humanize, propertyBaseSchema } from '@homestay/shared';
import { Button, Input, Select, Textarea, toOptions } from '../../components/ui';
import { useServerErrors } from '../../hooks';
import { joinList, splitList } from '../../lib/forms';

const formSchema = propertyBaseSchema.omit({ amenities: true }).extend({ amenitiesText: z.string().max(600).optional() });

export function toPropertyFormValues(property) {
  return {
    name: property?.name ?? '',
    code: property?.code ?? '',
    description: property?.description ?? '',
    address: {
      line1: property?.address?.line1 ?? '',
      city: property?.address?.city ?? '',
      state: property?.address?.state ?? '',
      country: property?.address?.country ?? 'India',
      postalCode: property?.address?.postalCode ?? '',
    },
    phone: property?.phone ?? '',
    email: property?.email ?? '',
    checkInTime: property?.checkInTime ?? '14:00',
    checkOutTime: property?.checkOutTime ?? '11:00',
    status: property?.status ?? PROPERTY_STATUS.ACTIVE,
    amenitiesText: joinList(property?.amenities),
  };
}

export function PropertyForm({ property, onSubmit, onCancel, submitting, serverErrors }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(formSchema), defaultValues: toPropertyFormValues(property) });
  useServerErrors(serverErrors, setError);

  const submit = ({ amenitiesText, ...values }) => onSubmit({ ...values, amenities: splitList(amenitiesText) });

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Property name" required className="sm:col-span-2" error={errors.name?.message} {...register('name')} />
        <Input label="Code" required hint="2-6 letters/digits" error={errors.code?.message} {...register('code')} />
      </div>
      <Textarea label="Description" error={errors.description?.message} {...register('description')} />
      <Input label="Address" required error={errors.address?.line1?.message} {...register('address.line1')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="City" required error={errors.address?.city?.message} {...register('address.city')} />
        <Input label="State" required error={errors.address?.state?.message} {...register('address.state')} />
        <Input label="Country" required error={errors.address?.country?.message} {...register('address.country')} />
        <Input label="Postal code" required error={errors.address?.postalCode?.message} {...register('address.postalCode')} />
        <Input label="Phone" required type="tel" error={errors.phone?.message} {...register('phone')} />
        <Input label="Email" required type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Check-in time" type="time" error={errors.checkInTime?.message} {...register('checkInTime')} />
        <Input label="Check-out time" type="time" error={errors.checkOutTime?.message} {...register('checkOutTime')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Select label="Status" options={toOptions(Object.values(PROPERTY_STATUS), humanize)} {...register('status')} />
        <Input label="Amenities" hint="Comma separated" className="sm:col-span-2" {...register('amenitiesText')} />
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {property ? 'Save changes' : 'Create property'}
        </Button>
      </div>
    </form>
  );
}
