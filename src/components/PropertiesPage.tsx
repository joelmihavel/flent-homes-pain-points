"use client";

import { useMemo, useState } from "react";
import type { Ticket, Insights } from "@/lib/types";
import { Badge, BadgeWithDot } from "@/components/uui-base/badges/badges";
import { MiniBar } from "./MiniBar";
import { TicketDrawer } from "./TicketDrawer";

export function PropertiesPage({
  tickets,
  insights,
}: {
  tickets: Ticket[];
  insights: Insights;
}) {
  const [selectedRid, setSelectedRid] = useState<string | null>(null);
  const [drawerTickets, setDrawerTickets] = useState<Ticket[] | null>(null);
  const [drawerTitle, setDrawerTitle] = useState("");

  function openDrawer(tix: Ticket[], title: string) {
    setDrawerTickets(tix);
    setDrawerTitle(title);
  }

  const properties = useMemo(() => {
    const grouped: Record<string, Ticket[]> = {};
    for (const t of tickets) {
      const rid = t.rid || "Unknown";
      if (rid === "Unknown" || rid === "N/A" || rid === "") continue;
      if (!grouped[rid]) grouped[rid] = [];
      grouped[rid].push(t);
    }

    return Object.entries(grouped)
      .map(([rid, tix]) => {
        const catCount: Record<string, number> = {};
        for (const t of tix) {
          catCount[t.category] = (catCount[t.category] || 0) + 1;
        }
        const categories = Object.entries(catCount)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

        const repeatCats = categories
          .filter((c) => c.value >= 3)
          .map((c) => c.name);

        const resHours = tix
          .filter((t) => t.resolution_time_hours && t.resolution_time_hours > 0)
          .map((t) => t.resolution_time_hours!);

        const avgFrustration =
          Math.round(
            (tix.reduce((s, t) => s + t.frustration_score, 0) / tix.length) * 10
          ) / 10;

        const healthData = insights.property_health.find((p) => p.rid === rid);

        return {
          rid,
          totalTickets: tix.length,
          openTickets: tix.filter((t) => t.is_open).length,
          preventable: tix.filter((t) => t.is_preventable).length,
          firstWeek: tix.filter((t) => t.is_first_week_ticket).length,
          categories,
          repeatCats,
          avgFrustration,
          avgResolutionDays:
            resHours.length > 0
              ? Math.round(
                  resHours.reduce((a, b) => a + b, 0) / resHours.length / 24
                )
              : 0,
          totalCost: Math.round(tix.reduce((s, t) => s + t.cost, 0)),
          healthScore: healthData?.health_score ?? null,
          topIssues: tix
            .sort((a, b) => b.frustration_score - a.frustration_score)
            .slice(0, 6),
          tix,
        };
      })
      .sort((a, b) => b.totalTickets - a.totalTickets);
  }, [tickets, insights]);

  const selected = selectedRid
    ? properties.find((p) => p.rid === selectedRid)
    : null;

  const chartData = properties.slice(0, 20).map((p) => ({
    name: p.rid,
    value: p.totalTickets,
  }));

  return (
    <div className="p-6 max-w-[1200px]">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-text-primary">
          Property Experience
        </h1>
        <p className="text-[13px] text-text-quaternary mt-0.5">
          Property-level health, recurring issues, and maintenance hotspots
        </p>
      </div>

      {/* Top properties chart */}
      <div className="bg-bg-primary rounded-xl border border-border-secondary p-5 mb-6">
        <div className="text-[12px] font-medium text-gray-700 mb-4">
          Tickets by Property (top 20)
        </div>
        <MiniBar data={chartData} color="#6366f1" layout="horizontal" height={200} />
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Property list */}
        <div className="col-span-3 space-y-2">
          {properties.slice(0, 30).map((p) => (
            <button
              key={p.rid}
              onClick={() =>
                setSelectedRid(selectedRid === p.rid ? null : p.rid)
              }
              className={`w-full text-left bg-bg-primary rounded-xl border p-4 transition-all ${
                selectedRid === p.rid
                  ? "border-indigo-300 ring-1 ring-indigo-100"
                  : "border-border-secondary hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold ${
                      p.healthScore !== null && p.healthScore < 4
                        ? "bg-red-50 text-red-600"
                        : p.healthScore !== null && p.healthScore < 6
                          ? "bg-amber-50 text-amber-600"
                          : "bg-bg-secondary text-gray-600"
                    }`}
                  >
                    {p.healthScore !== null ? p.healthScore : "—"}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-text-primary">
                      {p.rid}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDrawer(p.tix, `${p.rid} — All Tickets`);
                        }}
                      >
                        View {p.totalTickets} tickets
                      </span>
                      {p.openTickets > 0 && (
                        <BadgeWithDot color="error" size="sm" type="pill-color">
                          {p.openTickets} open
                        </BadgeWithDot>
                      )}
                      {p.totalCost > 0 && (
                        <span className="text-[10px] text-text-quaternary">
                          ₹{(p.totalCost / 1000).toFixed(0)}K
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {p.repeatCats.length > 0 && (
                    <div className="flex gap-1">
                      {p.repeatCats.slice(0, 2).map((cat) => (
                        <BadgeWithDot
                          key={cat}
                          color="error"
                          size="sm"
                          type="pill-color"
                        >
                          {cat} ↻
                        </BadgeWithDot>
                      ))}
                    </div>
                  )}
                  <div
                    className={`text-[12px] font-semibold ${
                      p.avgFrustration >= 3
                        ? "text-red-500"
                        : p.avgFrustration >= 2
                          ? "text-amber-500"
                          : "text-text-quaternary"
                    }`}
                  >
                    {p.avgFrustration}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="col-span-2">
          {selected ? (
            <div className="bg-bg-primary rounded-xl border border-border-secondary p-5 sticky top-6">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[14px] font-medium text-text-primary">
                  {selected.rid}
                </div>
                {selected.healthScore !== null && (
                  <div
                    className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${
                      selected.healthScore < 4
                        ? "bg-red-50 text-red-600"
                        : selected.healthScore < 6
                          ? "bg-amber-50 text-amber-600"
                          : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    Health: {selected.healthScore}/10
                  </div>
                )}
              </div>
              <div className="text-[11px] text-text-quaternary mb-4">
                {selected.totalTickets} total · {selected.openTickets} open ·{" "}
                {selected.preventable} preventable · ~{selected.avgResolutionDays}d avg
                {selected.totalCost > 0 &&
                  ` · ₹${(selected.totalCost / 1000).toFixed(0)}K`}
              </div>

              {/* Category breakdown */}
              <div className="text-[11px] text-text-tertiary font-medium mb-2">
                Issue Breakdown
              </div>
              <div className="space-y-1.5 mb-4">
                {selected.categories.slice(0, 8).map((cat) => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <div className="flex-1 text-[11px] text-gray-600">
                      {cat.name}
                    </div>
                    <div className="w-20 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-indigo-500 rounded-full h-1.5"
                        style={{
                          width: `${(cat.value / selected.categories[0].value) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-text-quaternary w-6 text-right tabular-nums">
                      {cat.value}
                    </div>
                  </div>
                ))}
              </div>

              {selected.repeatCats.length > 0 && (
                <div className="mb-4 p-3 bg-red-50/50 rounded-xl">
                  <div className="text-[11px] text-red-600 font-medium mb-1">
                    Recurring Issues (3+ tickets)
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selected.repeatCats.map((cat) => (
                      <BadgeWithDot
                        key={cat}
                        color="error"
                        size="sm"
                        type="pill-color"
                      >
                        {cat}
                      </BadgeWithDot>
                    ))}
                  </div>
                  <div className="text-[10px] text-red-400 mt-1.5">
                    These need root-cause investigation, not individual fixes
                  </div>
                </div>
              )}

              <div className="text-[11px] text-text-tertiary font-medium mb-2">
                Recent Tickets
              </div>
              <div className="space-y-2">
                {selected.topIssues.map((t) => (
                  <div
                    key={t.id}
                    className="border-b border-gray-100 pb-2 last:border-0 cursor-pointer hover:bg-bg-secondary rounded-lg px-1 transition-colors"
                    onClick={() => openDrawer([t], t.description)}
                  >
                    <div className="text-[11px] text-gray-700 line-clamp-2">
                      {t.description}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-text-quaternary">
                        {t.category}
                      </span>
                      <span className="text-[9px] text-gray-300">·</span>
                      <span className="text-[9px] text-text-quaternary">
                        {t.priority}
                      </span>
                      <span className="text-[9px] text-gray-300">·</span>
                      <span className="text-[9px] text-text-quaternary">
                        {t.create_date}
                      </span>
                      {t.is_preventable && (
                        <Badge color="warning" size="sm" type="pill-color">
                          Preventable
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                className="w-full mt-4 py-2 text-[12px] text-indigo-600 hover:text-indigo-700 font-medium border border-border-secondary rounded-xl hover:bg-bg-secondary transition-colors"
                onClick={() => openDrawer(selected.tix, `${selected.rid} — All Tickets`)}
              >
                View all tickets
              </button>
            </div>
          ) : (
            <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
              <div className="text-[13px] text-text-quaternary py-16 text-center">
                Select a property to see breakdown, recurring issues, and
                health score
              </div>
            </div>
          )}
        </div>
      </div>

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
