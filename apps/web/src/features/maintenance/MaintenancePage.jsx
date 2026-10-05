import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, Lock, Pencil, Play, Plus, Trash2, UserPlus, Wrench } from 'lucide-react';
import { MAINTENANCE_CATEGORIES, MAINTENANCE_STATUS, PRIORITIES, humanize } from '@homestay/shared';
import { AssignDialog, NotesDialog } from '../../components/WorkDialogs';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FilterBar,
  Modal,
  PageHeader,
  Pagination,
  SearchBar,
  Segmented,
  Select,
  StatusBadge,
  Table,
  toOptions,
} from '../../components/ui';
import { useMutationSuccess, usePermission } from '../../hooks';
import { timeAgo } from '../../lib/format';
import { MaintenanceForm } from './MaintenanceForm';
import { maintenanceActions } from './maintenanceSlice';

const STATUS_TABS = [{ value: '', label: 'All' }, ...Object.values(MAINTENANCE_STATUS).map((value) => ({ value, label: humanize(value) }))];

export default function MaintenancePage() {
  const dispatch = useDispatch();
  const allowed = usePermission();
  const properties = useSelector((state) => state.lookups.data.properties);
  const { items, pagination, query, status, error, mutation } = useSelector((state) => state.maintenance);
  const [editing, setEditing] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [resolving, setResolving] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    dispatch(maintenanceActions.fetchList());
  }, [dispatch]);

  useMutationSuccess('maintenance', maintenanceActions.resetMutation, ['create', 'update', 'remove', 'assign', 'resolve'], () => {
    setEditing(null);
    setAssigning(null);
    setResolving(null);
    setDeleting(null);
  });

  const setQuery = (change) => dispatch(maintenanceActions.setQuery(change));
  const run = (id, action, data) => dispatch(maintenanceActions.runAction({ id, action, data }));
  const closeEditor = () => {
    setEditing(null);
    dispatch(maintenanceActions.resetMutation());
  };

  const columns = [
    {
      key: 'title',
      header: 'Issue',
      sortKey: 'title',
      render: (request) => (
        <div className="max-w-[260px] whitespace-normal">
          <p className="flex items-center gap-1.5 font-medium text-slate-900">
            {request.title}
            {request.blocksRoom && request.status !== 'resolved' && (
              <Badge tone="red" title="Room blocked for bookings">
                <Lock className="h-3 w-3" aria-hidden /> Blocking
              </Badge>
            )}
          </p>
          <p className="truncate text-xs text-slate-500">{request.description || humanize(request.category)}</p>
        </div>
      ),
    },
    {
      key: 'roomNumber',
      header: 'Room',
      sortKey: 'roomNumber',
      render: (request) => (
        <div>
          <p className="text-slate-800">Room {request.roomNumber}</p>
          <p className="text-xs text-slate-500">{request.propertyName}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (request) => humanize(request.category) },
    { key: 'priority', header: 'Priority', sortKey: 'priority', render: (request) => <StatusBadge status={request.priority} dot={false} /> },
    { key: 'assigneeName', header: 'Assignee', render: (request) => request.assigneeName ?? <span className="text-slate-400">Unassigned</span> },
    {
      key: 'reportedAt',
      header: 'Reported',
      sortKey: 'reportedAt',
      render: (request) => (
        <div>
          <p>{timeAgo(request.reportedAt)}</p>
          <p className="text-xs text-slate-500">by {request.reporterName}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', sortKey: 'status', render: (request) => <StatusBadge status={request.status} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (request) => (
        <div className="flex justify-end gap-1">
          {request.status === 'assigned' && allowed('maintenance:operate') && (
            <Button
              size="xs"
              variant="soft"
              icon={Play}
              loading={mutation.status === 'pending' && mutation.targetId === request.id && mutation.action === 'start'}
              onClick={() => run(request.id, 'start')}
            >
              Start
            </Button>
          )}
          {['assigned', 'in_progress'].includes(request.status) && allowed('maintenance:operate') && (
            <Button size="xs" variant="soft" icon={CheckCircle2} onClick={() => setResolving(request)}>
              Resolve
            </Button>
          )}
          {request.status !== 'resolved' && allowed('maintenance:manage') && (
            <>
              <Button size="icon" variant="ghost" aria-label="Assign request" onClick={() => setAssigning(request)}>
                <UserPlus className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" aria-label="Edit request" onClick={() => setEditing(request)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </>
          )}
          {allowed('maintenance:manage') && (
            <Button size="icon" variant="ghost" aria-label="Delete request" onClick={() => setDeleting(request)}>
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
        title="Maintenance"
        description="Requests that block a room keep it unavailable for booking until resolved."
        actions={
          allowed('maintenance:create') && (
            <Button icon={Plus} onClick={() => setEditing({})}>
              Report issue
            </Button>
          )
        }
      />
      <Card>
        <FilterBar>
          <Segmented label="Status" options={STATUS_TABS} value={query.status} onChange={(value) => setQuery({ status: value })} />
          <SearchBar value={query.search} onSearch={(search) => setQuery({ search })} placeholder="Search issue or room" />
          <Select
            aria-label="Priority"
            className="lg:w-36"
            placeholder="All priorities"
            value={query.priority}
            options={toOptions(Object.values(PRIORITIES), humanize)}
            onChange={(e) => setQuery({ priority: e.target.value })}
          />
          <Select
            aria-label="Category"
            className="lg:w-40"
            placeholder="All categories"
            value={query.category}
            options={toOptions(MAINTENANCE_CATEGORIES, humanize)}
            onChange={(e) => setQuery({ category: e.target.value })}
          />
          <Select
            aria-label="Property"
            className="lg:w-48"
            placeholder="All properties"
            value={query.propertyId}
            options={properties.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(e) => setQuery({ propertyId: e.target.value })}
          />
        </FilterBar>
        <Table
          caption="Maintenance requests"
          columns={columns}
          rows={items}
          loading={status === 'loading'}
          sortBy={query.sortBy}
          sortOrder={query.sortOrder}
          onSort={(sortBy, sortOrder) => setQuery({ sortBy, sortOrder })}
          empty={<EmptyState icon={Wrench} title={error ? 'Could not load requests' : 'No maintenance requests'} description={error} />}
        />
        <Pagination {...pagination} onPageChange={(page) => setQuery({ page })} onPageSizeChange={(pageSize) => setQuery({ pageSize })} />
      </Card>

      <Modal open={Boolean(editing)} onClose={closeEditor} title={editing?.id ? 'Edit request' : 'Report maintenance issue'}>
        {editing && (
          <MaintenanceForm
            request={editing.id ? editing : null}
            submitting={mutation.status === 'pending'}
            serverErrors={mutation.fieldErrors}
            onCancel={closeEditor}
            onSubmit={(data) =>
              editing.id ? dispatch(maintenanceActions.update({ id: editing.id, data })) : dispatch(maintenanceActions.create(data))
            }
          />
        )}
      </Modal>

      <AssignDialog
        open={Boolean(assigning)}
        title={`Assign "${assigning?.title ?? ''}"`}
        currentAssignee={assigning?.assignedTo}
        loading={mutation.status === 'pending'}
        onClose={() => setAssigning(null)}
        onAssign={(assigneeId) => run(assigning.id, 'assign', { assigneeId })}
      />

      <NotesDialog
        open={Boolean(resolving)}
        title={`Resolve "${resolving?.title ?? ''}"`}
        label="Resolution notes"
        required
        confirmLabel="Mark resolved"
        loading={mutation.status === 'pending'}
        error={mutation.fieldErrors?.resolutionNotes}
        onClose={() => setResolving(null)}
        onSubmit={(resolutionNotes) => run(resolving.id, 'resolve', { resolutionNotes })}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete request?"
        message={`"${deleting?.title}" will be removed${deleting?.blocksRoom ? ' and the room unblocked' : ''}.`}
        confirmLabel="Delete"
        loading={mutation.status === 'pending'}
        onClose={() => setDeleting(null)}
        onConfirm={() => dispatch(maintenanceActions.remove(deleting.id))}
      />
    </div>
  );
}
