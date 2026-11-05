import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, MapPin, PieChart as PieIcon } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { dashboardChartMeta } from "@/features/dashboard/api";
import { CATEGORY_META, STATUS_META } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import type { DashboardStats } from "@/types";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(15,23,42,.08)",
};

export function StatusDonutChart({ data }: { data: DashboardStats }) {
  const chartData = data.byStatus.map((point) => ({
    name: STATUS_META[point.status].label,
    value: point.count,
    color: STATUS_META[point.status].chartColor,
  }));
  const total = data.summary.total;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Laporan per status"
        description="Distribusi seluruh laporan pada periode"
      />
      {total === 0 ? (
        <EmptyState
          icon={<PieIcon className="h-6 w-6" />}
          title="Belum ada data"
          description="Data status akan muncul setelah ada laporan."
          className="py-10"
        />
      ) : (
        <CardContent className="pt-4">
          <div className="relative h-56">
            <div aria-hidden="true" className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="88%"
                    paddingAngle={2}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${Number(value).toLocaleString("id-ID")} laporan`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-900">
                {total.toLocaleString("id-ID")}
              </span>
              <span className="text-xs font-medium text-slate-500">total laporan</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            {dashboardChartMeta.statuses.map((meta) => {
              const point = data.byStatus.find((item) => item.status === meta.status);
              const count = point?.count ?? 0;
              return (
                <div
                  key={meta.status}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-2 text-xs"
                >
                  <span className="flex items-center gap-1.5 font-medium text-slate-600">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: meta.color }}
                      aria-hidden="true"
                    />
                    {meta.label}
                  </span>
                  <span className="font-bold text-slate-900">{count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function CategoryBarChart({ data }: { data: DashboardStats }) {
  const chartData = data.byCategory.map((point) => ({
    name: CATEGORY_META[point.category].label,
    value: point.count,
    color: CATEGORY_META[point.category].chartColor,
  }));
  const total = chartData.reduce((sum, point) => sum + point.value, 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Laporan per kategori"
        description="Kategori akhir yang tersimpan pada laporan"
      />
      {total === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="Belum ada data"
          description="Kategori akan muncul setelah ada laporan."
          className="py-10"
        />
      ) : (
        <CardContent className="pt-4">
          <div className="h-56" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "#f1f5f9" }}
                  formatter={(value) => [`${Number(value).toLocaleString("id-ID")} laporan`, ""]}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={44}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {chartData.map((entry) => (
              <span
                key={entry.name}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                  aria-hidden="true"
                />
                {entry.name}: <strong className="text-slate-900">{entry.value}</strong>
              </span>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function TrendChart({ data }: { data: DashboardStats }) {
  const chartData = data.trend.map((point) => ({
    ...point,
    label: formatDate(point.date),
  }));

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Tren laporan"
        description="Jumlah laporan masuk per hari pada periode ini"
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <PieIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {chartData.reduce((sum, point) => sum + point.count, 0)} laporan
          </span>
        }
      />
      {chartData.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="Belum ada data"
          description="Tren harian akan muncul setelah ada laporan."
          className="py-10"
        />
      ) : (
        <CardContent className="pt-4">
          <div className="h-60" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  minTickGap={28}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(label) => String(label)}
                  formatter={(value) => [`${Number(value).toLocaleString("id-ID")} laporan`, ""]}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#trendFill)"
                  dot={{ r: 2, fill: "#059669", strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function TopLocations({ data }: { data: DashboardStats }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Lokasi terbanyak" description="Area dengan laporan sampah paling sering" />
      {data.topLocations.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-6 w-6" />}
          title="Belum ada lokasi"
          description="Lokasi laporan terbanyak akan tampil di sini."
          className="py-10"
        />
      ) : (
        <CardContent className="space-y-2.5 pt-4">
          {data.topLocations.slice(0, 6).map((location, index) => (
            <div
              key={`${location.address ?? "lokasi"}-${index}`}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  index === 0
                    ? "bg-emerald-600 text-white"
                    : index === 1
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600",
                )}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {location.address ??
                    (location.latitude !== null && location.longitude !== null
                      ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                      : "Lokasi tanpa alamat")}
                </p>
                {location.latitude !== null && location.longitude !== null && (
                  <p className="text-[11px] text-slate-400">
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                {location.count}
              </span>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
