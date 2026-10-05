import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSelector } from 'react-redux';
import { PAYMENT_METHODS, fromMinorUnits, humanize, paymentCreateSchema, refundCreateSchema } from '@homestay/shared';
import { Button, Input, Select, Textarea, toOptions } from '../../components/ui';
import { useMoney, useServerErrors } from '../../hooks';

const emptyToUndefined = (value) => (value === '' ? undefined : value);

/**
 * Records a payment or a refund. Never collects card numbers, CVV or bank
 * credentials - only an optional last-4 and a free-text reference.
 */
export function PaymentForm({ mode = 'payment', reservationId, summary, onSubmit, onCancel, submitting, serverErrors }) {
  const money = useMoney();
  const billable = useSelector((state) => state.lookups.data.billableReservations);
  const isRefund = mode === 'refund';
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(isRefund ? refundCreateSchema : paymentCreateSchema),
    defaultValues: {
      reservationId: reservationId ?? '',
      amount: '',
      method: PAYMENT_METHODS.UPI,
      reference: '',
      notes: '',
      reason: '',
    },
  });
  useServerErrors(serverErrors, setError);

  const [method, selectedId] = useWatch({ control, name: ['method', 'reservationId'] });
  const selected = billable.find((r) => r.id === selectedId);
  const limitMinor = isRefund ? (summary?.refundableMinor ?? selected?.refundableMinor) : (summary?.balanceMinor ?? selected?.balanceMinor);

  useEffect(() => {
    if (Number.isSafeInteger(limitMinor) && limitMinor > 0) setValue('amount', fromMinorUnits(limitMinor));
  }, [limitMinor, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {!reservationId && (
        <Select
          label="Reservation"
          required
          placeholder="Select a reservation with a balance"
          options={billable
            .filter((r) => (isRefund ? r.refundableMinor > 0 : r.balanceMinor > 0))
            .map((r) => ({ value: r.id, label: `${r.code} · ${r.guestName} · ${money(isRefund ? r.refundableMinor : r.balanceMinor)} ${isRefund ? 'refundable' : 'due'}` }))}
          error={errors.reservationId?.message}
          {...register('reservationId')}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={isRefund ? 'Refund amount' : 'Amount received'}
          required
          inputMode="decimal"
          hint={Number.isSafeInteger(limitMinor) ? `${isRefund ? 'Refundable' : 'Outstanding'}: ${money(limitMinor)}` : undefined}
          error={errors.amount?.message}
          {...register('amount')}
        />
        <Select label="Method" options={toOptions(Object.values(PAYMENT_METHODS), humanize)} error={errors.method?.message} {...register('method')} />
        <Input
          label="Reference"
          placeholder={method === 'upi' ? 'UPI transaction ID' : method === 'bank_transfer' ? 'UTR / NEFT reference' : method === 'card' ? 'Authorisation code' : 'Receipt number'}
          hint="Never enter full card or bank account numbers"
          error={errors.reference?.message}
          {...register('reference')}
        />
        {!isRefund && method === PAYMENT_METHODS.CARD && (
          <Input
            label="Card last 4 digits"
            maxLength={4}
            inputMode="numeric"
            error={errors.cardLast4?.message}
            {...register('cardLast4', { setValueAs: emptyToUndefined })}
          />
        )}
      </div>
      {isRefund ? (
        <Textarea label="Refund reason" required rows={2} error={errors.reason?.message} {...register('reason')} />
      ) : (
        <Textarea label="Notes" rows={2} error={errors.notes?.message} {...register('notes')} />
      )}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant={isRefund ? 'danger' : 'primary'} loading={submitting}>
          {isRefund ? 'Issue refund' : 'Record payment'}
        </Button>
      </div>
    </form>
  );
}
