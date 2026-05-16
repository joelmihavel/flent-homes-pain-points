"use client";

import { useMemo, useState, useCallback } from "react";
import type { Ticket } from "@/lib/types";
import { Badge } from "@/components/uui-base/badges/badges";
import { TicketDrawer } from "@/components/TicketDrawer";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from "recharts";

const THEME_COLORS = [
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

function parseYearMonth(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}`;
  return null;
}

type ChartRow = { month: string; [theme: string]: string | number };

type ThemeSummary = {
  theme: string;
  total: number;
  trend: "up" | "down" | "flat";
  avgFrustration: number;
  preventablePct: number;
  sparklineData: { month: string; count: number }[];
  tickets: Ticket[];
  color: string;
};

export function TrendsPage({ tickets }: { tickets: Ticket[] }) {
  const [drawerTickets, setDrawerTickets] = useState<Ticket[] | null>(null);
  const [drawerTitle, setDrawerTitle] = useState("");

  const { sortedMonths, topThemes, chartData, themeSummaries, ticketsByMonth } =
    useMemo(() => {
      // Group tickets by month
      const byMonth: Record<string, Ticket[]> = {};
      const byTheme: Record<string, Ticket[]> = {};

      for (const t of tickets) {
        const ym = parseYearMonth(t.create_date);
        if (!ym) continue;
        if (!byMonth[ym]) byMonth[ym] = [];
        byMonth[ym].push(t);

        if (!byTheme[t.ux_theme]) byTheme[t.ux_theme] = [];
        byTheme[t.ux_theme].push(t);
      }

      const sortedMonths = Object.keys(byMonth).sort();

      // Top themes by ticket count
      const themeCounts = Object.entries(byTheme)
        .map(([theme, tix]) => ({ theme, count: tix.length }))
        .sort((a, b) => b.count - a.count);
      const topThemes = themeCounts.slice(0, 6).map((t) => t.theme);

      // Build chart data: one row per month, one key per top theme
      const chartData: ChartRow[] = sortedMonths.map((month) => {
        const row: ChartRow = { month };
        for (const theme of topThemes) {
          row[theme] = (byMonth[month] || []).filter(
            (t) => t.ux_theme === theme
          ).length;
        }
        return row;
      });

      // Build per-theme sparkline data and summaries
      const allThemes = themeCounts.map((t) => t.theme);
      const themeSummaries: ThemeSummary[] = allThemes.map((theme, idx) => {
        const tix = byTheme[theme];
        const sparklineData = sortedMonths.map((month) => ({
          month,
          count: (byMonth[month] || []).filter((t) => t.ux_theme === theme)
            .length,
        }));

        // Trend: compare last 3 months vs prior 3 months
        const monthlyValues = sparklineData.map((d) => d.count);
        const len = monthlyValues.length;
        let trend: "up" | "down" | "flat" = "flat";
        if (len >= 6) {
          const recent = monthlyValues.slice(len - 3).reduce((a, b) => a + b, 0);
          const prior = monthlyValues.slice(len - 6, len - 3).reduce((a, b) => a + b, 0);
          if (recent > prior * 1.15) trend = "up";
          else if (recent < prior * 0.85) trend = "down";
        } else if (len >= 2) {
          const recent = monthlyValues.slice(Math.max(0, len - 3)).reduce((a, b) => a + b, 0);
          const prior = monthlyValues.slice(0, Math.max(1, len - 3)).reduce((a, b) => a + b, 0);
          if (recent > prior * 1.15) trend = "up";
          else if (recent < prior * 0.85) trend = "down";
        }

        const avgFrustration =
          tix.length > 0
            ? Math.round(
                (tix.reduce((s, t) => s + t.frustration_score, 0) / tix.length) *
                  10
              ) / 10
            : 0;

        const preventablePct =
          tix.length > 0
            ? Math.round(
                (tix.filter((t) => t.is_preventable).length / tix.length) * 100
              )
            : 0;

        return {
          theme,
          total: tix.length,
          trend,
          avgFrustration,
          preventablePct,
          sparklineData,
          tickets: tix,
          color: THEME_COLORS[idx % THEME_COLORS.length],
        };
      });

      return {
        sortedMonths,
        topThemes,
        chartData,
        themeSummaries,
        ticketsByMonth: byMonth,
      };
    }, [tickets]);

  const handleChartClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: any) => {
      if (!data?.activeLabel) return;
      const month = String(data.activeLabel);
      const monthTickets = ticketsByMonth[month];
      if (monthTickets && monthTickets.length > 0) {
        setDrawerTickets(monthTickets);
        setDrawerTitle(`All tickets - ${month}`);
      }
    },
    [ticketsByMonth]
  );

  const handleThemeClick = useCallback((summary: ThemeSummary) => {
    setDrawerTickets(summary.tickets);
    setDrawerTitle(`${summary.theme} - ${summary.total} tickets`);
  }, []);

  const trendIcon = (trend: "up" | "down" | "flat") => {
    if (trend === "up") return <span className="text-red-500">&#8593;</span>;
    if (trend === "down") return <span className="text-emerald-500">&#8595;</span>;
    return <span className="text-text-quaternary">&#8594;</span>;
  };

  const formatMonth = (m: unknown) => {
    const s = String(m);
    const [y, mo] = s.split("-");
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${months[parseInt(mo, 10) - 1] || mo} ${(y || "").slice(2)}`;
  };

  if (sortedMonths.length === 0) {
    return (
      <div className="py-20 text-center text-sm text-text-quaternary">
        No dated tickets to show trends.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Main line chart */}
      <div className="bg-bg-primary border border-border-secondary rounded-xl p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-text-primary">
            Theme Trends Over Time
          </h2>
          <p className="text-xs text-text-tertiary mt-1">
            Monthly ticket volume for top themes. Click a month to view all tickets.
          </p>
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart
            data={chartData}
            onClick={handleChartClick}
            margin={{ top: 4, right: 12, bottom: 4, left: -8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-secondary, #e5e7eb)" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              tick={{ fontSize: 11, fill: "var(--color-text-quaternary, #9ca3af)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "var(--color-text-quaternary, #9ca3af)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-bg-primary, #fff)",
                border: "1px solid var(--color-border-secondary, #e5e7eb)",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              labelFormatter={formatMonth}
              cursor={{ stroke: "var(--color-border-secondary, #d1d5db)", strokeWidth: 1 }}
            />
            <Legend
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
            />
            {topThemes.map((theme, i) => (
              <Line
                key={theme}
                type="monotone"
                dataKey={theme}
                stroke={THEME_COLORS[i % THEME_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Sparkline mini cards grid */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary mb-4">
          All Theme Trends
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {themeSummaries.map((s) => (
            <button
              key={s.theme}
              onClick={() => handleThemeClick(s)}
              className="bg-bg-primary border border-border-secondary rounded-xl p-4 text-left hover:border-border-brand transition duration-100 ease-linear group"
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs font-semibold truncate max-w-[70%]"
                  style={{ color: s.color }}
                >
                  {s.theme}
                </span>
                <span className="text-base font-medium leading-none">
                  {trendIcon(s.trend)}
                </span>
              </div>

              {/* Sparkline */}
              <div className="h-10 mb-3 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={s.sparklineData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id={`grad-${s.theme.replace(/\s+/g, "-")}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.color} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke={s.color}
                      strokeWidth={1.5}
                      fill={`url(#grad-${s.theme.replace(/\s+/g, "-")})`}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-semibold text-text-primary leading-none">
                  {s.total}
                </span>
                <span className="text-xs text-text-tertiary">tickets</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  color={s.avgFrustration >= 5 ? "error" : s.avgFrustration >= 3 ? "warning" : "gray"}
                  size="sm"
                  type="pill-color"
                >
                  Frust. {s.avgFrustration}
                </Badge>
                <Badge
                  color={s.preventablePct >= 50 ? "warning" : "gray"}
                  size="sm"
                  type="pill-color"
                >
                  {s.preventablePct}% prev.
                </Badge>
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
