"use client";

import { useState, useMemo } from "react";
import type { Ticket } from "@/lib/types";
import { TicketDrawer } from "@/components/TicketDrawer";
import { Badge, BadgeWithDot } from "@/components/uui-base/badges/badges";

const EXCLUDED_RIDS = new Set([null, "", "Unknown", "N/A", "unknown", "n/a"]);

function getCellStyle(count: number): string {
  if (count === 0) return "bg-transparent";
  if (count <= 2) return "bg-indigo-500/15";
  if (count <= 5) return "bg-indigo-500/40";
  return "bg-indigo-500/70";
}

function getCellTextColor(count: number): string {
  if (count === 0) return "text-text-quaternary";
  if (count <= 2) return "text-indigo-700";
  if (count <= 5) return "text-white";
  return "text-white";
}

type HotspotInfo = {
  rid: string;
  totalTickets: number;
  themeCount: number;
  topThemes: { theme: string; count: number }[];
  type: "concentrated" | "spread";
};

export default function HeatmapPage({ tickets }: { tickets: Ticket[] }) {
  const [drawerTickets, setDrawerTickets] = useState<Ticket[] | null>(null);
  const [drawerTitle, setDrawerTitle] = useState("");

  const { topProperties, topThemes, matrix, ticketsByProperty, ticketsByTheme, hotspots } =
    useMemo(() => {
      // Count tickets per property (excluding null/Unknown/N/A)
      const propCounts = new Map<string, number>();
      for (const t of tickets) {
        if (EXCLUDED_RIDS.has(t.rid) || !t.rid) continue;
        propCounts.set(t.rid, (propCounts.get(t.rid) || 0) + 1);
      }

      // Top 25 properties by ticket count
      const topProps = [...propCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25)
        .map(([rid]) => rid);

      // Count tickets per theme
      const themeCounts = new Map<string, number>();
      for (const t of tickets) {
        if (!t.ux_theme) continue;
        themeCounts.set(t.ux_theme, (themeCounts.get(t.ux_theme) || 0) + 1);
      }

      // Top 10 themes by ticket count
      const topTh = [...themeCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([theme]) => theme);

      // Build matrix: property -> theme -> tickets
      const mat = new Map<string, Map<string, Ticket[]>>();
      const byProp = new Map<string, Ticket[]>();
      const byTheme = new Map<string, Ticket[]>();

      for (const t of tickets) {
        if (!t.rid || EXCLUDED_RIDS.has(t.rid)) continue;

        if (!byProp.has(t.rid)) byProp.set(t.rid, []);
        byProp.get(t.rid)!.push(t);

        if (!byTheme.has(t.ux_theme)) byTheme.set(t.ux_theme, []);
        byTheme.get(t.ux_theme)!.push(t);

        if (!topProps.includes(t.rid) || !topTh.includes(t.ux_theme)) continue;

        if (!mat.has(t.rid)) mat.set(t.rid, new Map());
        const row = mat.get(t.rid)!;
        if (!row.has(t.ux_theme)) row.set(t.ux_theme, []);
        row.get(t.ux_theme)!.push(t);
      }

      // Hotspot analysis
      const hotspotList: HotspotInfo[] = topProps.map((rid) => {
        const themeDist = new Map<string, number>();
        const propTickets = byProp.get(rid) || [];
        for (const t of propTickets) {
          if (!t.ux_theme) continue;
          themeDist.set(t.ux_theme, (themeDist.get(t.ux_theme) || 0) + 1);
        }

        const sorted = [...themeDist.entries()].sort((a, b) => b[1] - a[1]);
        const themeCount = sorted.length;
        const topTwo = sorted.slice(0, 2).reduce((s, [, c]) => s + c, 0);
        const total = propTickets.length;
        const concentrated = themeCount <= 2 || (total > 0 && topTwo / total >= 0.7);

        return {
          rid,
          totalTickets: total,
          themeCount,
          topThemes: sorted.slice(0, 3).map(([theme, count]) => ({ theme, count })),
          type: concentrated ? "concentrated" : "spread",
        };
      });

      return {
        topProperties: topProps,
        topThemes: topTh,
        matrix: mat,
        ticketsByProperty: byProp,
        ticketsByTheme: byTheme,
        hotspots: hotspotList,
      };
    }, [tickets]);

  function openCell(rid: string, theme: string) {
    const cellTickets = matrix.get(rid)?.get(theme) || [];
    if (cellTickets.length === 0) return;
    setDrawerTitle(`${rid} — ${theme}`);
    setDrawerTickets(cellTickets);
  }

  function openProperty(rid: string) {
    const propTickets = ticketsByProperty.get(rid) || [];
    if (propTickets.length === 0) return;
    setDrawerTitle(`All tickets for ${rid}`);
    setDrawerTickets(propTickets);
  }

  function openTheme(theme: string) {
    const themeTickets = ticketsByTheme.get(theme) || [];
    if (themeTickets.length === 0) return;
    setDrawerTitle(`All tickets — ${theme}`);
    setDrawerTickets(themeTickets);
  }

  const concentratedHotspots = hotspots.filter((h) => h.type === "concentrated");
  const spreadHotspots = hotspots.filter((h) => h.type === "spread");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          Property × Theme Heatmap
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Which properties are driving which pain points? Click any cell, row
          header, or column header to drill into tickets.
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-text-tertiary">
        <span>Intensity:</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-4 w-4 rounded border border-border-secondary bg-transparent" />
          0
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-4 w-4 rounded bg-indigo-500/15" />
          1–2
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-4 w-4 rounded bg-indigo-500/40" />
          3–5
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-4 w-4 rounded bg-indigo-500/70" />
          6+
        </span>
      </div>

      {/* Heatmap Table */}
      <div className="overflow-x-auto rounded-xl border border-border-secondary bg-bg-primary">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-bg-secondary px-4 py-3 text-left text-xs font-medium text-text-secondary border-b border-r border-border-secondary min-w-[140px]">
                Property
              </th>
              {topThemes.map((theme) => (
                <th
                  key={theme}
                  className="border-b border-border-secondary bg-bg-secondary px-2 py-3 text-center"
                >
                  <button
                    onClick={() => openTheme(theme)}
                    className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors max-w-[100px] truncate block mx-auto"
                    title={theme}
                  >
                    <span className="writing-mode-vertical inline-block origin-center -rotate-45 whitespace-nowrap text-[11px] leading-tight">
                      {theme.length > 20 ? theme.slice(0, 18) + "…" : theme}
                    </span>
                  </button>
                </th>
              ))}
              <th className="border-b border-l border-border-secondary bg-bg-secondary px-3 py-3 text-center text-xs font-medium text-text-tertiary">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {topProperties.map((rid, rowIdx) => {
              const rowTotal = ticketsByProperty.get(rid)?.length || 0;
              return (
                <tr
                  key={rid}
                  className={
                    rowIdx % 2 === 0 ? "bg-bg-primary" : "bg-bg-secondary/50"
                  }
                >
                  <td className="sticky left-0 z-10 border-r border-border-secondary px-4 py-2 bg-inherit">
                    <button
                      onClick={() => openProperty(rid)}
                      className="text-sm font-medium text-text-primary hover:text-indigo-600 transition-colors truncate max-w-[130px] block text-left"
                      title={rid}
                    >
                      {rid}
                    </button>
                  </td>
                  {topThemes.map((theme) => {
                    const cellTickets =
                      matrix.get(rid)?.get(theme) || [];
                    const count = cellTickets.length;
                    return (
                      <td key={theme} className="px-0 py-0">
                        <button
                          onClick={() => openCell(rid, theme)}
                          disabled={count === 0}
                          className={`w-full h-full min-h-[36px] min-w-[48px] flex items-center justify-center text-xs font-medium transition-colors ${getCellStyle(count)} ${getCellTextColor(count)} ${count > 0 ? "hover:ring-2 hover:ring-indigo-400 hover:ring-inset cursor-pointer" : "cursor-default"}`}
                        >
                          {count > 0 ? count : ""}
                        </button>
                      </td>
                    );
                  })}
                  <td className="border-l border-border-secondary px-3 py-2 text-center text-sm font-semibold text-text-secondary">
                    {rowTotal}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Hotspot Summary */}
      <div className="space-y-6">
        <h3 className="text-base font-semibold text-text-primary">
          Hotspot Properties
        </h3>

        {/* Concentrated */}
        {concentratedHotspots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BadgeWithDot color="error" size="sm" type="pill-color">
                Systemic
              </BadgeWithDot>
              <span className="text-sm text-text-secondary">
                Issues concentrated in 1–2 themes — likely a property-specific
                systemic problem
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {concentratedHotspots.slice(0, 9).map((h) => (
                <button
                  key={h.rid}
                  onClick={() => openProperty(h.rid)}
                  className="rounded-lg border border-border-secondary bg-bg-primary p-4 text-left hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-text-primary truncate">
                      {h.rid}
                    </span>
                    <Badge color="gray" size="sm" type="pill-color">
                      {h.totalTickets} tickets
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {h.topThemes.map((tt) => (
                      <Badge
                        key={tt.theme}
                        color="error"
                        size="sm"
                        type="pill-color"
                      >
                        {tt.theme} ({tt.count})
                      </Badge>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Spread */}
        {spreadHotspots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BadgeWithDot color="warning" size="sm" type="pill-color">
                General
              </BadgeWithDot>
              <span className="text-sm text-text-secondary">
                Issues spread across many themes — indicates general poor quality
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {spreadHotspots.slice(0, 9).map((h) => (
                <button
                  key={h.rid}
                  onClick={() => openProperty(h.rid)}
                  className="rounded-lg border border-border-secondary bg-bg-primary p-4 text-left hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-text-primary truncate">
                      {h.rid}
                    </span>
                    <Badge color="gray" size="sm" type="pill-color">
                      {h.totalTickets} tickets
                    </Badge>
                  </div>
                  <div className="text-xs text-text-tertiary">
                    {h.themeCount} themes — top:{" "}
                    {h.topThemes.map((tt) => `${tt.theme} (${tt.count})`).join(", ")}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
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
