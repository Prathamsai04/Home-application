import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { Building, Database, RefreshCw, RotateCcw, Server } from 'lucide-react';
import { CURRENCIES, humanize, settingsSchema } from '@homestay/shared';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  DetailItem,
  Input,
  PageHeader,
  PageLoader,
  Select,
  toOptions,
} from '../../components/ui';
import { usePermission, useServerErrors } from '../../hooks';
import { formatDate, formatDateTime } from '../../lib/format';
import { demoActions } from '../demo/demoSlice';
import { settingsActions } from './settingsSlice';

const TIME_ZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'UTC'];

function SettingsForm({ settings, canEdit }) {
  const dispatch = useDispatch();
  const { saving, fieldErrors } = useSelector((state) => state.settings);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(settingsSchema), defaultValues: settings });
  useServerErrors(fieldErrors, setError);
  useEffect(() => reset(settings), [settings, reset]);

  return (
    <form onSubmit={handleSubmit((values) => dispatch(settingsActions.saveSettings(values)))} noValidate>
      <fieldset disabled={!canEdit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Business name" required className="sm:col-span-2" error={errors.businessName?.message} {...register('businessName')} />
          <Input label="Contact email" type="email" error={errors.contactEmail?.message} {...register('contactEmail')} />
          <Input label="Contact phone" type="tel" error={errors.contactPhone?.message} {...register('contactPhone')} />
          <Select label="Currency" options={toOptions(CURRENCIES)} error={errors.currency?.message} {...register('currency')} />
          <Select
            label="Time zone"
            hint="Determines the business date for arrivals and dashboards"
            options={toOptions(TIME_ZONES)}
            error={errors.timezone?.message}
            {...register('timezone')}
          />
          <Input label="Default check-in time" type="time" error={errors.defaultCheckInTime?.message} {...register('defaultCheckInTime')} />
          <Input label="Default check-out time" type="time" error={errors.defaultCheckOutTime?.message} {...register('defaultCheckOutTime')} />
        </div>
        <div className="space-y-3 rounded-xl bg-slate-50 p-4">
          <Checkbox label="Auto-create cleaning task on checkout" description="Creates a high-priority checkout clean when a guest leaves." {...register('autoCreateCheckoutTask')} />
          <Checkbox label="Notify on new reservations" {...register('notifyOnNewReservation')} />
          <Checkbox label="Notify on payments" {...register('notifyOnPayment')} />
          <Checkbox label="Notify on high-priority maintenance" {...register('notifyOnMaintenance')} />
        </div>
      </fieldset>
      {canEdit ? (
        <div className="mt-4 flex justify-end">
          <Button type="submit" loading={saving} disabled={!isDirty}>
            Save settings
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-slate-500">Only owners can change business settings.</p>
      )}
    </form>
  );
}

export default function SettingsPage() {
  const dispatch = useDispatch();
  const allowed = usePermission();
  const { data, status, error } = useSelector((state) => state.settings);
  const demo = useSelector((state) => state.demo);
  const user = useSelector((state) => state.auth.user);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    dispatch(settingsActions.fetchSettings());
    dispatch(demoActions.fetchStatus());
  }, [dispatch]);

  const seed = demo.status;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Business configuration and demo environment controls." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Business settings" icon={Building} />
          <CardBody>
            {status === 'failed' ? (
              <p className="text-sm text-rose-600">{error}</p>
            ) : !data ? (
              <PageLoader label="Loading settings…" />
            ) : (
              <SettingsForm settings={data} canEdit={allowed('settings:manage')} />
            )}
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Your profile" />
            <CardBody>
              <dl className="space-y-3">
                <DetailItem label="Name">{user?.name}</DetailItem>
                <DetailItem label="Email">{user?.email}</DetailItem>
                <DetailItem label="Role">{humanize(user?.role)}</DetailItem>
                <DetailItem label="Last sign-in">{formatDateTime(user?.lastLoginAt)}</DetailItem>
              </dl>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Demo environment" description="Seeded, in-memory and temporary" icon={Database} />
            <CardBody className="space-y-4">
              {seed ? (
                <dl className="grid grid-cols-2 gap-3">
                  <DetailItem label="Seed version">{seed.seedVersion}</DetailItem>
                  <DetailItem label="Anchor date">{formatDate(seed.anchorDate)}</DetailItem>
                  <DetailItem label="Seeded at">{formatDateTime(seed.seededAt)}</DetailItem>
                  <DetailItem label="Reason">{humanize(seed.seedReason)}</DetailItem>
                  <DetailItem label="Instance">
                    <span className="inline-flex items-center gap-1">
                      <Server className="h-3.5 w-3.5" aria-hidden /> {seed.instanceId}
                    </span>
                  </DetailItem>
                  <DetailItem label="Storage">
                    {humanize(seed.storageProvider)} · {seed.persistence}
                  </DetailItem>
                  <DetailItem label="Reservations">{seed.counts.reservations}</DetailItem>
                  <DetailItem label="Payments">{seed.counts.payments}</DetailItem>
                </dl>
              ) : (
                <PageLoader label="Loading seed status…" />
              )}
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                Each serverless instance keeps its own in-memory copy of the data. Cold starts, scaling and redeploys restore the deterministic seed.
              </p>
              {allowed('demo:manage') && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" icon={RefreshCw} loading={demo.pendingAction === 'reload'} onClick={() => setConfirm('reload')}>
                    Reload seed data
                  </Button>
                  <Button variant="danger" icon={RotateCcw} loading={demo.pendingAction === 'reset'} onClick={() => setConfirm('reset')}>
                    Reset demo data
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(confirm)}
        tone="warning"
        title={confirm === 'reset' ? 'Reset demo data?' : 'Reload seed data?'}
        message="All changes made on this server instance will be discarded."
        confirmLabel={confirm === 'reset' ? 'Reset data' : 'Reload seed'}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          dispatch(confirm === 'reset' ? demoActions.resetRequest() : demoActions.reloadRequest());
          setConfirm(null);
        }}
      />
    </div>
  );
}
