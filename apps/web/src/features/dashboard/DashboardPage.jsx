import { useEffect } from 'react';
import { Link } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  BedDouble,
  Building2,
  CalendarCheck,
  CalendarClock,
  DoorOpen,
  IndianRupee,
  LogIn,
  LogOut,
  Percent,
  Wallet,
} from 'lucide-react';
import { humanize } from '@homestay/shared';
import { ChartFrame, CHART_COLORS, axisProps, tooltipStyle } from '../../components/charts';
import { RangeFilter } from '../../components/RangeFilter';
import { Card, CardBody, CardHeader, EmptyState, PageHeader, Skeleton, StatCard, StatusBadge } from '../../components/ui';
import { useMoney } from '../../hooks';
import { formatCompactMoney, formatPercent, formatShortDate, timeAgo } from '../../lib/format';
import { dashboardActions } from './dashboardSlice';

const ROOM_STATUS_COLORS = {
  available: 'bg-emerald-500',
  occupied: 'bg-sky-500',
  reserved: 'bg-violet-500',
  cleaning: 'bg-amber-500',
  maintenance: 'bg-rose-500',
};

function ReservationList({ items, emptyLabel, money }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-slate-500">{emptyLabel}</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.id}>
          <Link to={`/reservations/${item.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50/80">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{item.guestName}</p>
              <p className="truncate text-xs text-slate-500">
                {item.code} · Room {item.roomNumber} · {item.propertyName}
              </p>
            </div>
            <div className="text-right">
              <StatusBadge status={item.status} dot={false} />
              <p className="mt-1 text-xs text-slate-500">
                {formatShortDate(item.checkIn)} → {formatShortDate(item.checkOut)} · {money(item.totalAmountMinor)}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  const dispatch = useDispatch();
  const money = useMoney();
  const { filters, data, status, error } = useSelector((state) => state.dashboard);
  const userName = useSelector((state) => state.auth.user?.name?.split(' ')[0]);

  useEffect(() => {
    dispatch(dashboardActions.fetchDashboard());
  }, [dispatch]);

  const loading = status === 'loading' && !data;
  const kpis = data?.kpis;
  const currency = data?.currency ?? 'INR';
  const series = data?.series ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title={`Good to see you${userName ? `, ${userName}` : ''}`} description="Live metrics calculated from the in-memory demo dataset.">
        {data && (
          <p className="mt-1 text-xs text-slate-400">
            {formatShortDate(data.range.from)} – {formatShortDate(data.range.to)} · business date {formatShortDate(data.range.today)}
          </p>
        )}
      </PageHeader>

      <Card className="p-4">
        <RangeFilter filters={filters} onChange={(change) => dispatch(dashboardActions.setFilters(change))} />
      </Card>

      {error && !data && (
        <Card>
          <EmptyState title="Dashboard unavailable" description={error} />
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          loading={loading}
          label="Total revenue"
          icon={currency === 'INR' ? IndianRupee : Wallet}
          value={kpis && money(kpis.totalRevenueMinor)}
          hint={kpis && `${money(kpis.refundsMinor)} refunded`}
        />
        <StatCard
          loading={loading}
          label="Occupancy rate"
          icon={Percent}
          tone="blue"
          value={kpis && formatPercent(kpis.occupancyRate)}
          hint={kpis && `${kpis.soldRoomNights}/${kpis.availableRoomNights} room nights · ADR ${money(kpis.averageDailyRateMinor)}`}
        />
        <StatCard
          loading={loading}
          label="Active reservations"
          icon={CalendarCheck}
          tone="violet"
          value={kpis?.activeReservations}
          hint={kpis && `${kpis.inHouseGuests} in-house now`}
        />
        <StatCard
          loading={loading}
          label="Outstanding balance"
          icon={Wallet}
          tone="rose"
          value={kpis && money(kpis.outstandingBalanceMinor)}
          hint="Across active reservations"
        />
        <StatCard
          loading={loading}
          label="Today's check-ins"
          icon={LogIn}
          tone="green"
          value={kpis?.todaysCheckIns}
          hint={kpis && `${kpis.pendingArrivals} awaiting arrival`}
        />
        <StatCard
          loading={loading}
          label="Today's check-outs"
          icon={LogOut}
          tone="amber"
          value={kpis?.todaysCheckOuts}
          hint={kpis && `${kpis.pendingDepartures} still in-house`}
        />
        <StatCard
          loading={loading}
          label="Properties"
          icon={Building2}
          value={kpis?.propertyCount}
          hint={kpis && `${kpis.roomCount} rooms in portfolio`}
        />
        <StatCard
          loading={loading}
          label="Room utilization"
          icon={BedDouble}
          tone="blue"
          value={kpis && formatPercent(kpis.roomUtilizationRate)}
          hint="Rooms occupied right now"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Revenue trend" description="Net payments received per day" icon={IndianRupee} />
          <CardBody>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ChartFrame label="Revenue trend chart">
                <AreaChart data={series} margin={{ left: 0, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.brand} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={CHART_COLORS.brand} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatShortDate} {...axisProps} minTickGap={24} />
                  <YAxis tickFormatter={(v) => formatCompactMoney(v, currency)} {...axisProps} width={64} />
                  <Tooltip {...tooltipStyle} labelFormatter={formatShortDate} formatter={(v) => [money(v), 'Revenue']} />
                  <Area type="monotone" dataKey="revenueMinor" stroke={CHART_COLORS.brand} strokeWidth={2} fill="url(#revenueFill)" />
                </AreaChart>
              </ChartFrame>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Room status" description="Derived live from reservations, housekeeping & maintenance" icon={DoorOpen} />
          <CardBody className="space-y-3">
            {loading
              ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-6 w-full" />)
              : data?.roomStatus.map((item) => {
                  const total = kpis.roomCount || 1;
                  return (
                    <div key={item.status}>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">{humanize(item.status)}</span>
                        <span className="font-medium text-slate-900">{item.count}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-100">
                        <div
                          className={`h-2 rounded-full ${ROOM_STATUS_COLORS[item.status]}`}
                          style={{ width: `${(item.count / total) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Occupancy trend" description="Share of active rooms sold per night" icon={Percent} />
          <CardBody>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ChartFrame label="Occupancy trend chart">
                <LineChart data={series} margin={{ left: -12, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatShortDate} {...axisProps} minTickGap={24} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} {...axisProps} />
                  <Tooltip {...tooltipStyle} labelFormatter={formatShortDate} formatter={(v) => [formatPercent(v), 'Occupancy']} />
                  <Line type="monotone" dataKey="occupancyRate" stroke={CHART_COLORS.sky} strokeWidth={2} dot={false} />
                </LineChart>
              </ChartFrame>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Reservation trend" description="New bookings and arrivals per day" icon={CalendarClock} />
          <CardBody>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ChartFrame label="Reservation trend chart">
                <BarChart data={series} margin={{ left: -16, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatShortDate} {...axisProps} minTickGap={24} />
                  <YAxis allowDecimals={false} {...axisProps} />
                  <Tooltip {...tooltipStyle} labelFormatter={formatShortDate} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="reservations" name="New bookings" fill={CHART_COLORS.brand} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="arrivals" name="Arrivals" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartFrame>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Today's arrivals" icon={LogIn} action={<Link to="/reservations" className="text-xs font-medium text-brand-700 hover:underline">View all</Link>} />
          <CardBody className="py-1">
            {loading ? <Skeleton className="h-32 w-full" /> : <ReservationList items={data?.todaysArrivals ?? []} money={money} emptyLabel="No arrivals today" />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Today's departures" icon={LogOut} />
          <CardBody className="py-1">
            {loading ? <Skeleton className="h-32 w-full" /> : <ReservationList items={data?.todaysDepartures ?? []} money={money} emptyLabel="No departures today" />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Upcoming reservations" description="Next 14 days" icon={CalendarClock} />
          <CardBody className="py-1">
            {loading ? <Skeleton className="h-32 w-full" /> : <ReservationList items={data?.upcomingReservations ?? []} money={money} emptyLabel="Nothing upcoming" />}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Property performance" description="For the selected range" icon={Building2} />
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Property</th>
                  <th className="px-5 py-2.5 font-semibold">Rooms</th>
                  <th className="px-5 py-2.5 font-semibold">Occupied now</th>
                  <th className="px-5 py-2.5 font-semibold">Occupancy</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.propertyPerformance ?? []).map((row) => (
                  <tr key={row.propertyId}>
                    <td className="px-5 py-3 font-medium text-slate-900">{row.name}</td>
                    <td className="px-5 py-3">{row.rooms}</td>
                    <td className="px-5 py-3">{row.occupiedToday}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-slate-100">
                          <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${Math.min(row.occupancyRate, 100)}%` }} />
                        </div>
                        {formatPercent(row.occupancyRate)}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-medium">{money(row.revenueMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && <Skeleton className="m-5 h-20" />}
          </div>
        </Card>
        <Card>
          <CardHeader title="Recent activity" icon={Activity} />
          <CardBody className="py-2">
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ol className="space-y-3">
                {(data?.recentActivity ?? []).map((activity) => (
                  <li key={activity.id} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700">{activity.message}</p>
                      <p className="text-xs text-slate-400">
                        {activity.actorName} · {timeAgo(activity.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
