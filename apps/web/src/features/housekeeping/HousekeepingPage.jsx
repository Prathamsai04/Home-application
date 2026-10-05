import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, Pencil, Play, Plus, RotateCcw, Sparkles, Trash2, UserPlus } from 'lucide-react';
import { HOUSEKEEPING_STATUS, PRIORITIES, humanize } from '@homestay/shared';
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
import { formatShortDate } from '../../lib/format';
import { HousekeepingForm } from './HousekeepingForm';
import { housekeepingActions } from './housekeepingSlice';

const STATUS_TABS = [{ value: '', label: 'All' }, ...Object.values(HOUSEKEEPING_STATUS).map((value) => ({ value, label: humanize(value) }))];

export default function HousekeepingPage() {
  const dispatch = useDispatch();
  const allowed = usePermission();
  const { properties, staff } = useSelector((state) => state.lookups.data);
  const { items, pagination, query, status, error, mutation } = useSelector((state) => state.housekeeping);
  const [editing, setEditing] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [completing, setCompleting] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    dispatch(housekeepingActions.fetchList());
  }, [dispatch]);

  useMutationSuccess('housekeeping', housekeepingActions.resetMutation, ['create', 'update', 'remove', 'assign', 'complete'], () => {
    setEditing(null);
    setAssigning(null);
    setCompleting(null);
    setDeleting(null);
  });

  const setQuery = (change) => dispatch(housekeepingActions.setQuery(change));
  const run = (id, action, data) => dispatch(housekeepingActions.runAction({ id, action, data }));
  const closeEditor = () => {
    setEditing(null);
    dispatch(housekeepingActions.resetMutation());
  };
  const busy = (task, action) => mutation.status === 'pending' && mutation.targetId === task.id && mutation.action === action;

  const columns = [
    {
      key: 'roomNumber',
      header: 'Room',
      sortKey: 'roomNumber',
      render: (task) => (
        <div>
          <p className="font-medium text-slate-900">Room {task.roomNumber}</p>
          <p className="text-xs text-slate-500">{task.propertyName}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Task',
      sortKey: 'type',
      render: (task) => (
        <div className="max-w-[220px] whitespace-normal">
          <p className="text-slate-800">{humanize(task.type)}</p>
          {task.notes && <p className="truncate text-xs text-slate-500">{task.notes}</p>}
        </div>
      ),
    },
    { key: 'priority', header: 'Priority', sortKey: 'priority', render: (task) => <StatusBadge status={task.priority} dot={false} /> },
    {
      key: 'dueDate',
      header: 'Due',
      sortKey: 'dueDate',
      render: (task) => (
        <span className="flex items-center gap-1.5">
          {formatShortDate(task.dueDate)}
          {task.overdue && <Badge tone="red">Overdue</Badge>}
        </span>
      ),
    },
    { key: 'assigneeName', header: 'Assignee', render: (task) => task.assigneeName ?? <span className="text-slate-400">Unassigned</span> },
    { key: 'status', header: 'Status', sortKey: 'status', render: (task) => <StatusBadge status={task.status} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (task) => (
        <div className="flex justify-end gap-1">
          {task.status === 'pending' && allowed('housekeeping:operate') && (
            <Button size="xs" variant="soft" icon={Play} loading={busy(task, 'start')} onClick={() => run(task.id, 'start')}>
              Start
            </Button>
          )}
          {task.status !== 'completed' && allowed('housekeeping:operate') && (
            <Button size="xs" variant="soft" icon={CheckCircle2} onClick={() => setCompleting(task)}>
              Complete
            </Button>
          )}
          {task.status !== 'completed' && allowed('housekeeping:manage') && (
            <Button size="icon" variant="ghost" aria-label="Assign task" onClick={() => setAssigning(task)}>
              <UserPlus className="h-4 w-4" />
            </Button>
          )}
          {task.status === 'completed' && allowed('housekeeping:manage') && (
            <Button size="xs" variant="ghost" icon={RotateCcw} loading={busy(task, 'reopen')} onClick={() => run(task.id, 'reopen')}>
              Reopen
            </Button>
          )}
          {task.status !== 'completed' && allowed('housekeeping:manage') && (
            <Button size="icon" variant="ghost" aria-label="Edit task" onClick={() => setEditing(task)}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {allowed('housekeeping:manage') && (
            <Button size="icon" variant="ghost" aria-label="Delete task" onClick={() => setDeleting(task)}>
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
        title="Housekeeping"
        description="Cleaning tasks keep rooms in 'Cleaning' status until completed."
        actions={
          allowed('housekeeping:manage') && (
            <Button icon={Plus} onClick={() => setEditing({})}>
              New task
            </Button>
          )
        }
      />
      <Card>
        <FilterBar>
          <Segmented label="Status" options={STATUS_TABS} value={query.status} onChange={(value) => setQuery({ status: value })} />
          <SearchBar value={query.search} onSearch={(search) => setQuery({ search })} placeholder="Search room, type or assignee" />
          <Select
            aria-label="Priority"
            className="lg:w-36"
            placeholder="All priorities"
            value={query.priority}
            options={toOptions(Object.values(PRIORITIES), humanize)}
            onChange={(e) => setQuery({ priority: e.target.value })}
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
            aria-label="Assignee"
            className="lg:w-44"
            placeholder="Anyone"
            value={query.assignedTo}
            options={staff.map((s) => ({ value: s.id, label: s.name }))}
            onChange={(e) => setQuery({ assignedTo: e.target.value })}
          />
        </FilterBar>
        <Table
          caption="Housekeeping tasks"
          columns={columns}
          rows={items}
          loading={status === 'loading'}
          sortBy={query.sortBy}
          sortOrder={query.sortOrder}
          onSort={(sortBy, sortOrder) => setQuery({ sortBy, sortOrder })}
          empty={<EmptyState icon={Sparkles} title={error ? 'Could not load tasks' : 'No housekeeping tasks'} description={error ?? 'Everything is spotless.'} />}
        />
        <Pagination {...pagination} onPageChange={(page) => setQuery({ page })} onPageSizeChange={(pageSize) => setQuery({ pageSize })} />
      </Card>

      <Modal open={Boolean(editing)} onClose={closeEditor} title={editing?.id ? 'Edit task' : 'New housekeeping task'}>
        {editing && (
          <HousekeepingForm
            task={editing.id ? editing : null}
            submitting={mutation.status === 'pending'}
            serverErrors={mutation.fieldErrors}
            onCancel={closeEditor}
            onSubmit={(data) =>
              editing.id ? dispatch(housekeepingActions.update({ id: editing.id, data })) : dispatch(housekeepingActions.create(data))
            }
          />
        )}
      </Modal>

      <AssignDialog
        open={Boolean(assigning)}
        title={`Assign room ${assigning?.roomNumber ?? ''} task`}
        currentAssignee={assigning?.assignedTo}
        loading={mutation.status === 'pending'}
        onClose={() => setAssigning(null)}
        onAssign={(assigneeId) => run(assigning.id, 'assign', { assigneeId })}
      />

      <NotesDialog
        open={Boolean(completing)}
        title={`Complete ${humanize(completing?.type ?? '')}`}
        label="Completion notes"
        confirmLabel="Mark complete"
        loading={mutation.status === 'pending'}
        onClose={() => setCompleting(null)}
        onSubmit={(notes) => run(completing.id, 'complete', notes ? { notes } : {})}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete task?"
        message={`${humanize(deleting?.type ?? '')} for room ${deleting?.roomNumber} will be removed.`}
        confirmLabel="Delete"
        loading={mutation.status === 'pending'}
        onClose={() => setDeleting(null)}
        onConfirm={() => dispatch(housekeepingActions.remove(deleting.id))}
      />
    </div>
  );
}
