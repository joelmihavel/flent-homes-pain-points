"use client";

import { useState, useMemo } from "react";
import type { Ticket } from "@/lib/types";
import { TicketDrawer } from "@/components/TicketDrawer";
import { Badge } from "@/components/uui-base/badges/badges";

const RESOLUTION_COLORS: Record<string, string> = {
  "Vendor visit": "#6366f1",
  "Part replacement": "#ec4899",
  "Information shared": "#10b981",
  "Self-resolved": "#06b6d4",
  "No issue found": "#9ca3af",
  "Duplicate": "#f59e0b",
};

const DEFAULT_COLOR = "#e5e7eb";

function getResolutionColor(type: string): string {
  return RESOLUTION_COLORS[type] || DEFAULT_COLOR;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function pct(num: number, denom: number): number {
  if (denom === 0) return 0;
  return Math.round((num / denom) * 100);
}

function fmtPct(num: number, denom: number): string {
  return `${pct(num, denom)}%`;
}

function fmtDays(hours: number): string {
  if (hours === 0) return "0d";
  const days = hours / 24;
  if (days < 1) return `${Math.round(hours)}h`;
  return `${days.toFixed(1)}d`;
}

type SortMode = "slowest" | "repeat";

interface ThemeData {
  theme: string;
  tickets: Ticket[];
  resolutionDist: { type: string; count: number }[];
  avgResolutionHours: number;
  medianResolutionHours: number;
  repeatRate: number;
  followUpRate: number;
  escalationRate: number;
  fcrRate: number;
}

function computeFollowUpRate(tickets: Ticket[]): number {
  // Approximate: same customer_name, same ux_theme, create_date within 30 days
  let followUpCount = 0;
  const byCustomerTheme = new Map<string, Date[]>();

  for (const t of tickets) {
    if (!t.customer_name || !t.create_date) continue;
    const key = `${t.customer_name}|||${t.ux_theme}`;
    if (!byCustomerTheme.has(key)) byCustomerTheme.set(key, []);
    byCustomerTheme.get(key)!.push(new Date(t.create_date));
  }

  for (const dates of byCustomerTheme.values()) {
    if (dates.length < 2) continue;
    dates.sort((a, b) => a.getTime() - b.getTime());
    for (let i = 1; i < dates.length; i++) {
      const diffDays =
        (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 30) {
        followUpCount++;
      }
    }
  }

  return tickets.length > 0 ? followUpCount / tickets.length : 0;
}

function computeThemeData(theme: string, tickets: Ticket[]): ThemeData {
  // Resolution type distribution
  const resMap = new Map<string, number>();
  for (const t of tickets) {
    const rt = t.resolution_type || "Unknown";
    resMap.set(rt, (resMap.get(rt) || 0) + 1);
  }
  const resolutionDist = Array.from(resMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // Resolution times
  const resTimes = tickets
    .map((t) => t.resolution_time_hours)
    .filter((h): h is number => h !== null && h > 0);
  const avgResolutionHours =
    resTimes.length > 0
      ? resTimes.reduce((s, v) => s + v, 0) / resTimes.length
      : 0;
  const medianResolutionHours = median(resTimes);

  // Repeat rate (same customer came back)
  const repeatCount = tickets.filter((t) => t.is_repeat_customer_issue).length;
  const repeatRate = tickets.length > 0 ? repeatCount / tickets.length : 0;

  // Follow-up rate
  const followUpRate = computeFollowUpRate(tickets);

  // Escalation rate
  const escalationCount = tickets.filter(
    (t) => t.priority === "URGENT" || t.priority === "HIGH"
  ).length;
  const escalationRate =
    tickets.length > 0 ? escalationCount / tickets.length : 0;

  // First-contact resolution rate
  const fcrCount = tickets.filter(
    (t) => t.resolution_time_hours !== null && t.resolution_time_hours < 24
  ).length;
  const fcrRate = tickets.length > 0 ? fcrCount / tickets.length : 0;

  return {
    theme,
    tickets,
    resolutionDist,
    avgResolutionHours,
    medianResolutionHours,
    repeatRate,
    followUpRate,
    escalationRate,
    fcrRate,
  };
}

function MetricCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={`text-sm font-semibold ${color || "text-text-primary"}`}
      >
        {value}
      </span>
      <span className="text-[10px] text-text-quaternary uppercase tracking-wider font-medium">
        {label}
      </span>
    </div>
  );
}

export default function ResolutionPage({
  tickets,
}: {
  tickets: Ticket[];
}) {
  const [sortMode, setSortMode] = useState<SortMode>("slowest");
  const [drawerTickets, setDrawerTickets] = useState<Ticket[] | null>(null);
  const [drawerTitle, setDrawerTitle] = useState("");

  // Compute theme data
  const themeDataList = useMemo(() => {
    const themeMap = new Map<string, Ticket[]>();
    for (const t of tickets) {
      const theme = t.ux_theme || "Uncategorized";
      if (!themeMap.has(theme)) themeMap.set(theme, []);
      themeMap.get(theme)!.push(t);
    }
    return Array.from(themeMap.entries()).map(([theme, tix]) =>
      computeThemeData(theme, tix)
    );
  }, [tickets]);

  // Sort
  const sortedThemes = useMemo(() => {
    const list = [...themeDataList];
    if (sortMode === "slowest") {
      list.sort((a, b) => b.avgResolutionHours - a.avgResolutionHours);
    } else {
      list.sort((a, b) => b.repeatRate - a.repeatRate);
    }
    return list;
  }, [themeDataList, sortMode]);

  // Overall metrics
  const overall = useMemo(() => {
    const resTimes = tickets
      .map((t) => t.resolution_time_hours)
      .filter((h): h is number => h !== null && h > 0);
    const avgHours =
      resTimes.length > 0
        ? resTimes.reduce((s, v) => s + v, 0) / resTimes.length
        : 0;
    const fcrCount = tickets.filter(
      (t) => t.resolution_time_hours !== null && t.resolution_time_hours < 24
    ).length;
    const repeatCount = tickets.filter(
      (t) => t.is_repeat_customer_issue
    ).length;
    const escalationCount = tickets.filter(
      (t) => t.priority === "URGENT" || t.priority === "HIGH"
    ).length;

    return {
      avgHours,
      medianHours: median(resTimes),
      fcrRate: tickets.length > 0 ? fcrCount / tickets.length : 0,
      repeatRate: tickets.length > 0 ? repeatCount / tickets.length : 0,
      escalationRate:
        tickets.length > 0 ? escalationCount / tickets.length : 0,
    };
  }, [tickets]);

  function openDrawer(filteredTickets: Ticket[], title: string) {
    setDrawerTickets(filteredTickets);
    setDrawerTitle(title);
  }

  return (
    <div className="space-y-6">
      {/* Top summary */}
      <div className="bg-bg-primary border border-border-secondary rounded-xl p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4">
          Overall Resolution Metrics
        </h2>
        <div className="flex items-center justify-between gap-6">
          <MetricCell
            label="Avg Resolution"
            value={fmtDays(overall.avgHours)}
          />
          <MetricCell
            label="Median Resolution"
            value={fmtDays(overall.medianHours)}
          />
          <MetricCell
            label="First-Contact Rate"
            value={`${Math.round(overall.fcrRate * 100)}%`}
          />
          <MetricCell
            label="Repeat Rate"
            value={`${Math.round(overall.repeatRate * 100)}%`}
            color={
              overall.repeatRate > 0.2
                ? "text-text-error-primary"
                : undefined
            }
          />
          <MetricCell
            label="Escalation Rate"
            value={`${Math.round(overall.escalationRate * 100)}%`}
            color={
              overall.escalationRate > 0.3
                ? "text-text-warning-primary"
                : undefined
            }
          />
          <MetricCell
            label="Total Tickets"
            value={tickets.length.toLocaleString()}
          />
        </div>
      </div>

      {/* Sort toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">
          Resolution by Theme
        </h2>
        <div className="flex items-center gap-1 bg-bg-secondary rounded-lg p-0.5">
          <button
            onClick={() => setSortMode("slowest")}
            className={`px-3 py-1 text-xs rounded-md transition duration-100 ${
              sortMode === "slowest"
                ? "bg-bg-primary text-text-primary shadow-xs font-medium"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            Slowest resolution
          </button>
          <button
            onClick={() => setSortMode("repeat")}
            className={`px-3 py-1 text-xs rounded-md transition duration-100 ${
              sortMode === "repeat"
                ? "bg-bg-primary text-text-primary shadow-xs font-medium"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            Highest repeat rate
          </button>
        </div>
      </div>

      {/* Theme cards */}
      <div className="space-y-3">
        {sortedThemes.map((td) => (
          <div
            key={td.theme}
            className="bg-bg-primary border border-border-secondary rounded-xl p-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text-primary">
                  {td.theme}
                </h3>
                <Badge color="gray" size="sm" type="pill-color">
                  {td.tickets.length} tickets
                </Badge>
              </div>
              <button
                onClick={() =>
                  openDrawer(td.tickets, `${td.theme} — All Tickets`)
                }
                className="text-xs text-text-tertiary hover:text-text-primary transition"
              >
                View tickets →
              </button>
            </div>

            {/* Stacked bar */}
            <div className="mb-4">
              <div className="flex h-7 w-full rounded-md overflow-hidden">
                {td.resolutionDist.map((rd) => {
                  const widthPct = (rd.count / td.tickets.length) * 100;
                  if (widthPct < 0.5) return null;
                  return (
                    <button
                      key={rd.type}
                      title={`${rd.type}: ${rd.count} (${Math.round(widthPct)}%)`}
                      onClick={() =>
                        openDrawer(
                          td.tickets.filter(
                            (t) =>
                              (t.resolution_type || "Unknown") === rd.type
                          ),
                          `${td.theme} — ${rd.type}`
                        )
                      }
                      className="h-full transition-opacity hover:opacity-80 cursor-pointer relative group"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: getResolutionColor(rd.type),
                        minWidth: widthPct > 0 ? "2px" : undefined,
                      }}
                    >
                      {widthPct > 12 && (
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white/90 truncate px-1">
                          {rd.type}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {td.resolutionDist.map((rd) => (
                  <button
                    key={rd.type}
                    onClick={() =>
                      openDrawer(
                        td.tickets.filter(
                          (t) =>
                            (t.resolution_type || "Unknown") === rd.type
                        ),
                        `${td.theme} — ${rd.type}`
                      )
                    }
                    className="flex items-center gap-1.5 text-[11px] text-text-secondary hover:text-text-primary transition"
                  >
                    <span
                      className="inline-block size-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: getResolutionColor(rd.type),
                      }}
                    />
                    {rd.type}{" "}
                    <span className="text-text-quaternary">
                      {fmtPct(rd.count, td.tickets.length)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics row */}
            <div className="flex items-center gap-6 pt-3 border-t border-border-secondary">
              <MetricCell
                label="Avg Resolution"
                value={fmtDays(td.avgResolutionHours)}
              />
              <MetricCell
                label="Median"
                value={fmtDays(td.medianResolutionHours)}
              />
              <MetricCell
                label="First-Contact"
                value={`${Math.round(td.fcrRate * 100)}%`}
                color={
                  td.fcrRate < 0.3
                    ? "text-text-error-primary"
                    : undefined
                }
              />
              <MetricCell
                label="Repeat Rate"
                value={`${Math.round(td.repeatRate * 100)}%`}
                color={
                  td.repeatRate > 0.2
                    ? "text-text-error-primary"
                    : undefined
                }
              />
              <MetricCell
                label="Follow-Up (30d)"
                value={`${Math.round(td.followUpRate * 100)}%`}
                color={
                  td.followUpRate > 0.15
                    ? "text-text-warning-primary"
                    : undefined
                }
              />
              <MetricCell
                label="Escalation"
                value={`${Math.round(td.escalationRate * 100)}%`}
                color={
                  td.escalationRate > 0.3
                    ? "text-text-warning-primary"
                    : undefined
                }
              />
            </div>
          </div>
        ))}
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
