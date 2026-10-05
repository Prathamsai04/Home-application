import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { AlertOctagon, Bell, CheckCheck, CheckCircle2, Info, Megaphone, TriangleAlert, X } from 'lucide-react';
import { NOTIFICATION_SEVERITY, ROLES, humanize, notificationBroadcastSchema } from '@homestay/shared';
import {
  Button,
  Card,
  Checkbox,
  EmptyState,
  FilterBar,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Segmented,
  Select,
  Skeleton,
  Textarea,
  toOptions,
} from '../../components/ui';
import { useMutationSuccess, usePermission, useServerErrors } from '../../hooks';
import { timeAgo } from '../../lib/format';
import { notificationsActions } from './notificationsSlice';

const SEVERITY_ICON = {
  info: { icon: Info, className: 'bg-sky-50 text-sky-600' },
  success: { icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-600' },
  warning: { icon: TriangleAlert, className: 'bg-amber-50 text-amber-600' },
  critical: { icon: AlertOctagon, className: 'bg-rose-50 text-rose-600' },
};

function BroadcastForm({ onSubmit, onCancel, submitting, serverErrors }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(notificationBroadcastSchema),
    defaultValues: { title: '', message: '', severity: 'info', roles: Object.values(ROLES) },
  });
  useServerErrors(serverErrors, setError);
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Input label="Title" required error={errors.title?.message} {...register('title')} />
      <Textarea label="Message" required rows={3} error={errors.message?.message} {...register('message')} />
      <Select label="Severity" options={toOptions(Object.values(NOTIFICATION_SEVERITY), humanize)} {...register('severity')} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Audience</legend>
        <div className="flex flex-wrap gap-4">
          {Object.values(ROLES).map((role) => (
            <Checkbox key={role} label={humanize(role)} value={role} {...register('roles')} />
          ))}
        </div>
        {errors.roles && <p className="mt-1 text-xs text-rose-600">{errors.roles.message}</p>}
      </fieldset>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" icon={Megaphone} loading={submitting}>
          Send announcement
        </Button>
      </div>
    </form>
  );
}

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const allowed = usePermission();
  const { items, pagination, query, status, error, mutation, meta } = useSelector((state) => state.notifications);
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    dispatch(notificationsActions.fetchList());
  }, [dispatch]);

  useMutationSuccess('notifications', notificationsActions.resetMutation, ['create', 'remove', 'markRead', 'markAllRead'], () =>
    setBroadcasting(false),
  );

  const setQuery = (change) => dispatch(notificationsActions.setQuery(change));
  const unread = meta?.unreadCount ?? 0;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={`${unread} unread`}
        actions={
          <>
            <Button
              variant="secondary"
              icon={CheckCheck}
              disabled={!unread}
              onClick={() => dispatch(notificationsActions.runAction({ action: 'markAllRead' }))}
            >
              Mark all read
            </Button>
            {allowed('notifications:broadcast') && (
              <Button icon={Megaphone} onClick={() => setBroadcasting(true)}>
                Announcement
              </Button>
            )}
          </>
        }
      />
      <Card>
        <FilterBar>
          <Segmented
            label="Read filter"
            value={query.unreadOnly}
            onChange={(unreadOnly) => setQuery({ unreadOnly })}
            options={[
              { value: '', label: 'All' },
              { value: 'true', label: 'Unread' },
            ]}
          />
          <Select
            aria-label="Severity"
            className="lg:w-40"
            placeholder="All severities"
            value={query.severity}
            options={toOptions(Object.values(NOTIFICATION_SEVERITY), humanize)}
            onChange={(e) => setQuery({ severity: e.target.value })}
          />
        </FilterBar>
        {status === 'loading' && !items.length ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : !items.length ? (
          <EmptyState icon={Bell} title={error ? 'Could not load notifications' : "You're all caught up"} description={error} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((notification) => {
              const style = SEVERITY_ICON[notification.severity] ?? SEVERITY_ICON.info;
              const Icon = style.icon;
              return (
                <li key={notification.id} className={`flex gap-4 px-4 py-4 ${notification.read ? '' : 'bg-brand-50/40'}`}>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.className}`}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className={`text-sm ${notification.read ? 'text-slate-700' : 'font-semibold text-slate-900'}`}>{notification.title}</p>
                      <span className="whitespace-nowrap text-xs text-slate-400">{timeAgo(notification.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600">{notification.message}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      {notification.link && notification.link !== '/notifications' && (
                        <Link
                          to={notification.link}
                          className="font-medium text-brand-700 hover:underline"
                          onClick={() => !notification.read && dispatch(notificationsActions.runAction({ id: notification.id, action: 'markRead' }))}
                        >
                          Open
                        </Link>
                      )}
                      {!notification.read && (
                        <button
                          type="button"
                          className="font-medium text-slate-600 hover:text-slate-900"
                          onClick={() => dispatch(notificationsActions.runAction({ id: notification.id, action: 'markRead' }))}
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="self-start rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label={`Dismiss ${notification.title}`}
                    onClick={() => dispatch(notificationsActions.remove(notification.id))}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <Pagination {...pagination} onPageChange={(page) => setQuery({ page })} onPageSizeChange={(pageSize) => setQuery({ pageSize })} />
      </Card>

      <Modal
        open={broadcasting}
        onClose={() => {
          setBroadcasting(false);
          dispatch(notificationsActions.resetMutation());
        }}
        title="Send announcement"
      >
        {broadcasting && (
          <BroadcastForm
            submitting={mutation.status === 'pending'}
            serverErrors={mutation.fieldErrors}
            onCancel={() => setBroadcasting(false)}
            onSubmit={(data) => dispatch(notificationsActions.create(data))}
          />
        )}
      </Modal>
    </div>
  );
}
