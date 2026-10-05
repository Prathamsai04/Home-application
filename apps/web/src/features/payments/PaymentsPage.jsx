import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowDownLeft, ArrowUpRight, CreditCard, Plus, RotateCcw, Wallet } from 'lucide-react';
import { PAYMENT_METHODS, TRANSACTION_TYPES, humanize } from '@homestay/shared';
import {
  Button,
  Card,
  DatePicker,
  EmptyState,
  FilterBar,
  Modal,
  PageHeader,
  Pagination,
  SearchBar,
  Select,
  StatCard,
  StatusBadge,
  Table,
  toOptions,
} from '../../components/ui';
import { useMoney, useMutationSuccess, usePermission } from '../../hooks';
import { formatDateTime } from '../../lib/format';
import { PaymentForm } from './PaymentForm';
import { paymentsActions } from './paymentsSlice';

export default function PaymentsPage() {
  const dispatch = useDispatch();
  const money = useMoney();
  const allowed = usePermission();
  const properties = useSelector((state) => state.lookups.data.properties);
  const { items, pagination, query, status, error, mutation, meta } = useSelector((state) => state.payments);
  const [mode, setMode] = useState(null);

  useEffect(() => {
    dispatch(paymentsActions.fetchList());
  }, [dispatch]);

  useMutationSuccess('payments', paymentsActions.resetMutation, ['create', 'refund'], () => setMode(null));

  const setQuery = (change) => dispatch(paymentsActions.setQuery(change));
  const close = () => {
    setMode(null);
    dispatch(paymentsActions.resetMutation());
  };
  const totals = meta?.totals;
  const loadingTotals = status === 'loading' && !totals;

  const columns = [
    { key: 'receivedAt', header: 'Date', sortKey: 'receivedAt', render: (t) => formatDateTime(t.receivedAt) },
    {
      key: 'reservationCode',
      header: 'Reservation',
      sortKey: 'reservationCode',
      render: (t) => (
        <Link to={`/reservations/${t.reservationId}`} className="font-medium text-brand-700 hover:underline">
          {t.reservationCode}
        </Link>
      ),
    },
    {
      key: 'guestName',
      header: 'Guest',
      sortKey: 'guestName',
      render: (t) => (
        <div>
          <p className="text-slate-800">{t.guestName}</p>
          <p className="text-xs text-slate-500">{t.propertyName}</p>
        </div>
      ),
    },
    { key: 'type', header: 'Type', sortKey: 'type', render: (t) => <StatusBadge status={t.type} dot={false} /> },
    {
      key: 'method',
      header: 'Method',
      sortKey: 'method',
      render: (t) => (
        <span>
          {humanize(t.method)}
          {t.cardLast4 ? <span className="text-slate-400"> ••{t.cardLast4}</span> : null}
        </span>
      ),
    },
    { key: 'reference', header: 'Reference', render: (t) => <span className="text-slate-500">{t.reference || '—'}</span> },
    { key: 'recordedByName', header: 'Recorded by' },
    {
      key: 'amount',
      header: 'Amount',
      sortKey: 'amount',
      align: 'right',
      render: (t) => (
        <span className={`inline-flex items-center gap-1 font-semibold ${t.type === 'refund' ? 'text-violet-700' : 'text-emerald-700'}`}>
          {t.type === 'refund' ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden />}
          {t.type === 'refund' ? '−' : ''}
          {money(t.amountMinor)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Append-only ledger. Payment status is derived per reservation and cannot be edited manually."
        actions={
          allowed('payments:manage') && (
            <>
              <Button variant="secondary" icon={RotateCcw} onClick={() => setMode('refund')}>
                Issue refund
              </Button>
              <Button icon={Plus} onClick={() => setMode('payment')}>
                Record payment
              </Button>
            </>
          )
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Payments (filtered)" icon={ArrowDownLeft} tone="green" loading={loadingTotals} value={totals && money(totals.paymentsMinor)} />
        <StatCard label="Refunds (filtered)" icon={ArrowUpRight} tone="violet" loading={loadingTotals} value={totals && money(totals.refundsMinor)} />
        <StatCard label="Net collected" icon={Wallet} loading={loadingTotals} value={totals && money(totals.netMinor)} />
      </div>

      <Card>
        <FilterBar>
          <SearchBar value={query.search} onSearch={(search) => setQuery({ search })} placeholder="Search reference, booking or guest" />
          <Select
            aria-label="Type"
            className="lg:w-36"
            placeholder="All types"
            value={query.type}
            options={toOptions(Object.values(TRANSACTION_TYPES), humanize)}
            onChange={(e) => setQuery({ type: e.target.value })}
          />
          <Select
            aria-label="Method"
            className="lg:w-40"
            placeholder="All methods"
            value={query.method}
            options={toOptions(Object.values(PAYMENT_METHODS), humanize)}
            onChange={(e) => setQuery({ method: e.target.value })}
          />
          <Select
            aria-label="Property"
            className="lg:w-48"
            placeholder="All properties"
            value={query.propertyId}
            options={properties.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(e) => setQuery({ propertyId: e.target.value })}
          />
          <DatePicker aria-label="From date" value={query.from} onChange={(e) => setQuery({ from: e.target.value })} className="lg:w-40" />
          <DatePicker aria-label="To date" value={query.to} onChange={(e) => setQuery({ to: e.target.value })} className="lg:w-40" />
        </FilterBar>
        <Table
          caption="Payment transactions"
          columns={columns}
          rows={items}
          loading={status === 'loading'}
          sortBy={query.sortBy}
          sortOrder={query.sortOrder}
          onSort={(sortBy, sortOrder) => setQuery({ sortBy, sortOrder })}
          empty={<EmptyState icon={CreditCard} title={error ? 'Could not load payments' : 'No transactions found'} description={error} />}
        />
        <Pagination {...pagination} onPageChange={(page) => setQuery({ page })} onPageSizeChange={(pageSize) => setQuery({ pageSize })} />
      </Card>

      <Modal open={Boolean(mode)} onClose={close} title={mode === 'refund' ? 'Issue refund' : 'Record payment'}>
        {mode && (
          <PaymentForm
            mode={mode}
            submitting={mutation.status === 'pending'}
            serverErrors={mutation.fieldErrors}
            onCancel={close}
            onSubmit={(data) =>
              mode === 'refund' ? dispatch(paymentsActions.runAction({ action: 'refund', data })) : dispatch(paymentsActions.create(data))
            }
          />
        )}
      </Modal>
    </div>
  );
}
