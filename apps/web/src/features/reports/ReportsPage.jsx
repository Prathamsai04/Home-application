import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, Tooltip, XAxis, YAxis } from 'recharts';
import { Download } from 'lucide-react';
import { humanize } from '@homestay/shared';
import { ChartFrame, CHART_COLORS, PIE_COLORS, axisProps, tooltipStyle } from '../../components/charts';
import { RangeFilter } from '../../components/RangeFilter';
import { Button, Card, CardBody, CardHeader, EmptyState, PageHeader, Skeleton, StatCard, Tabs } from '../../components/ui';
import { useMoney } from '../../hooks';
import { downloadCsv, toCsv } from '../../lib/csv';
import { formatCompactMoney, formatPercent, formatShortDate, fromMinorUnits } from '../../lib/format';
import { REPORT_TYPES, reportsActions } from './reportsSlice';

function DataTable({ columns, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c.header} className={`px-5 py-2.5 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={row.propertyId ?? row.method ?? row.name ?? index}>
              {columns.map((c) => (
                <td key={c.header} className={`px-5 py-2.5 ${c.align === 'right' ? 'text-right' : ''}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OccupancyReport({ data, money }) {
  const { totals } = data;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Occupancy" value={formatPercent(totals.occupancyRate)} hint={`${totals.soldRoomNights}/${totals.availableRoomNights} room nights`} />
        <StatCard label="Room revenue" value={money(totals.roomRevenueMinor)} tone="green" />
        <StatCard label="ADR" value={money(totals.adrMinor)} hint="Average daily rate" tone="blue" />
        <StatCard label="RevPAR" value={money(totals.revparMinor)} hint="Revenue per available room" tone="violet" />
      </div>
      <Card>
        <CardHeader title="Daily occupancy" />
        <CardBody>
          <ChartFrame label="Daily occupancy chart">
            <LineChart data={data.series} margin={{ left: -12, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatShortDate} {...axisProps} minTickGap={24} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} {...axisProps} />
              <Tooltip {...tooltipStyle} labelFormatter={formatShortDate} formatter={(v) => [formatPercent(v), 'Occupancy']} />
              <Line type="monotone" dataKey="occupancyRate" stroke={CHART_COLORS.brand} strokeWidth={2} dot={false} />
            </LineChart>
          </ChartFrame>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="By property" />
        <DataTable
          rows={data.rows}
          columns={[
            { header: 'Property', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
            { header: 'Rooms', render: (r) => r.rooms },
            { header: 'Sold / available', render: (r) => `${r.soldRoomNights} / ${r.availableRoomNights}` },
            { header: 'Occupancy', render: (r) => formatPercent(r.occupancyRate) },
            { header: 'ADR', align: 'right', render: (r) => money(r.adrMinor) },
            { header: 'RevPAR', align: 'right', render: (r) => money(r.revparMinor) },
            { header: 'Room revenue', align: 'right', render: (r) => money(r.roomRevenueMinor) },
          ]}
        />
      </Card>
    </>
  );
}

function RevenueReport({ data, money }) {
  const { totals } = data;
  const methods = data.byMethod.filter((m) => m.paymentsMinor > 0);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Payments" value={money(totals.paymentsMinor)} tone="green" hint={`${totals.count} transactions`} />
        <StatCard label="Refunds" value={money(totals.refundsMinor)} tone="violet" hint={`${totals.refundCount} refunds`} />
        <StatCard label="Net revenue" value={money(totals.netMinor)} />
        <StatCard label="Outstanding" value={money(totals.outstandingMinor)} tone="rose" hint="Balances on stays in range" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Daily net revenue" />
          <CardBody>
            <ChartFrame label="Daily revenue chart">
              <AreaChart data={data.series} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatShortDate} {...axisProps} minTickGap={24} />
                <YAxis tickFormatter={(v) => formatCompactMoney(v, data.currency)} {...axisProps} width={64} />
                <Tooltip {...tooltipStyle} labelFormatter={formatShortDate} formatter={(v) => [money(v), 'Net revenue']} />
                <Area type="monotone" dataKey="revenueMinor" stroke={CHART_COLORS.brand} fill={CHART_COLORS.brandLight} fillOpacity={0.35} />
              </AreaChart>
            </ChartFrame>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Payment mix" />
          <CardBody>
            {methods.length ? (
              <ChartFrame label="Payment method mix chart">
                <PieChart>
                  <Pie data={methods} dataKey="paymentsMinor" nameKey="method" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {methods.map((entry, index) => (
                      <Cell key={entry.method} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v, name) => [money(v), humanize(name)]} />
                  <Legend formatter={humanize} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ChartFrame>
            ) : (
              <EmptyState title="No payments in range" />
            )}
          </CardBody>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="By method" />
          <DataTable
            rows={data.byMethod}
            columns={[
              { header: 'Method', render: (r) => humanize(r.method) },
              { header: 'Payments', align: 'right', render: (r) => money(r.paymentsMinor) },
              { header: 'Refunds', align: 'right', render: (r) => money(r.refundsMinor) },
              { header: 'Net', align: 'right', render: (r) => <span className="font-medium">{money(r.netMinor)}</span> },
            ]}
          />
        </Card>
        <Card>
          <CardHeader title="By property" />
          <DataTable
            rows={data.byProperty}
            columns={[
              { header: 'Property', render: (r) => r.name },
              { header: 'Payments', align: 'right', render: (r) => money(r.paymentsMinor) },
              { header: 'Refunds', align: 'right', render: (r) => money(r.refundsMinor) },
              { header: 'Net', align: 'right', render: (r) => <span className="font-medium">{money(r.netMinor)}</span> },
            ]}
          />
        </Card>
      </div>
    </>
  );
}

function ReservationsReport({ data, money }) {
  const { totals } = data;
  const sources = data.bySource.filter((s) => s.count > 0);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Reservations" value={totals.reservations} hint={`Booked value ${money(totals.bookedValueMinor)}`} />
        <StatCard label="Avg. length of stay" value={`${totals.averageLengthOfStay} nights`} tone="blue" />
        <StatCard label="Avg. lead time" value={`${totals.averageLeadTimeDays} days`} tone="violet" />
        <StatCard label="Cancellation rate" value={formatPercent(totals.cancellationRate)} tone="rose" hint={`No-show ${formatPercent(totals.noShowRate)}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="By status" description="Arrivals within the selected range" />
          <CardBody>
            <ChartFrame label="Reservations by status chart">
              <BarChart data={data.byStatus} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="name" tickFormatter={humanize} {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip {...tooltipStyle} labelFormatter={humanize} />
                <Bar dataKey="count" name="Reservations" fill={CHART_COLORS.brand} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartFrame>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="By source" />
          <CardBody>
            {sources.length ? (
              <ChartFrame label="Reservations by source chart">
                <PieChart>
                  <Pie data={sources} dataKey="count" nameKey="name" outerRadius={90} paddingAngle={2}>
                    {sources.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v, name) => [v, humanize(name)]} />
                  <Legend formatter={humanize} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ChartFrame>
            ) : (
              <EmptyState title="No reservations in range" />
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function OperationsReport({ data }) {
  const { housekeeping, maintenance } = data;
  const bar = (rows, color, label) => (
    <ChartFrame height={220} label={label}>
      <BarChart data={rows} margin={{ left: -16, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="name" tickFormatter={humanize} {...axisProps} />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip {...tooltipStyle} labelFormatter={humanize} />
        <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartFrame>
  );
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open cleaning tasks" value={housekeeping.open} hint={`${housekeeping.overdue} overdue`} tone="amber" />
        <StatCard label="Tasks completed" value={housekeeping.completedInRange} tone="green" hint="In selected range" />
        <StatCard label="Rooms blocked" value={maintenance.openBlocking} tone="rose" hint="By open maintenance" />
        <StatCard label="Avg. resolution" value={`${maintenance.averageResolutionHours} h`} tone="blue" hint={`${maintenance.resolvedInRange} resolved in range`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Housekeeping by status" />
          <CardBody>{bar(housekeeping.byStatus, CHART_COLORS.amber, 'Housekeeping by status chart')}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Maintenance by status" />
          <CardBody>{bar(maintenance.byStatus, CHART_COLORS.rose, 'Maintenance by status chart')}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Maintenance by category" />
          <CardBody>{bar(maintenance.byCategory, CHART_COLORS.sky, 'Maintenance by category chart')}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Maintenance by priority" />
          <CardBody>{bar(maintenance.byPriority, CHART_COLORS.violet, 'Maintenance by priority chart')}</CardBody>
        </Card>
      </div>
    </>
  );
}

/** Flattens the active report into CSV rows. */
function exportReport(type, data) {
  const stamp = `${data.range.from}_to_${data.range.to}`;
  const money = (minor) => fromMinorUnits(minor);
  const exports = {
    occupancy: () =>
      toCsv(data.rows, [
        { header: 'Property', value: (r) => r.name },
        { header: 'Rooms', value: (r) => r.rooms },
        { header: 'Available room nights', value: (r) => r.availableRoomNights },
        { header: 'Sold room nights', value: (r) => r.soldRoomNights },
        { header: 'Occupancy %', value: (r) => r.occupancyRate },
        { header: `ADR (${data.currency})`, value: (r) => money(r.adrMinor) },
        { header: `RevPAR (${data.currency})`, value: (r) => money(r.revparMinor) },
        { header: `Room revenue (${data.currency})`, value: (r) => money(r.roomRevenueMinor) },
      ]),
    revenue: () =>
      toCsv(data.series, [
        { header: 'Date', value: (r) => r.date },
        { header: `Net revenue (${data.currency})`, value: (r) => money(r.revenueMinor) },
      ]),
    reservations: () =>
      toCsv([...data.byStatus.map((r) => ({ ...r, group: 'status' })), ...data.bySource.map((r) => ({ ...r, group: 'source' }))], [
        { header: 'Group', value: (r) => r.group },
        { header: 'Value', value: (r) => humanize(r.name) },
        { header: 'Reservations', value: (r) => r.count },
      ]),
    operations: () =>
      toCsv(
        [
          ...data.housekeeping.byStatus.map((r) => ({ ...r, group: 'Housekeeping status' })),
          ...data.maintenance.byStatus.map((r) => ({ ...r, group: 'Maintenance status' })),
          ...data.maintenance.byCategory.map((r) => ({ ...r, group: 'Maintenance category' })),
        ],
        [
          { header: 'Group', value: (r) => r.group },
          { header: 'Value', value: (r) => humanize(r.name) },
          { header: 'Count', value: (r) => r.count },
        ],
      ),
  };
  downloadCsv(`${type}-report_${stamp}.csv`, exports[type]());
}

export default function ReportsPage() {
  const dispatch = useDispatch();
  const money = useMoney();
  const { activeType, filters, data, status, error } = useSelector((state) => state.reports);
  const report = data[activeType];

  useEffect(() => {
    dispatch(reportsActions.fetchReport());
  }, [dispatch]);

  const Component = { occupancy: OccupancyReport, revenue: RevenueReport, reservations: ReservationsReport, operations: OperationsReport }[activeType];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Calculated on demand from live data."
        actions={
          <Button variant="secondary" icon={Download} disabled={!report} onClick={() => exportReport(activeType, report)}>
            Export CSV
          </Button>
        }
      />
      <Card className="p-4">
        <RangeFilter filters={filters} onChange={(change) => dispatch(reportsActions.setFilters(change))} />
      </Card>
      <Tabs
        tabs={REPORT_TYPES.map((type) => ({ value: type, label: humanize(type) }))}
        value={activeType}
        onChange={(type) => dispatch(reportsActions.setActiveType(type))}
      />
      {error && !report ? (
        <Card>
          <EmptyState title="Report unavailable" description={error} />
        </Card>
      ) : !report ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      ) : (
        <div className={`space-y-4 ${status === 'loading' ? 'opacity-60' : ''}`}>
          <p className="text-xs text-slate-500">
            {formatShortDate(report.range.from)} – {formatShortDate(report.range.to)}
          </p>
          <Component data={report} money={money} />
        </div>
      )}
    </div>
  );
}
