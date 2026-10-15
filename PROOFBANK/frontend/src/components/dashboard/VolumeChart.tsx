import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Panel } from '../ui/Panel';
import { EmptyState } from '../ui/States';
import { LoadingPanel } from '../ui/Loading';
import { chartAxis, chartPalette, chartTooltipStyle } from '../../lib/chartPalette';
import { formatDate, formatDateTime, formatTime } from '../../lib/format';
import type { DashboardRange, VolumePoint } from '../../types/domain';

const SERIES: Array<{ key: keyof VolumePoint; label: string; color: string }> = [
  { key: 'successful', label: 'Successful', color: chartPalette.success },
  { key: 'failed', label: 'Failed', color: chartPalette.danger },
  { key: 'pending', label: 'Pending', color: chartPalette.warning },
  { key: 'reversed', label: 'Reversed', color: chartPalette.info },
];

function bucketLabel(point: VolumePoint, range: DashboardRange): string {
  if (range === '24h') return formatTime(point.bucketStart);
  return formatDate(point.bucketStart);
}

/** Transaction creation volume over time, split by outcome. */
export function VolumeChart({
  data,
  range,
  loading,
}: {
  data: VolumePoint[];
  range: DashboardRange;
  loading?: boolean;
}) {
  const total = data.reduce((sum, point) => sum + point.total, 0);

  return (
    <Panel
      title="Transaction volume"
      description={`Transactions created per ${range === '24h' ? 'hour' : 'day'}, by outcome.`}
      actions={
        <span className="text-xs text-ink-secondary" data-numeric="true">
          {total.toLocaleString('en-NG')} in range
        </span>
      }
      className="xl:col-span-2"
    >
      {loading ? (
        <LoadingPanel rows={4} />
      ) : total === 0 ? (
        <EmptyState
          title="No transactions in this range"
          description="Widen the range, or wait for the simulation to generate new activity."
        />
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={chartPalette.grid} vertical={false} />
              <XAxis
                dataKey="bucketStart"
                tickFormatter={(value: string) => bucketLabel({ bucketStart: value } as VolumePoint, range)}
                stroke={chartAxis.stroke}
                tick={chartAxis.tick}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                stroke={chartAxis.stroke}
                tick={chartAxis.tick}
                allowDecimals={false}
                width={44}
              />
              <Tooltip
                {...chartTooltipStyle}
                labelFormatter={(label: unknown) =>
                  range === '24h'
                    ? formatDateTime(String(label))
                    : `${formatDate(String(label))} (full day)`
                }
                formatter={(value: unknown, name: unknown) => [
                  `${String(value)} transactions`,
                  String(name),
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              {SERIES.map((series) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  stackId="volume"
                  fill={series.color}
                  maxBarSize={28}
                  radius={series.key === 'reversed' ? [3, 3, 0, 0] : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
