"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { Ticket, Insights } from "@/lib/types";
import { MetricCard } from "./MetricCard";
import { InsightBanner } from "./InsightBanner";
import { MiniBar } from "./MiniBar";
import { TicketDrawer } from "./TicketDrawer";

const THEME_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#84cc16", "#14b8a6",
  "#64748b", "#a855f7",
];

export function OverviewPage({
  tickets,
  insights,
}: {
  tickets: Ticket[];
  insights: Insights;
}) {
  const s = insights.summary;
  const [drawerTickets, setDrawerTickets] = useState<Ticket[] | null>(null);
  const [drawerTitle, setDrawerTitle] = useState("");

  const themeData = insights.theme_distribution.slice(0, 10);
  const uxIssueData = insights.ux_issue_distribution.filter(
    (d) => d.name !== "Physical Resolution Needed"
  );
  const resolutionTypeData = insights.resolution_type_distribution.filter(
    (d) => d.name !== "Unknown"
  );

  const frustrationHeatmap = useMemo(() => {
    const map: Record<string, { high: number; medium: number; low: number; total: number; tickets: Ticket[] }> = {};
    for (const t of tickets) {
      const theme = t.ux_theme;
      if (!map[theme]) map[theme] = { high: 0, medium: 0, low: 0, total: 0, tickets: [] };
      map[theme].total++;
      map[theme].tickets.push(t);
      if (t.frustration_score >= 5) map[theme].high++;
      else if (t.frustration_score >= 3) map[theme].medium++;
      else map[theme].low++;
    }
    return Object.entries(map)
      .map(([theme, data]) => ({ theme, ...data }))
      .sort((a, b) => b.high - a.high)
      .slice(0, 10);
  }, [tickets]);

  const firstWeekData = useMemo(() => {
    const fw = tickets.filter((t) => t.is_first_week_ticket);
    const themes: Record<string, number> = {};
    for (const t of fw) themes[t.ux_theme] = (themes[t.ux_theme] || 0) + 1;
    return Object.entries(themes)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [tickets]);

  function openDrawer(tix: Ticket[], title: string) {
    setDrawerTickets(tix);
    setDrawerTitle(title);
  }

  return (
    <div className="p-6 max-w-[1200px]">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-text-primary">UX Overview</h1>
        <p className="text-sm text-text-tertiary mt-0.5">
          Continuous UX research powered by {s.total_tickets.toLocaleString()}{" "}
          customer tickets · ₹{(s.total_cost / 100000).toFixed(1)}L total cost
        </p>
      </div>

      {/* KPIs — clickable */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <MetricCard
          label="Total Tickets"
          value={s.total_tickets.toLocaleString()}
          sub={`${s.open_tickets} still open`}
          onClick={() => openDrawer(tickets, "All Tickets")}
        />
        <MetricCard
          label="Preventable"
          value={`${s.preventable_pct}%`}
          sub={`${s.preventable_count} tickets`}
          accent="amber"
          onClick={() =>
            openDrawer(
              tickets.filter((t) => t.is_preventable),
              "Preventable Tickets"
            )
          }
        />
        <MetricCard
          label="First Week"
          value={`${s.first_week_pct}%`}
          sub={`${s.first_week_count} in week 1`}
          accent="purple"
          onClick={() =>
            openDrawer(
              tickets.filter((t) => t.is_first_week_ticket),
              "First Week Tickets"
            )
          }
        />
        <MetricCard
          label="Zero-effort"
          value={`${s.zero_effort_pct}%`}
          sub={`${s.zero_effort_count} needed no work`}
          accent="green"
          onClick={() =>
            openDrawer(
              tickets.filter((t) =>
                ["Information shared", "Self-resolved", "No issue found", "Duplicate ticket"].includes(t.resolution_type)
              ),
              "Zero-effort Tickets"
            )
          }
        />
        <MetricCard
          label="Avg Resolution"
          value={`${Math.round(s.avg_resolution_hours / 24)}d`}
          sub={`median ${Math.round(s.median_resolution_hours / 24)}d`}
        />
        <MetricCard
          label="Repeat Property"
          value={`${s.repeat_property_pct}%`}
          sub={`${s.repeat_property_count} recurring`}
          accent="red"
          onClick={() =>
            openDrawer(
              tickets.filter((t) => t.is_repeat_property_issue),
              "Repeat Property Tickets"
            )
          }
        />
      </div>

      {/* AI Insights */}
      <div className="mb-6">
        <div className="text-xs text-text-quaternary font-medium uppercase tracking-wider mb-3">
          Key Findings
        </div>
        <div className="grid grid-cols-2 gap-3">
          {insights.ai_insights.slice(0, 4).map((insight, i) => (
            <InsightBanner key={i} insight={insight} />
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
          <div className="text-xs font-medium text-text-secondary mb-1">
            Ticket Volume Over Time
          </div>
          <div className="text-[10px] text-text-quaternary mb-4">
            Shaded area = preventable tickets
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={insights.monthly_trend}>
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="preventGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-secondary)" />
              <XAxis dataKey="month" fontSize={10} tick={{ fill: "var(--color-text-quaternary)" }} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} tick={{ fill: "var(--color-text-quaternary)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-border-secondary)" }} />
              <Area type="monotone" dataKey="tickets" stroke="#6366f1" strokeWidth={2} fill="url(#totalGrad)" name="Total" />
              <Area type="monotone" dataKey="preventable" stroke="#f59e0b" strokeWidth={1.5} fill="url(#preventGrad)" name="Preventable" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
          <div className="text-xs font-medium text-text-secondary mb-4">
            UX Theme Distribution
          </div>
          <MiniBar data={themeData} colors={THEME_COLORS} height={240} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
          <div className="text-xs font-medium text-text-secondary mb-4">
            How Tickets Get Resolved
          </div>
          <MiniBar data={resolutionTypeData.slice(0, 8)} color="#10b981" height={220} />
        </div>
        <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
          <div className="text-xs font-medium text-text-secondary mb-4">
            UX Issues Detected
          </div>
          <MiniBar data={uxIssueData} color="#8b5cf6" height={220} />
        </div>
        <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
          <div className="text-xs font-medium text-text-secondary mb-4">
            First-Week Tickets by Theme
          </div>
          <MiniBar data={firstWeekData} color="#ec4899" height={220} />
        </div>
      </div>

      {/* Frustration Heatmap — clickable rows */}
      <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-medium text-text-secondary">
              Frustration Heatmap by Theme
            </div>
            <div className="text-[10px] text-text-quaternary mt-0.5">
              Click any row to view tickets
            </div>
          </div>
          <div className="flex gap-4 text-[10px] text-text-quaternary">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-red-400" /> High (5+)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-amber-300" /> Medium (3-4)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-emerald-200" /> Low (0-2)
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          {frustrationHeatmap.map((row) => (
            <button
              key={row.theme}
              onClick={() => openDrawer(row.tickets, `${row.theme} — All Tickets`)}
              className="flex items-center gap-3 w-full hover:bg-bg-primary_hover rounded-md px-1 py-1 -mx-1 transition duration-100 ease-linear"
            >
              <div className="w-36 text-xs text-text-tertiary truncate text-left">
                {row.theme}
              </div>
              <div className="flex-1 flex gap-0.5 h-6 rounded overflow-hidden">
                {row.high > 0 && (
                  <div
                    className="bg-red-400 flex items-center justify-center"
                    style={{ width: `${(row.high / row.total) * 100}%` }}
                  >
                    {row.high > 10 && (
                      <span className="text-[9px] text-white font-medium">{row.high}</span>
                    )}
                  </div>
                )}
                {row.medium > 0 && (
                  <div
                    className="bg-amber-300 flex items-center justify-center"
                    style={{ width: `${(row.medium / row.total) * 100}%` }}
                  >
                    {row.medium > 20 && (
                      <span className="text-[9px] text-amber-800 font-medium">{row.medium}</span>
                    )}
                  </div>
                )}
                {row.low > 0 && (
                  <div
                    className="bg-emerald-200 flex items-center justify-center"
                    style={{ width: `${(row.low / row.total) * 100}%` }}
                  >
                    {row.low > 20 && (
                      <span className="text-[9px] text-emerald-700 font-medium">{row.low}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="text-[10px] text-text-quaternary w-10 text-right tabular-nums">
                {row.total}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Ticket Drawer */}
      {drawerTickets && (
        <TicketDrawer
          tickets={drawerTickets}
          title={drawerTitle}
          onClose={() => setDrawerTickets(null)}
        />
      )}
    </div>
  );
}
