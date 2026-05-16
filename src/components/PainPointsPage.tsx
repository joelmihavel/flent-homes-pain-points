"use client";

import { useMemo, useState } from "react";
import type { Ticket } from "@/lib/types";
import { Badge, BadgeWithDot } from "@/components/uui-base/badges/badges";
import { TicketDrawer } from "./TicketDrawer";

type PainPoint = {
  theme: string;
  count: number;
  repeatPct: number;
  firstWeekPct: number;
  avgFrustration: number;
  preventableCount: number;
  avgResolutionDays: number;
  totalCost: number;
  topRootCauses: { name: string; count: number }[];
  topResolutionTypes: { name: string; count: number }[];
  tickets: Ticket[];
};

export function PainPointsPage({ tickets }: { tickets: Ticket[] }) {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [drawerTickets, setDrawerTickets] = useState<Ticket[] | null>(null);
  const [drawerTitle, setDrawerTitle] = useState("");

  const painPoints = useMemo(() => {
    const grouped: Record<string, Ticket[]> = {};
    for (const t of tickets) {
      if (!grouped[t.ux_theme]) grouped[t.ux_theme] = [];
      grouped[t.ux_theme].push(t);
    }

    return Object.entries(grouped)
      .map(([theme, tix]): PainPoint => {
        const rcCount: Record<string, number> = {};
        for (const t of tix)
          for (const rc of t.root_causes)
            if (rc !== "Undiagnosed") rcCount[rc] = (rcCount[rc] || 0) + 1;

        const rtCount: Record<string, number> = {};
        for (const t of tix)
          if (t.resolution_type !== "Unknown")
            rtCount[t.resolution_type] = (rtCount[t.resolution_type] || 0) + 1;

        const resHours = tix
          .filter((t) => t.resolution_time_hours && t.resolution_time_hours > 0)
          .map((t) => t.resolution_time_hours!);

        return {
          theme,
          count: tix.length,
          repeatPct: Math.round(
            (tix.filter((t) => t.is_repeat_customer_issue).length / tix.length) * 100
          ),
          firstWeekPct: Math.round(
            (tix.filter((t) => t.is_first_week_ticket).length / tix.length) * 100
          ),
          avgFrustration:
            Math.round(
              (tix.reduce((s, t) => s + t.frustration_score, 0) / tix.length) * 10
            ) / 10,
          preventableCount: tix.filter((t) => t.is_preventable).length,
          avgResolutionDays:
            resHours.length > 0
              ? Math.round(resHours.reduce((a, b) => a + b, 0) / resHours.length / 24)
              : 0,
          totalCost: Math.round(tix.reduce((s, t) => s + t.cost, 0)),
          topRootCauses: Object.entries(rcCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4)
            .map(([name, count]) => ({ name, count })),
          topResolutionTypes: Object.entries(rtCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4)
            .map(([name, count]) => ({ name, count })),
          tickets: tix,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [tickets]);

  const selected = selectedTheme
    ? painPoints.find((p) => p.theme === selectedTheme)
    : null;

  function openDrawer(tix: Ticket[], title: string) {
    setDrawerTickets(tix);
    setDrawerTitle(title);
  }

  return (
    <div className="p-6 max-w-[1200px]">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-text-primary">
          User Pain Points
        </h1>
        <p className="text-sm text-text-tertiary mt-0.5">
          Click any theme to explore, or click ticket counts to see all tickets.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Pain point list */}
        <div className="col-span-3 space-y-2">
          {painPoints.map((pp) => (
            <div
              key={pp.theme}
              className={`bg-bg-primary rounded-xl border transition duration-100 ease-linear ${
                selectedTheme === pp.theme
                  ? "border-border-brand ring-1 ring-brand-500/10"
                  : "border-border-secondary hover:border-border-primary"
              }`}
            >
              {/* Clickable header */}
              <button
                onClick={() =>
                  setSelectedTheme(selectedTheme === pp.theme ? null : pp.theme)
                }
                className="w-full text-left p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-text-primary">
                    {pp.theme}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-tertiary">
                    {pp.totalCost > 0 && (
                      <span>₹{(pp.totalCost / 1000).toFixed(0)}K</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <BadgeWithDot
                    color={
                      pp.avgFrustration >= 3
                        ? "error"
                        : pp.avgFrustration >= 2
                          ? "warning"
                          : "gray"
                    }
                    size="sm"
                    type="pill-color"
                  >
                    Frustration {pp.avgFrustration}/10
                  </BadgeWithDot>
                  <Badge color="warning" size="sm" type="pill-color">
                    {pp.preventableCount} preventable
                  </Badge>
                  <Badge color="purple" size="sm" type="pill-color">
                    {pp.firstWeekPct}% first-week
                  </Badge>
                  <Badge color="gray" size="sm" type="modern">
                    {pp.repeatPct}% repeat
                  </Badge>
                  {pp.avgResolutionDays > 0 && (
                    <Badge color="gray" size="sm" type="modern">
                      ~{pp.avgResolutionDays}d resolve
                    </Badge>
                  )}
                </div>
              </button>

              {/* View all tickets button */}
              <div className="px-4 pb-3 flex items-center gap-2">
                <button
                  onClick={() => openDrawer(pp.tickets, `${pp.theme} — All Tickets`)}
                  className="text-xs text-text-brand-secondary hover:text-text-brand-primary font-medium transition"
                >
                  View all {pp.count} tickets →
                </button>
                {pp.preventableCount > 0 && (
                  <button
                    onClick={() =>
                      openDrawer(
                        pp.tickets.filter((t) => t.is_preventable),
                        `${pp.theme} — Preventable Tickets`
                      )
                    }
                    className="text-xs text-text-warning-primary hover:underline font-medium transition"
                  >
                    {pp.preventableCount} preventable →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        <div className="col-span-2">
          {selected ? (
            <div className="bg-bg-primary rounded-xl border border-border-secondary p-5 sticky top-6">
              <div className="text-sm font-medium text-text-primary mb-1">
                {selected.theme}
              </div>
              <div className="text-xs text-text-tertiary mb-4">
                {selected.count} tickets · {selected.preventableCount} preventable · {selected.avgResolutionDays}d avg
              </div>

              {/* How resolved */}
              {selected.topResolutionTypes.length > 0 && (
                <div className="mb-5">
                  <div className="text-xs text-text-secondary font-medium mb-2">
                    How these get resolved
                  </div>
                  <div className="space-y-1.5">
                    {selected.topResolutionTypes.map((rt) => (
                      <div key={rt.name} className="flex items-center gap-2">
                        <div className="w-24 bg-bg-quaternary rounded-full h-1.5">
                          <div
                            className="bg-fg-success-secondary rounded-full h-1.5"
                            style={{
                              width: `${(rt.count / selected.topResolutionTypes[0].count) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-text-tertiary flex-1">
                          {rt.name}
                        </span>
                        <span className="text-xs text-text-quaternary tabular-nums">
                          {rt.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Root causes */}
              {selected.topRootCauses.length > 0 && (
                <div className="mb-5">
                  <div className="text-xs text-text-secondary font-medium mb-2">
                    Root causes
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.topRootCauses.map((rc) => (
                      <Badge key={rc.name} color="gray" size="sm" type="modern">
                        {rc.name} ({rc.count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Top frustrated tickets */}
              <div className="mb-4">
                <div className="text-xs text-text-secondary font-medium mb-2">
                  Highest frustration tickets
                </div>
                <div className="space-y-3">
                  {selected.tickets
                    .sort((a, b) => b.frustration_score - a.frustration_score)
                    .slice(0, 5)
                    .map((t) => (
                      <div
                        key={t.id}
                        className="border-b border-border-secondary pb-2.5 last:border-0"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <BadgeWithDot
                            color={
                              t.priority === "URGENT" || t.priority === "HIGH"
                                ? "error"
                                : "gray"
                            }
                            size="sm"
                            type="pill-color"
                          >
                            {t.priority}
                          </BadgeWithDot>
                          <span className="text-[10px] text-text-quaternary ml-auto">
                            Frustration {t.frustration_score}/10
                          </span>
                        </div>
                        <div className="text-xs text-text-secondary line-clamp-2">
                          {t.description}
                        </div>
                        <div className="text-[10px] text-text-quaternary mt-1">
                          {t.rid} · {t.category} · {t.create_date}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <button
                onClick={() =>
                  openDrawer(selected.tickets, `${selected.theme} — All Tickets`)
                }
                className="w-full text-center text-xs font-medium text-text-brand-secondary hover:text-text-brand-primary py-2 border border-border-secondary rounded-lg hover:bg-bg-secondary transition"
              >
                View all {selected.count} tickets
              </button>
            </div>
          ) : (
            <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
              <div className="text-sm text-text-quaternary py-16 text-center">
                Click a pain point to explore root causes and resolution
                patterns
              </div>
            </div>
          )}
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
