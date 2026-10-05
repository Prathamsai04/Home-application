import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { Crown, Pencil, Plus, Trash2, Users } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DetailItem,
  EmptyState,
  FilterBar,
  Modal,
  PageHeader,
  Pagination,
  PageLoader,
  SearchBar,
  Select,
  StatusBadge,
  Table,
} from '../../components/ui';
import { useMoney, useMutationSuccess, usePermission } from '../../hooks';
import { formatDate, humanize } from '../../lib/format';
import { GuestForm } from './GuestForm';
import { guestsActions } from './guestsSlice';

function GuestDetail({ onEdit }) {
  const money = useMoney();
  const { current, currentStatus, currentError } = useSelector((state) => state.guests);
  if (currentStatus === 'loading' && !current) return <PageLoader label="Loading guest…" />;
  if (currentError) return <EmptyState title="Could not load guest" description={currentError} />;
  if (!current) return null;
  return (
    <div className="space-y-5">
      <dl className="grid gap-4 sm:grid-cols-3">
        <DetailItem label="Email">{current.email}</DetailItem>
        <DetailItem label="Phone">{current.phone}</DetailItem>
        <DetailItem label="Nationality">{current.nationality}</DetailItem>
        <DetailItem label="City">{current.city || '—'}</DetailItem>
        <DetailItem label="ID">
          {humanize(current.idType)} {current.idNumberLast4 ? `••••${current.idNumberLast4}` : ''}
        </DetailItem>
        <DetailItem label="Lifetime value">{money(current.lifetimeValueMinor)}</DetailItem>
      </dl>
      {current.notes && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{current.notes}</p>}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Stay history ({current.reservations.length})</h3>
        {current.reservations.length === 0 ? (
          <p className="text-sm text-slate-500">No reservations yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {current.reservations.map((reservation) => (
              <li key={reservation.id}>
                <Link to={`/reservations/${reservation.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {reservation.code} · {reservation.propertyName}
                    </p>
                    <p className="text-xs text-slate-500">
                      Room {reservation.roomNumber} · {formatDate(reservation.checkIn)} → {formatDate(reservation.checkOut)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={reservation.status} />
                    <span className="text-xs text-slate-500">{money(reservation.totalAmountMinor)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {onEdit && (
        <div className="flex justify-end">
          <Button variant="secondary" icon={Pencil} onClick={() => onEdit(current)}>
            Edit guest
          </Button>
        </div>
      )}
    </div>
  );
}

export default function GuestsPage() {
  const dispatch = useDispatch();
  const allowed = usePermission();
  const { items, pagination, query, status, error, mutation, current } = useSelector((state) => state.guests);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(false);

  useEffect(() => {
    dispatch(guestsActions.fetchList());
  }, [dispatch]);

  useMutationSuccess('guests', guestsActions.resetMutation, ['create', 'update', 'remove'], () => {
    setEditing(null);
    setDeleting(null);
  });

  const setQuery = (change) => dispatch(guestsActions.setQuery(change));
  const closeEditor = () => {
    setEditing(null);
    dispatch(guestsActions.resetMutation());
  };
  const open = (guest) => {
    dispatch(guestsActions.fetchOne(guest.id));
    setViewing(true);
  };
  const submit = (values) =>
    editing?.id ? dispatch(guestsActions.update({ id: editing.id, data: values })) : dispatch(guestsActions.create(values));

  const columns = [
    {
      key: 'name',
      header: 'Guest',
      sortKey: 'name',
      render: (guest) => (
        <div className="flex items-center gap-2">
          <div>
            <p className="flex items-center gap-1.5 font-medium text-slate-900">
              {guest.fullName}
              {guest.vip && (
                <Badge tone="amber">
                  <Crown className="h-3 w-3" aria-hidden /> VIP
                </Badge>
              )}
            </p>
            <p className="text-xs text-slate-500">{guest.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone' },
    { key: 'nationality', header: 'Nationality', sortKey: 'nationality' },
    { key: 'reservationCount', header: 'Stays', sortKey: 'reservationCount', align: 'right' },
    { key: 'lastStay', header: 'Last stay', sortKey: 'lastStay', render: (guest) => formatDate(guest.lastStay) },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (guest) => (
        <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
          {allowed('guests:manage') && (
            <Button size="icon" variant="ghost" aria-label={`Edit ${guest.fullName}`} onClick={() => setEditing(guest)}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {allowed('guests:delete') && (
            <Button size="icon" variant="ghost" aria-label={`Delete ${guest.fullName}`} onClick={() => setDeleting(guest)}>
              <Trash2 className="h-4 w-4 text-rose-600" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Guests"
        description="Guest profiles, preferences and stay history."
        actions={
          allowed('guests:manage') && (
            <Button icon={Plus} onClick={() => setEditing({})}>
              Add guest
            </Button>
          )
        }
      />
      <Card>
        <FilterBar>
          <SearchBar value={query.search} onSearch={(search) => setQuery({ search })} placeholder="Search name, email or phone" />
          <Select
            aria-label="VIP filter"
            className="lg:w-40"
            placeholder="All guests"
            value={query.vip ?? ''}
            options={[
              { value: 'true', label: 'VIP only' },
              { value: 'false', label: 'Non-VIP' },
            ]}
            onChange={(e) => setQuery({ vip: e.target.value })}
          />
        </FilterBar>
        <Table
          caption="Guests"
          columns={columns}
          rows={items}
          loading={status === 'loading'}
          sortBy={query.sortBy}
          sortOrder={query.sortOrder}
          onSort={(sortBy, sortOrder) => setQuery({ sortBy, sortOrder })}
          onRowClick={open}
          empty={<EmptyState icon={Users} title={error ? 'Could not load guests' : 'No guests found'} description={error} />}
        />
        <Pagination {...pagination} onPageChange={(page) => setQuery({ page })} onPageSizeChange={(pageSize) => setQuery({ pageSize })} />
      </Card>

      <Modal
        open={viewing}
        onClose={() => {
          setViewing(false);
          dispatch(guestsActions.clearCurrent());
        }}
        title={current?.fullName ?? 'Guest'}
        size="lg"
      >
        <GuestDetail
          onEdit={
            allowed('guests:manage')
              ? (guest) => {
                  setViewing(false);
                  setEditing(guest);
                }
              : null
          }
        />
      </Modal>

      <Modal open={Boolean(editing)} onClose={closeEditor} title={editing?.id ? 'Edit guest' : 'Add guest'} size="lg">
        {editing && (
          <GuestForm
            guest={editing.id ? editing : null}
            onSubmit={submit}
            onCancel={closeEditor}
            submitting={mutation.status === 'pending'}
            serverErrors={mutation.fieldErrors}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete guest?"
        message={`${deleting?.fullName} will be removed. Guests with active or upcoming reservations cannot be deleted.`}
        confirmLabel="Delete guest"
        loading={mutation.status === 'pending'}
        onClose={() => setDeleting(null)}
        onConfirm={() => dispatch(guestsActions.remove(deleting.id))}
      />
    </div>
  );
}
