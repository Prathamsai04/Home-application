import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { BedDouble, CalendarSearch, Pencil, Plus, Trash2 } from 'lucide-react';
import { ROOM_STATUS, ROOM_TYPES, humanize } from '@homestay/shared';
import {
  Button,
  Card,
  ConfirmDialog,
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
import { AvailabilityPanel } from './AvailabilityPanel';
import { RoomForm } from './RoomForm';
import { roomsActions } from './roomsSlice';

export default function RoomsPage() {
  const dispatch = useDispatch();
  const money = useMoney();
  const allowed = usePermission();
  const [searchParams] = useSearchParams();
  const properties = useSelector((state) => state.lookups.data.properties);
  const { items, pagination, query, status, error, mutation } = useSelector((state) => state.rooms);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const propertyId = searchParams.get('propertyId');
    if (propertyId) dispatch(roomsActions.setQuery({ propertyId }));
    else dispatch(roomsActions.fetchList());
  }, [dispatch, searchParams]);

  useMutationSuccess('rooms', roomsActions.resetMutation, ['create', 'update', 'remove'], () => {
    setEditing(null);
    setDeleting(null);
  });

  const closeEditor = () => {
    setEditing(null);
    dispatch(roomsActions.resetMutation());
  };
  const setQuery = (change) => dispatch(roomsActions.setQuery(change));
  const submit = (values) =>
    editing?.id ? dispatch(roomsActions.update({ id: editing.id, data: values })) : dispatch(roomsActions.create(values));

  const columns = [
    {
      key: 'number',
      header: 'Room',
      sortKey: 'number',
      render: (room) => (
        <div>
          <p className="font-medium text-slate-900">{room.number}</p>
          <p className="text-xs text-slate-500">{room.name}</p>
        </div>
      ),
    },
    { key: 'propertyName', header: 'Property', sortKey: 'propertyName' },
    { key: 'type', header: 'Type', sortKey: 'type', render: (room) => humanize(room.type) },
    { key: 'capacity', header: 'Guests', sortKey: 'capacity' },
    { key: 'baseRate', header: 'Rate / night', sortKey: 'baseRate', align: 'right', render: (room) => money(room.baseRateMinor) },
    { key: 'status', header: 'Status', sortKey: 'status', render: (room) => <StatusBadge status={room.status} title={room.statusReason} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (room) => (
        <div className="flex justify-end gap-1">
          {allowed('rooms:manage') && (
            <Button size="icon" variant="ghost" aria-label={`Edit room ${room.number}`} onClick={() => setEditing(room)}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {allowed('rooms:delete') && (
            <Button size="icon" variant="ghost" aria-label={`Delete room ${room.number}`} onClick={() => setDeleting(room)}>
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
        title="Rooms"
        description="Status is calculated live from reservations, housekeeping and maintenance."
        actions={
          <>
            <Button variant="secondary" icon={CalendarSearch} onClick={() => setSearching(true)}>
              Check availability
            </Button>
            {allowed('rooms:manage') && (
              <Button icon={Plus} onClick={() => setEditing({})}>
                Add room
              </Button>
            )}
          </>
        }
      />
      <Card>
        <FilterBar>
          <SearchBar value={query.search} onSearch={(search) => setQuery({ search })} placeholder="Search room or property" />
          <Select
            aria-label="Property"
            className="lg:w-52"
            placeholder="All properties"
            value={query.propertyId}
            options={properties.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(e) => setQuery({ propertyId: e.target.value })}
          />
          <Select aria-label="Type" className="lg:w-40" placeholder="All types" value={query.type} options={toOptions(ROOM_TYPES, humanize)} onChange={(e) => setQuery({ type: e.target.value })} />
          <Select
            aria-label="Status"
            className="lg:w-44"
            placeholder="All statuses"
            value={query.status}
            options={toOptions(Object.values(ROOM_STATUS), humanize)}
            onChange={(e) => setQuery({ status: e.target.value })}
          />
        </FilterBar>
        <Table
          caption="Rooms"
          columns={columns}
          rows={items}
          loading={status === 'loading'}
          sortBy={query.sortBy}
          sortOrder={query.sortOrder}
          onSort={(sortBy, sortOrder) => setQuery({ sortBy, sortOrder })}
          empty={<EmptyState icon={BedDouble} title={error ? 'Could not load rooms' : 'No rooms match your filters'} description={error} />}
        />
        <Pagination
          {...pagination}
          onPageChange={(page) => setQuery({ page })}
          onPageSizeChange={(pageSize) => setQuery({ pageSize })}
        />
      </Card>

      <Modal open={Boolean(editing)} onClose={closeEditor} title={editing?.id ? `Edit room ${editing.number}` : 'Add room'} size="lg">
        {editing && (
          <RoomForm
            room={editing.id ? editing : null}
            onSubmit={submit}
            onCancel={closeEditor}
            submitting={mutation.status === 'pending'}
            serverErrors={mutation.fieldErrors}
          />
        )}
      </Modal>

      <Modal open={searching} onClose={() => setSearching(false)} title="Check availability" description="Rooms with conflicts or open maintenance are excluded." size="lg">
        <AvailabilityPanel onClose={() => setSearching(false)} />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete room?"
        message={`Room ${deleting?.number} (${deleting?.propertyName}) will be removed. Rooms with active or upcoming reservations cannot be deleted.`}
        confirmLabel="Delete room"
        loading={mutation.status === 'pending'}
        onClose={() => setDeleting(null)}
        onConfirm={() => dispatch(roomsActions.remove(deleting.id))}
      />
    </div>
  );
}
