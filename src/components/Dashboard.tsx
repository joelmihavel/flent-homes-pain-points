"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

type Ticket = {
  ticketId: string | null;
  name: string | null;
  description: string | null;
  createDate: string | null;
  openHours: number | null;
  priority: string | null;
  rid: string | null;
  category: string | null;
  owner: string | null;
  status: string | null;
  priorityCode: number | null;
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "#dc2626",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#22c55e",
};

const STATUS_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

const CATEGORY_COLORS = [
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#14b8a6",
];

function countBy<T>(items: T[], key: (item: T) => string | null | undefined) {
  const map: Record<string, number> = {};
  for (const item of items) {
    const k = key(item) || "Unknown";
    map[k] = (map[k] || 0) + 1;
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-1">
      <span className="text-sm text-gray-500 font-medium">{label}</span>
      <span className={`text-3xl font-bold ${color || "text-gray-900"}`}>
        {value}
      </span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const bg =
    priority === "URGENT"
      ? "bg-red-100 text-red-700"
      : priority === "HIGH"
        ? "bg-orange-100 text-orange-700"
        : priority === "MEDIUM"
          ? "bg-yellow-100 text-yellow-700"
          : "bg-green-100 text-green-700";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${bg}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const bg =
    status === "New Request"
      ? "bg-indigo-100 text-indigo-700"
      : status === "Action Pending"
        ? "bg-amber-100 text-amber-700"
        : status === "Blocked"
          ? "bg-red-100 text-red-700"
          : status === "Waiting on Vendor"
            ? "bg-purple-100 text-purple-700"
            : status === "Waiting on Landlord"
              ? "bg-cyan-100 text-cyan-700"
              : "bg-gray-100 text-gray-700";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${bg}`}>
      {status}
    </span>
  );
}

export function Dashboard({ tickets }: { tickets: Ticket[] }) {
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter)
        return false;
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (categoryFilter !== "ALL" && t.category !== categoryFilter)
        return false;
      return true;
    });
  }, [tickets, priorityFilter, statusFilter, categoryFilter]);

  const totalOpen = filtered.length;
  const urgentHigh = filtered.filter(
    (t) => t.priority === "URGENT" || t.priority === "HIGH"
  ).length;
  const avgOpenHours =
    filtered.filter((t) => t.openHours != null).length > 0
      ? Math.round(
          filtered.reduce((s, t) => s + (t.openHours || 0), 0) /
            filtered.filter((t) => t.openHours != null).length
        )
      : 0;
  const avgOpenDays = Math.round(avgOpenHours / 24);

  const byStatus = countBy(filtered, (t) => t.status);
  const byPriority = countBy(filtered, (t) => t.priority);
  const byCategory = countBy(filtered, (t) => t.category);
  const byOwner = countBy(filtered, (t) => t.owner);

  const byMonth = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of filtered) {
      if (t.createDate) {
        const month = t.createDate.substring(0, 7);
        map[month] = (map[month] || 0) + 1;
      }
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const topAging = useMemo(() => {
    return [...filtered]
      .filter((t) => t.openHours != null)
      .sort((a, b) => (b.openHours || 0) - (a.openHours || 0))
      .slice(0, 10);
  }, [filtered]);

  const priorities = [...new Set(tickets.map((t) => t.priority).filter(Boolean))];
  const statuses = [...new Set(tickets.map((t) => t.status).filter(Boolean))];
  const categories = [...new Set(tickets.map((t) => t.category).filter(Boolean))];

  const byPropertyPriority = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const t of filtered) {
      const rid = t.rid || "Unknown";
      const p = t.priority || "Unknown";
      if (!map[rid]) map[rid] = {};
      map[rid][p] = (map[rid][p] || 0) + 1;
    }
    return Object.entries(map)
      .map(([rid, counts]) => ({
        rid,
        total: Object.values(counts).reduce((a, b) => a + b, 0),
        ...counts,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
  }, [filtered]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Flent Homes — Customer Tickets
            </h1>
            <p className="text-sm text-gray-500">
              Open ticket analytics dashboard
            </p>
          </div>
          <div className="flex gap-3">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700"
            >
              <option value="ALL">All Priorities</option>
              {priorities.map((p) => (
                <option key={p} value={p!}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700"
            >
              <option value="ALL">All Statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s!}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c!}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-6 flex flex-col gap-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Open Tickets" value={totalOpen} />
          <StatCard
            label="Urgent + High"
            value={urgentHigh}
            sub={`${totalOpen > 0 ? Math.round((urgentHigh / totalOpen) * 100) : 0}% of total`}
            color="text-red-600"
          />
          <StatCard
            label="Avg. Open Time"
            value={`${avgOpenDays}d`}
            sub={`${avgOpenHours} hours`}
          />
          <StatCard
            label="Categories"
            value={byCategory.length}
            sub="distinct issue types"
          />
        </div>

        {/* Row 1: Status + Priority + Category */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              By Status
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={byStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                  fontSize={11}
                >
                  {byStatus.map((_, i) => (
                    <Cell
                      key={i}
                      fill={STATUS_COLORS[i % STATUS_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              By Priority
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byPriority} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={70}
                  fontSize={12}
                />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {byPriority.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={PRIORITY_COLORS[entry.name] || "#94a3b8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              By Category
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  fontSize={11}
                />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {byCategory.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2: Trend + Owner + Property Hotspots */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Tickets Created Over Time
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              By Owner
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={byOwner}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={2}
                >
                  {byOwner.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend fontSize={12} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Top Properties (by ticket count)
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byPropertyPriority}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rid" fontSize={10} angle={-45} textAnchor="end" height={60} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="URGENT" stackId="a" fill="#dc2626" />
                <Bar dataKey="HIGH" stackId="a" fill="#f97316" />
                <Bar dataKey="MEDIUM" stackId="a" fill="#eab308" />
                <Bar dataKey="LOW" stackId="a" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Longest Open Tickets Table */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Top 10 Longest Open Tickets
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 pr-4 font-medium">Ticket</th>
                  <th className="pb-2 pr-4 font-medium">Property</th>
                  <th className="pb-2 pr-4 font-medium">Category</th>
                  <th className="pb-2 pr-4 font-medium">Priority</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Open (days)</th>
                  <th className="pb-2 font-medium">Owner</th>
                </tr>
              </thead>
              <tbody>
                {topAging.map((t) => (
                  <tr
                    key={t.ticketId}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-2.5 pr-4 max-w-[300px]">
                      <div className="font-medium text-gray-900 truncate">
                        {t.name}
                      </div>
                      <div className="text-xs text-gray-400 truncate max-w-[300px]">
                        {t.description}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-700">{t.rid}</td>
                    <td className="py-2.5 pr-4 text-gray-700">{t.category}</td>
                    <td className="py-2.5 pr-4">
                      <PriorityBadge priority={t.priority || "Unknown"} />
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={t.status || "Unknown"} />
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-gray-900">
                      {t.openHours ? Math.round(t.openHours / 24) : "—"}
                    </td>
                    <td className="py-2.5 text-gray-700">
                      {t.owner || "Unassigned"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Full Ticket Table */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            All Open Tickets ({filtered.length})
          </h3>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 pr-4 font-medium">Created</th>
                  <th className="pb-2 pr-4 font-medium">Ticket</th>
                  <th className="pb-2 pr-4 font-medium">Property</th>
                  <th className="pb-2 pr-4 font-medium">Category</th>
                  <th className="pb-2 pr-4 font-medium">Priority</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Open (days)</th>
                  <th className="pb-2 font-medium">Owner</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr
                    key={t.ticketId}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">
                      {t.createDate}
                    </td>
                    <td className="py-2 pr-4 max-w-[250px]">
                      <div className="font-medium text-gray-900 truncate">
                        {t.name}
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-gray-700">{t.rid}</td>
                    <td className="py-2 pr-4 text-gray-700">{t.category}</td>
                    <td className="py-2 pr-4">
                      <PriorityBadge priority={t.priority || "Unknown"} />
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={t.status || "Unknown"} />
                    </td>
                    <td className="py-2 pr-4 font-mono text-gray-900">
                      {t.openHours ? Math.round(t.openHours / 24) : "—"}
                    </td>
                    <td className="py-2 text-gray-700">
                      {t.owner || "Unassigned"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
