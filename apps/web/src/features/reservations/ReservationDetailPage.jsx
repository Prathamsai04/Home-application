import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft,
  BedDouble,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  CreditCard,
  LogIn,
  LogOut,
  Pencil,
  RotateCcw,
  UserRound,
  UserX,
} from 'lucide-react';
import { humanize } from '@homestay/shared';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  DetailItem,
  EmptyState,
  Modal,
  PageLoader,
  StatusBadge,
  Textarea,
} from '../../components/ui';
import { useMoney, useMutationSuccess, usePermission } from '../../hooks';
import { formatDate, formatDateTime } from '../../lib/format';
import { PaymentForm } from '../payments/PaymentForm';
import { paymentsActions } from '../payments/paymentsSlice';
import { ReservationForm } from './ReservationForm';
import { reservationsActions } from './reservationsSlice';

const ACTIONS = {
  confirm: { label: 'Confirm', icon: CheckCircle2, action: 'confirm', variant: 'soft', permission: 'reservations:manage' },
  check_in: { label: 'Check in', icon: LogIn, action: 'checkIn', variant: 'primary', permission: 'reservations:operate' },
  check_out: { label: 'Check out', icon: LogOut, action: 'checkOut', variant: 'primary', permission: 'reservations:operate' },
  no_show: { label: 'No-show', icon: UserX, action: 'noShow', variant: 'secondary', permission: 'reservations:manage', confirm: true },
  cancel: { label: 'Cancel', icon: CalendarX, action: 'cancel', variant: 'danger', permission: 'reservations:manage', confirm: true },
};

function Timeline({ reservation }) {
  const events = [
    { label: 'Booked', at: reservation.createdAt },
    { label: 'Checked in', at: reservation.checkedInAt },
    { label: 'Checked out', at: reservation.checkedOutAt },
    { label: `Cancelled${reservation.cancellationReason ? ` - ${reservation.cancellationReason}` : ''}`, at: reservation.cancelledAt },
  ].filter((event) => event.at);
  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.label} className="flex gap-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-hidden />
          <div>
            <p className="text-sm text-slate-800">{event.label}</p>
            <p className="text-xs text-slate-500">{formatDateTime(event.at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function ReservationDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const money = useMoney();
  const allowed = usePermission();
  const { current: reservation, currentStatus, currentError, mutation } = useSelector((state) => state.reservations);
  const paymentMutation = useSelector((state) => state.payments.mutation);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [reason, setReason] = useState('');
  const [paymentMode, setPaymentMode] = useState(null);

  useEffect(() => {
    dispatch(reservationsActions.fetchOne(id));
    return () => dispatch(reservationsActions.clearCurrent());
  }, [dispatch, id]);

  useMutationSuccess('reservations', reservationsActions.resetMutation, ['update', 'confirm', 'cancel', 'checkIn', 'checkOut', 'noShow'], () => {
    setEditing(false);
    setConfirming(null);
    setReason('');
  });
  useMutationSuccess('payments', paymentsActions.resetMutation, ['create', 'refund'], () => setPaymentMode(null));

  if (currentStatus === 'failed') {
    return <EmptyState title="Reservation not found" description={currentError} action={<Link to="/reservations" className="text-sm font-medium text-brand-700">Back to reservations</Link>} />;
  }
  if (!reservation || reservation.id !== id) return <PageLoader label="Loading reservation…" />;

  const pending = mutation.status === 'pending';
  const run = (definition) => {
    if (definition.confirm) {
      setConfirming(definition);
      return;
    }
    dispatch(reservationsActions.runAction({ id, action: definition.action }));
  };
  const payment = reservation.payment;
  const closePayment = () => {
    setPaymentMode(null);
    dispatch(paymentsActions.resetMutation());
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/reservations" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Reservations
        </Link>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{reservation.code}</h1>
              <StatusBadge status={reservation.status} />
              <StatusBadge status={payment.status} dot={false} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {reservation.guestName} · Room {reservation.roomNumber}, {reservation.propertyName}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {reservation.allowedActions
              .filter((action) => ACTIONS[action] && allowed(ACTIONS[action].permission))
              .map((action) => {
                const definition = ACTIONS[action];
                return (
                  <Button
                    key={action}
                    variant={definition.variant}
                    icon={definition.icon}
                    loading={pending && mutation.action === definition.action}
                    disabled={pending}
                    onClick={() => run(definition)}
                  >
                    {definition.label}
                  </Button>
                );
              })}
            {reservation.allowedActions.includes('edit') && allowed('reservations:manage') && (
              <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Stay details" icon={BedDouble} />
          <CardBody>
            <dl className="grid gap-5 sm:grid-cols-3">
              <DetailItem label="Check-in">{formatDate(reservation.checkIn)}</DetailItem>
              <DetailItem label="Check-out">{formatDate(reservation.checkOut)}</DetailItem>
              <DetailItem label="Nights">{reservation.nights}</DetailItem>
              <DetailItem label="Room">
                {reservation.roomNumber} · {reservation.roomName}
              </DetailItem>
              <DetailItem label="Property">{reservation.propertyName}</DetailItem>
              <DetailItem label="Guests">
                {reservation.adults} adult(s){reservation.children ? `, ${reservation.children} child(ren)` : ''}
              </DetailItem>
              <DetailItem label="Source">{humanize(reservation.source)}</DetailItem>
              <DetailItem label="Nightly rate">{money(reservation.nightlyRateMinor)}</DetailItem>
              <DetailItem label="Total">{money(reservation.totalAmountMinor)}</DetailItem>
            </dl>
            {(reservation.specialRequests || reservation.notes) && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {reservation.specialRequests && (
                  <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="text-xs font-semibold uppercase tracking-wide">Special requests</p>
                    <p className="mt-1">{reservation.specialRequests}</p>
                  </div>
                )}
                {reservation.notes && (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide">Internal notes</p>
                    <p className="mt-1">{reservation.notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Guest" icon={UserRound} />
          <CardBody>
            {reservation.guest ? (
              <dl className="space-y-4">
                <DetailItem label="Name">
                  <span className="flex items-center gap-2">
                    {reservation.guestName} {reservation.guest.vip && <Badge tone="amber">VIP</Badge>}
                  </span>
                </DetailItem>
                <DetailItem label="Email">{reservation.guest.email}</DetailItem>
                <DetailItem label="Phone">{reservation.guest.phone}</DetailItem>
                <DetailItem label="Nationality">{reservation.guest.nationality}</DetailItem>
              </dl>
            ) : (
              <p className="text-sm text-slate-500">Guest record was deleted.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Payments"
            description="Status is derived automatically from the ledger"
            icon={CreditCard}
            action={
              allowed('payments:manage') && (
                <div className="flex gap-2">
                  {payment.refundableMinor > 0 && (
                    <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => setPaymentMode('refund')}>
                      Refund
                    </Button>
                  )}
                  {payment.balanceMinor > 0 && (
                    <Button size="sm" icon={CreditCard} onClick={() => setPaymentMode('payment')}>
                      Record payment
                    </Button>
                  )}
                </div>
              )
            }
          />
          <CardBody>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Total', payment.totalMinor, 'text-slate-900'],
                ['Paid', payment.paidMinor, 'text-emerald-700'],
                ['Refunded', payment.refundedMinor, 'text-violet-700'],
                ['Balance due', payment.balanceMinor, payment.balanceMinor > 0 ? 'text-rose-700' : 'text-slate-900'],
              ].map(([label, value, className]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`mt-1 text-lg font-semibold ${className}`}>{money(value)}</p>
                </div>
              ))}
            </div>
            {allowed('payments:view') && (
              <div className="mt-4 overflow-x-auto">
                {reservation.transactions.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">No transactions recorded yet.</p>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="py-2 pr-4 font-semibold">Date</th>
                        <th className="py-2 pr-4 font-semibold">Type</th>
                        <th className="py-2 pr-4 font-semibold">Method</th>
                        <th className="py-2 pr-4 font-semibold">Reference</th>
                        <th className="py-2 text-right font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reservation.transactions.map((t) => (
                        <tr key={t.id}>
                          <td className="py-2 pr-4">{formatDateTime(t.receivedAt)}</td>
                          <td className="py-2 pr-4">
                            <StatusBadge status={t.type} dot={false} />
                          </td>
                          <td className="py-2 pr-4">
                            {humanize(t.method)}
                            {t.cardLast4 ? ` ••${t.cardLast4}` : ''}
                          </td>
                          <td className="py-2 pr-4 text-slate-500">{t.reference || '—'}</td>
                          <td className={`py-2 text-right font-medium ${t.type === 'refund' ? 'text-violet-700' : 'text-slate-900'}`}>
                            {t.type === 'refund' ? '−' : ''}
                            {money(t.amountMinor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Timeline" icon={CalendarCheck} />
          <CardBody>
            <Timeline reservation={reservation} />
          </CardBody>
        </Card>
      </div>

      <Modal
        open={editing}
        onClose={() => {
          setEditing(false);
          dispatch(reservationsActions.resetMutation());
        }}
        title={`Edit ${reservation.code}`}
        size="lg"
      >
        {editing && (
          <ReservationForm
            reservation={reservation}
            onSubmit={(data) => dispatch(reservationsActions.update({ id, data }))}
            onCancel={() => setEditing(false)}
            submitting={pending}
            serverErrors={mutation.fieldErrors}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(paymentMode)}
        onClose={closePayment}
        title={paymentMode === 'refund' ? 'Issue refund' : 'Record payment'}
        description={`${reservation.code} · ${reservation.guestName}`}
      >
        {paymentMode && (
          <PaymentForm
            mode={paymentMode}
            reservationId={id}
            summary={payment}
            submitting={paymentMutation.status === 'pending'}
            serverErrors={paymentMutation.fieldErrors}
            onCancel={closePayment}
            onSubmit={(data) =>
              paymentMode === 'refund'
                ? dispatch(paymentsActions.runAction({ action: 'refund', data }))
                : dispatch(paymentsActions.create(data))
            }
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirming)}
        title={confirming?.action === 'cancel' ? 'Cancel reservation?' : 'Mark as no-show?'}
        message={
          confirming?.action === 'cancel'
            ? 'The room will be released for other bookings. Any refund must be issued separately.'
            : 'The guest did not arrive. The room will be released and the reservation closed.'
        }
        confirmLabel={confirming?.label}
        loading={pending}
        onClose={() => setConfirming(null)}
        onConfirm={() =>
          dispatch(reservationsActions.runAction({ id, action: confirming.action, data: confirming.action === 'cancel' ? { reason } : undefined }))
        }
      >
        {confirming?.action === 'cancel' && (
          <Textarea label="Reason (optional)" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        )}
      </ConfirmDialog>
    </div>
  );
}
