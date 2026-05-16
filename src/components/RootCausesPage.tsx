"use client";

import { useMemo, useState } from "react";
import type { Ticket } from "@/lib/types";
import { Badge, BadgeWithDot } from "@/components/uui-base/badges/badges";
import { TicketDrawer } from "./TicketDrawer";

const INTERVENTION_MAP: Record<string, string> = {
  "Equipment Malfunction":
    "Preventive maintenance schedule — quarterly inspections for aging appliances",
  Blockage:
    "Drain cleaning program — proactive clearing for repeat-blocked properties",
  "Physical Damage":
    "Move-in/move-out inspection checklist with photo documentation",
  "Electrical Issue":
    "Electrical audit for flagged properties — check wiring, MCBs, earthing",
  "Communication Failure":
    "Automated status updates via WhatsApp at each ticket stage",
  "Water Supply Issue":
    "Water pressure monitoring + tank-level alerts for chronic properties",
  "Installation Issue":
    "Standardized installation SOPs with vendor certification",
  "Pest Infestation": "Quarterly pest control contracts for all properties",
  "Normal Wear": "Proactive replacement schedule based on fixture age",
  "Vendor No-show":
    "Vendor SLA tracking with automated re-assignment after missed window",
};

// Effort is a rough 1–3 scale for the 2×2 matrix
const EFFORT_MAP: Record<string, number> = {
  "Communication Failure": 1,
  "Vendor No-show": 1,
  "Normal Wear": 2,
  Blockage: 2,
  "Pest Infestation": 2,
  "Physical Damage": 1,
  "Installation Issue": 2,
  "Equipment Malfunction": 3,
  "Electrical Issue": 3,
  "Water Supply Issue": 3,
};

function getIntervention(cause: string): string {
  return INTERVENTION_MAP[cause] ?? "Investigate and create targeted SOP";
}

function getEffort(cause: string): number {
  return EFFORT_MAP[cause] ?? 2;
}

type RootCauseData = {
  cause: string;
  count: number;
  totalCost: number;
  avgFrustration: number;
  preventablePct: number;
  topThemes: { name: string; count: number }[];
  topProperties: { rid: string; count: number }[];
  mostCommonResolution: string;
  intervention: string;
  effort: number;
  tickets: Ticket[];
};

export function RootCausesPage({ tickets }: { tickets: Ticket[] }) {
  const [drawerTickets, setDrawerTickets] = useState<Ticket[] | null>(null);
  const [drawerTitle, setDrawerTitle] = useState("");

  const rootCauses = useMemo(() => {
    const grouped: Record<string, Ticket[]> = {};

    for (const t of tickets) {
      for (const rc of t.root_causes) {
        if (rc === "Undiagnosed") continue;
        if (!grouped[rc]) grouped[rc] = [];
        grouped[rc].push(t);
      }
    }

    return Object.entries(grouped)
      .map(([cause, tix]): RootCauseData => {
        // Theme counts
        const themeCount: Record<string, number> = {};
        for (const t of tix)
          themeCount[t.ux_theme] = (themeCount[t.ux_theme] || 0) + 1;

        // Property counts
        const propCount: Record<string, number> = {};
        for (const t of tix)
          if (t.rid) propCount[t.rid] = (propCount[t.rid] || 0) + 1;

        // Resolution type counts
        const resCount: Record<string, number> = {};
        for (const t of tix)
          if (t.resolution_type && t.resolution_type !== "Unknown")
            resCount[t.resolution_type] =
              (resCount[t.resolution_type] || 0) + 1;

        const topRes = Object.entries(resCount).sort(([, a], [, b]) => b - a);

        return {
          cause,
          count: tix.length,
          totalCost: Math.round(tix.reduce((s, t) => s + t.cost, 0)),
          avgFrustration:
            Math.round(
              (tix.reduce((s, t) => s + t.frustration_score, 0) / tix.length) *
                10
            ) / 10,
          preventablePct: Math.round(
            (tix.filter((t) => t.is_preventable).length / tix.length) * 100
          ),
          topThemes: Object.entries(themeCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([name, count]) => ({ name, count })),
          topProperties: Object.entries(propCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([rid, count]) => ({ rid, count })),
          mostCommonResolution: topRes.length > 0 ? topRes[0][0] : "N/A",
          intervention: getIntervention(cause),
          effort: getEffort(cause),
          tickets: tix,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [tickets]);

  const totalDiagnosedCost = rootCauses.reduce(
    (s, rc) => s + rc.totalCost,
    0
  );

  // 2×2 matrix: impact (ticket count) vs effort
  const medianCount =
    rootCauses.length > 0
      ? rootCauses[Math.floor(rootCauses.length / 2)].count
      : 0;

  const quadrants = useMemo(() => {
    const highImpactLowEffort: RootCauseData[] = [];
    const highImpactHighEffort: RootCauseData[] = [];
    const lowImpactLowEffort: RootCauseData[] = [];
    const lowImpactHighEffort: RootCauseData[] = [];

    for (const rc of rootCauses) {
      const highImpact = rc.count >= medianCount;
      const highEffort = rc.effort >= 3;

      if (highImpact && !highEffort) highImpactLowEffort.push(rc);
      else if (highImpact && highEffort) highImpactHighEffort.push(rc);
      else if (!highImpact && !highEffort) lowImpactLowEffort.push(rc);
      else lowImpactHighEffort.push(rc);
    }

    return {
      highImpactLowEffort,
      highImpactHighEffort,
      lowImpactLowEffort,
      lowImpactHighEffort,
    };
  }, [rootCauses, medianCount]);

  function openDrawer(tix: Ticket[], title: string) {
    setDrawerTickets(tix);
    setDrawerTitle(title);
  }

  return (
    <div className="p-6 max-w-[1200px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-text-primary">
          Root Cause → Action Mapping
        </h1>
        <p className="text-sm text-text-tertiary mt-0.5">
          Each root cause is tied to a concrete, implementable intervention.
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-bg-primary rounded-xl border border-border-secondary p-4">
          <div className="text-xs text-text-tertiary mb-1">
            Root causes identified
          </div>
          <div className="text-2xl font-semibold text-text-primary tabular-nums">
            {rootCauses.length}
          </div>
        </div>
        <div className="bg-bg-primary rounded-xl border border-border-secondary p-4">
          <div className="text-xs text-text-tertiary mb-1">
            Total cost of diagnosed issues
          </div>
          <div className="text-2xl font-semibold text-text-primary tabular-nums">
            {totalDiagnosedCost >= 100000
              ? `₹${(totalDiagnosedCost / 100000).toFixed(1)}L`
              : `₹${(totalDiagnosedCost / 1000).toFixed(0)}K`}
          </div>
        </div>
        <div className="bg-bg-primary rounded-xl border border-border-secondary p-4">
          <div className="text-xs text-text-tertiary mb-1">
            Tickets with root causes
          </div>
          <div className="text-2xl font-semibold text-text-primary tabular-nums">
            {tickets.filter((t) =>
              t.root_causes.some((rc) => rc !== "Undiagnosed")
            ).length}
          </div>
        </div>
      </div>

      {/* Action Priority Matrix */}
      <div className="bg-bg-primary rounded-xl border border-border-secondary p-5 mb-6">
        <div className="text-sm font-medium text-text-primary mb-1">
          Action Priority Matrix
        </div>
        <p className="text-xs text-text-tertiary mb-4">
          Plot of root causes by impact (ticket count) vs implementation effort.
          Start top-left.
        </p>
        <div className="grid grid-cols-2 grid-rows-2 gap-px bg-border-secondary rounded-lg overflow-hidden">
          {/* Top-left: High impact, low effort — Quick wins */}
          <div className="bg-bg-primary p-4 min-h-[120px]">
            <div className="text-[10px] font-semibold text-text-success-primary uppercase tracking-wide mb-2">
              Quick wins — do first
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quadrants.highImpactLowEffort.map((rc) => (
                <Badge key={rc.cause} color="success" size="sm" type="pill-color">
                  {rc.cause} ({rc.count})
                </Badge>
              ))}
              {quadrants.highImpactLowEffort.length === 0 && (
                <span className="text-xs text-text-quaternary">None</span>
              )}
            </div>
          </div>

          {/* Top-right: High impact, high effort — Major projects */}
          <div className="bg-bg-primary p-4 min-h-[120px]">
            <div className="text-[10px] font-semibold text-text-warning-primary uppercase tracking-wide mb-2">
              Major projects — plan carefully
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quadrants.highImpactHighEffort.map((rc) => (
                <Badge key={rc.cause} color="warning" size="sm" type="pill-color">
                  {rc.cause} ({rc.count})
                </Badge>
              ))}
              {quadrants.highImpactHighEffort.length === 0 && (
                <span className="text-xs text-text-quaternary">None</span>
              )}
            </div>
          </div>

          {/* Bottom-left: Low impact, low effort — Fill-ins */}
          <div className="bg-bg-primary p-4 min-h-[120px]">
            <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide mb-2">
              Fill-ins — easy but lower priority
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quadrants.lowImpactLowEffort.map((rc) => (
                <Badge key={rc.cause} color="gray" size="sm" type="pill-color">
                  {rc.cause} ({rc.count})
                </Badge>
              ))}
              {quadrants.lowImpactLowEffort.length === 0 && (
                <span className="text-xs text-text-quaternary">None</span>
              )}
            </div>
          </div>

          {/* Bottom-right: Low impact, high effort — Deprioritize */}
          <div className="bg-bg-primary p-4 min-h-[120px]">
            <div className="text-[10px] font-semibold text-text-quaternary uppercase tracking-wide mb-2">
              Deprioritize — high effort, low return
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quadrants.lowImpactHighEffort.map((rc) => (
                <Badge key={rc.cause} color="gray" size="sm" type="modern">
                  {rc.cause} ({rc.count})
                </Badge>
              ))}
              {quadrants.lowImpactHighEffort.length === 0 && (
                <span className="text-xs text-text-quaternary">None</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-text-quaternary">
          <span>← Lower effort</span>
          <span>Higher effort →</span>
        </div>
      </div>

      {/* Root cause cards */}
      <div className="space-y-3">
        {rootCauses.map((rc) => (
          <div
            key={rc.cause}
            className="bg-bg-primary rounded-xl border border-border-secondary p-5 hover:border-border-primary transition duration-100 ease-linear"
          >
            {/* Cause name + intervention */}
            <div className="mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="text-sm font-medium text-text-primary">
                  {rc.cause}
                </div>
                <Badge
                  color={
                    rc.preventablePct >= 70
                      ? "error"
                      : rc.preventablePct >= 40
                        ? "warning"
                        : "gray"
                  }
                  size="sm"
                  type="pill-color"
                >
                  {rc.preventablePct}% preventable
                </Badge>
              </div>
              <div className="mt-2 bg-bg-secondary rounded-lg px-3.5 py-2.5 border border-border-secondary">
                <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide mb-0.5">
                  Recommended action
                </div>
                <div className="text-sm text-text-primary leading-snug">
                  {rc.intervention}
                </div>
              </div>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-[10px] text-text-quaternary mb-0.5">
                  Tickets
                </div>
                <div className="text-sm font-semibold text-text-primary tabular-nums">
                  {rc.count}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-text-quaternary mb-0.5">
                  Total cost
                </div>
                <div className="text-sm font-semibold text-text-primary tabular-nums">
                  ₹{rc.totalCost >= 1000
                    ? `${(rc.totalCost / 1000).toFixed(0)}K`
                    : rc.totalCost}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-text-quaternary mb-0.5">
                  Avg frustration
                </div>
                <div className="text-sm font-semibold text-text-primary tabular-nums">
                  {rc.avgFrustration}/10
                </div>
              </div>
              <div>
                <div className="text-[10px] text-text-quaternary mb-0.5">
                  Resolution
                </div>
                <div className="text-sm text-text-secondary truncate">
                  {rc.mostCommonResolution}
                </div>
              </div>
            </div>

            {/* Affected themes */}
            {rc.topThemes.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] text-text-quaternary mb-1.5">
                  Most affected themes
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rc.topThemes.map((th) => (
                    <Badge
                      key={th.name}
                      color="purple"
                      size="sm"
                      type="pill-color"
                    >
                      {th.name} ({th.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Top affected properties */}
            {rc.topProperties.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] text-text-quaternary mb-1.5">
                  Top affected properties
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rc.topProperties.map((p) => (
                    <Badge
                      key={p.rid}
                      color="gray"
                      size="sm"
                      type="modern"
                    >
                      {p.rid} ({p.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* View tickets link */}
            <div className="pt-2 border-t border-border-secondary">
              <button
                onClick={() =>
                  openDrawer(rc.tickets, `${rc.cause} — All Tickets`)
                }
                className="text-xs text-text-brand-secondary hover:text-text-brand-primary font-medium transition"
              >
                View all {rc.count} tickets →
              </button>
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
