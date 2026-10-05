import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { CalendarDays, Plus } from 'lucide-react';
import { RESERVATION_SOURCES, RESERVATION_STATUS, humanize } from '@homestay/shared';
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
  StatusBadge,
  Table,
  toOptions,
} from '../../components/ui';
import { useMoney, useMutationSuccess, usePermission } from '../../hooks';
import { formatShortDate } from '../../lib/format';
import { ReservationForm } from './ReservationForm';
import { reservationsActions } from './reservationsSlice';

export default function ReservationsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const money = useMoney();
  const allowed = usePermission();
  const [searchParams, setSearchParams] = useSearchParams();
  const properties = useSelector((state) => state.lookups.data.properties);
  const { items, pagination, query, status, error, mutation } = useSelector((state) => state.reservations);
  const [creating, setCreating] = useState(false);
  const [prefill, setPrefill] = useState({});

  useEffect(() => {
    dispatch(reservationsActions.fetchList());
  }, [dispatch]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setPrefill(Object.fromEntries(searchParams.entries()));
      setCreating(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useMutationSuccess('reservations', reservationsActions.resetMutation, ['create'], (result) => {
    setCreating(false);
    if (result?.id) navigate(`/reservations/${result.id}`);
  });

  const closeCreate = () => {
    setCreating(false);
    setPrefill({});
    dispatch(reservationsActions.resetMutation());
  };
  const setQuery = (change) => dispatch(reservationsActions.setQuery(change));

  const columns = [
    {
      key: 'code',
      header: 'Booking',
      sortKey: 'code',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r.code}</p>
          <p className="text-xs text-slate-500">{humanize(r.source)}</p>
        </div>
      ),
    },
    {
      key: 'guestName',
      header: 'Guest',
      sortKey: 'guestName',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-800">{r.guestName}</p>
          <p className="text-xs text-slate-500">
            {r.adults} adult(s){r.children ? `, ${r.children} child(ren)` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'room',
      header: 'Stay',
      sortKey: 'propertyName',
      render: (r) => (
        <div>
          <p className="text-slate-800">
            Room {r.roomNumber} · <span className="text-slate-500">{r.propertyName}</span>
          </p>
          <p className="text-xs text-slate-500">
            {formatShortDate(r.checkIn)} → {formatShortDate(r.checkOut)} · {r.nights} night(s)
          </p>
        </div>
      ),
    },
    { key: 'checkIn', header: 'Arrival', sortKey: 'checkIn', render: (r) => formatShortDate(r.checkIn) },
    { key: 'status', header: 'Status', sortKey: 'status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'payment', header: 'Payment', render: (r) => <StatusBadge status={r.payment.status} dot={false} /> },
    {
      key: 'total',
      header: 'Total',
      sortKey: 'totalAmount',
      align: 'right',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-900">{money(r.totalAmountMinor)}</p>
          {r.payment.balanceMinor > 0 && <p className="text-xs text-rose-600">{money(r.payment.balanceMinor)} due</p>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Reservations"
        description="Bookings across all properties. Check-out dates are exclusive."
        actions={
          allowed('reservations:manage') && (
            <Button icon={Plus} onClick={() => setCreating(true)}>
              New reservation
            </Button>
          )
        }
      />
      <Card>
        <FilterBar>
          <SearchBar value={query.search} onSearch={(search) => setQuery({ search })} placeholder="Search code, guest or room" />
          <Select
            aria-label="Status"
            className="lg:w-40"
            placeholder="All statuses"
            value={query.status}
            options={toOptions(Object.values(RESERVATION_STATUS), humanize)}
            onChange={(e) => setQuery({ status: e.target.value })}
          />
          <Select
            aria-label="Property"
            className="lg:w-48"
            placeholder="All properties"
            value={query.propertyId}
            options={properties.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(e) => setQuery({ propertyId: e.target.value })}
          />
          <Select
            aria-label="Source"
            className="lg:w-36"
            placeholder="All sources"
            value={query.source}
            options={toOptions(RESERVATION_SOURCES, humanize)}
            onChange={(e) => setQuery({ source: e.target.value })}
          />
          <DatePicker aria-label="Stays from" value={query.from} onChange={(e) => setQuery({ from: e.target.value })} className="lg:w-40" />
          <DatePicker aria-label="Stays to" value={query.to} onChange={(e) => setQuery({ to: e.target.value })} className="lg:w-40" />
          {(query.status || query.propertyId || query.source || query.from || query.to || query.search) && (
            <Button variant="ghost" onClick={() => dispatch(reservationsActions.resetQuery())}>
              Clear filters
            </Button>
          )}
        </FilterBar>
        <Table
          caption="Reservations"
          columns={columns}
          rows={items}
          loading={status === 'loading'}
          sortBy={query.sortBy}
          sortOrder={query.sortOrder}
          onSort={(sortBy, sortOrder) => setQuery({ sortBy, sortOrder })}
          onRowClick={(r) => navigate(`/reservations/${r.id}`)}
          empty={
            <EmptyState
              icon={CalendarDays}
              title={error ? 'Could not load reservations' : 'No reservations match your filters'}
              description={error ?? 'Adjust filters or create a new reservation.'}
            />
          }
        />
        <Pagination {...pagination} onPageChange={(page) => setQuery({ page })} onPageSizeChange={(pageSize) => setQuery({ pageSize })} />
      </Card>

      <Modal open={creating} onClose={closeCreate} title="New reservation" description="Only rooms free for the selected dates are offered." size="lg">
        {creating && (
          <ReservationForm
            prefill={prefill}
            onSubmit={(values) => dispatch(reservationsActions.create(values))}
            onCancel={closeCreate}
            submitting={mutation.status === 'pending'}
            serverErrors={mutation.fieldErrors}
          />
        )}
      </Modal>
    </div>
  );
}
