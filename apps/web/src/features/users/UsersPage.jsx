import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { z } from 'zod';
import { Pencil, Plus, Trash2, UserCog } from 'lucide-react';
import { ROLES, humanize, passwordSchema, userBaseSchema } from '@homestay/shared';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  FilterBar,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SearchBar,
  Select,
  StatusBadge,
  Table,
  toOptions,
} from '../../components/ui';
import { useMutationSuccess, usePermission, useServerErrors } from '../../hooks';
import { formatDateTime, initials } from '../../lib/format';
import { usersActions } from './usersSlice';

const createSchema = userBaseSchema;
const editSchema = userBaseSchema.extend({ password: z.union([z.literal(''), passwordSchema]).optional() });

function UserForm({ user, onSubmit, onCancel, submitting, serverErrors }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(user ? editSchema : createSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      role: user?.role ?? ROLES.STAFF,
      phone: user?.phone ?? '',
      jobTitle: user?.jobTitle ?? '',
      active: user?.active ?? true,
      password: '',
    },
  });
  useServerErrors(serverErrors, setError);

  const submit = ({ password, phone, ...values }) =>
    onSubmit({ ...values, ...(phone ? { phone } : {}), ...(password ? { password } : {}) });

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" required error={errors.name?.message} {...register('name')} />
        <Input label="Email" type="email" required error={errors.email?.message} {...register('email')} />
        <Select label="Role" options={toOptions(Object.values(ROLES), humanize)} error={errors.role?.message} {...register('role')} />
        <Input label="Job title" error={errors.jobTitle?.message} {...register('jobTitle')} />
        <Input label="Phone" type="tel" error={errors.phone?.message} {...register('phone', { setValueAs: (v) => (v === '' ? undefined : v) })} />
        <Input
          label={user ? 'New password' : 'Password'}
          type="password"
          autoComplete="new-password"
          required={!user}
          hint={user ? 'Leave blank to keep the current password' : '8+ chars with upper, lower and a digit'}
          error={errors.password?.message}
          {...register('password')}
        />
      </div>
      <Checkbox label="Active" description="Inactive users cannot sign in." {...register('active')} />
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {user ? 'Save changes' : 'Create user'}
        </Button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const dispatch = useDispatch();
  const allowed = usePermission();
  const currentUserId = useSelector((state) => state.auth.user?.id);
  const { items, pagination, query, status, error, mutation } = useSelector((state) => state.users);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const canManage = allowed('users:manage');

  useEffect(() => {
    dispatch(usersActions.fetchList());
  }, [dispatch]);

  useMutationSuccess('users', usersActions.resetMutation, ['create', 'update', 'remove'], () => {
    setEditing(null);
    setDeleting(null);
  });

  const setQuery = (change) => dispatch(usersActions.setQuery(change));
  const closeEditor = () => {
    setEditing(null);
    dispatch(usersActions.resetMutation());
  };

  const columns = [
    {
      key: 'name',
      header: 'User',
      sortKey: 'name',
      render: (user) => (
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">{initials(user.name)}</span>
          <div>
            <p className="font-medium text-slate-900">
              {user.name} {user.id === currentUserId && <Badge tone="gray">You</Badge>}
            </p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', sortKey: 'role', render: (user) => <StatusBadge status={user.role} dot={false} /> },
    { key: 'jobTitle', header: 'Job title', render: (user) => user.jobTitle || '—' },
    { key: 'active', header: 'Status', render: (user) => <StatusBadge status={user.active ? 'active' : 'inactive'} /> },
    { key: 'lastLoginAt', header: 'Last sign-in', sortKey: 'lastLoginAt', render: (user) => formatDateTime(user.lastLoginAt) },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (user) =>
        canManage && (
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" aria-label={`Edit ${user.name}`} onClick={() => setEditing(user)}>
              <Pencil className="h-4 w-4" />
            </Button>
            {user.id !== currentUserId && (
              <Button size="icon" variant="ghost" aria-label={`Delete ${user.name}`} onClick={() => setDeleting(user)}>
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
        title="User management"
        description={canManage ? 'Invite team members and control their roles.' : 'Team directory (read-only for managers).'}
        actions={
          canManage && (
            <Button icon={Plus} onClick={() => setEditing({})}>
              Add user
            </Button>
          )
        }
      />
      <Card>
        <FilterBar>
          <SearchBar value={query.search} onSearch={(search) => setQuery({ search })} placeholder="Search name, email or title" />
          <Select
            aria-label="Role"
            className="lg:w-40"
            placeholder="All roles"
            value={query.role ?? ''}
            options={toOptions(Object.values(ROLES), humanize)}
            onChange={(e) => setQuery({ role: e.target.value })}
          />
        </FilterBar>
        <Table
          caption="Users"
          columns={columns}
          rows={items}
          loading={status === 'loading'}
          sortBy={query.sortBy}
          sortOrder={query.sortOrder}
          onSort={(sortBy, sortOrder) => setQuery({ sortBy, sortOrder })}
          empty={<EmptyState icon={UserCog} title={error ? 'Could not load users' : 'No users found'} description={error} />}
        />
        <Pagination {...pagination} onPageChange={(page) => setQuery({ page })} onPageSizeChange={(pageSize) => setQuery({ pageSize })} />
      </Card>

      <Modal open={Boolean(editing)} onClose={closeEditor} title={editing?.id ? `Edit ${editing.name}` : 'Add user'} size="lg">
        {editing && (
          <UserForm
            user={editing.id ? editing : null}
            submitting={mutation.status === 'pending'}
            serverErrors={mutation.fieldErrors}
            onCancel={closeEditor}
            onSubmit={(data) => (editing.id ? dispatch(usersActions.update({ id: editing.id, data })) : dispatch(usersActions.create(data)))}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete user?"
        message={`${deleting?.name} will lose access. Their open tasks will become unassigned.`}
        confirmLabel="Delete user"
        loading={mutation.status === 'pending'}
        onClose={() => setDeleting(null)}
        onConfirm={() => dispatch(usersActions.remove(deleting.id))}
      />
    </div>
  );
}
