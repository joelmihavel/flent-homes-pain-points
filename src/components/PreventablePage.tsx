"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import type { Ticket, Insights } from "@/lib/types";
import { MetricCard } from "./MetricCard";
import { MiniBar } from "./MiniBar";
import { Badge, BadgeWithDot } from "@/components/uui-base/badges/badges";
import { TicketDrawer } from "./TicketDrawer";

type Recommendation = {
  title: string;
  description: string;
  impact: number;
  costSaved: number;
  effort: "Low" | "Medium" | "High";
  evidence: string;
};

export function PreventablePage({
  tickets,
  insights,
}: {
  tickets: Ticket[];
  insights: Insights;
}) {
  const s = insights.summary;

  const [drawerTickets, setDrawerTickets] = useState<Ticket[] | null>(null);
  const [drawerTitle, setDrawerTitle] = useState("");

  function openDrawer(tix: Ticket[], title: string) {
    setDrawerTickets(tix);
    setDrawerTitle(title);
  }

  const preventableTickets = useMemo(
    () =>
      tickets
        .filter((t) => t.is_preventable)
        .sort((a, b) => b.preventability_score - a.preventability_score),
    [tickets]
  );

  // Resolution type breakdown for preventable tickets
  const preventableByResType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of preventableTickets) {
      map[t.resolution_type] = (map[t.resolution_type] || 0) + 1;
    }
    return Object.entries(map)
      .filter(([k]) => k !== "Unknown")
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [preventableTickets]);

  // Preventable by theme
  const preventableByTheme = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of preventableTickets) {
      map[t.ux_theme] = (map[t.ux_theme] || 0) + 1;
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [preventableTickets]);

  // UX issue breakdown for preventable
  const preventableByIssue = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of preventableTickets) {
      for (const issue of t.ux_issues) {
        if (issue !== "Physical Resolution Needed")
          map[issue] = (map[issue] || 0) + 1;
      }
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [preventableTickets]);

  // Build recommendations from data
  const recommendations = useMemo((): Recommendation[] => {
    const recs: Recommendation[] = [];

    // Payment dashboard
    const paymentPrev = tickets.filter(
      (t) => t.ux_theme === "Payments & Billing" && t.is_preventable
    );
    if (paymentPrev.length > 5) {
      recs.push({
        title: "Tenant Payment Dashboard",
        description:
          "Real-time rent status, utility bill breakdowns, reimbursement tracking, and payment history. Most payment tickets resolve by sharing info the user couldn't find.",
        impact: paymentPrev.length,
        costSaved: Math.round(paymentPrev.reduce((s, t) => s + t.cost, 0)),
        effort: "Medium",
        evidence: `${paymentPrev.filter((t) => t.resolution_type === "Information shared").length} resolved by simply sharing info`,
      });
    }

    // Onboarding checklist
    const fwTickets = tickets.filter((t) => t.is_first_week_ticket);
    const fwPreventable = fwTickets.filter((t) => t.is_preventable);
    if (fwTickets.length > 30) {
      recs.push({
        title: "Interactive Move-in Checklist",
        description:
          "Guided onboarding flow: WiFi setup, utility registration, appliance guides, key contacts, inventory walkthrough, and known property quirks.",
        impact: fwTickets.length,
        costSaved: Math.round(fwPreventable.reduce((s, t) => s + t.cost, 0)),
        effort: "Medium",
        evidence: `${s.first_week_pct}% of all tickets come in week 1 — this is the #1 leverage point`,
      });
    }

    // Self-serve troubleshooting
    const selfServe = tickets.filter((t) => t.is_self_serve_possible);
    if (selfServe.length > 10) {
      recs.push({
        title: "Self-serve Troubleshooting Portal",
        description:
          "Guided flows for common issues: 'WiFi not working?', 'RO/purifier issues?', 'Appliance not starting?' with step-by-step reset instructions before ticket creation.",
        impact: selfServe.length,
        costSaved: Math.round(selfServe.reduce((s, t) => s + t.cost, 0)),
        effort: "Low",
        evidence: `${selfServe.filter((t) => t.resolution_type === "Self-resolved" || t.resolution_type === "No issue found").length} self-resolved or no real issue`,
      });
    }

    // Ticket transparency
    const commGap = tickets.filter((t) => t.is_communication_gap);
    const visGap = tickets.filter((t) => t.is_visibility_issue);
    const transparencyTotal = new Set([...commGap, ...visGap].map((t) => t.id)).size;
    if (transparencyTotal > 10) {
      recs.push({
        title: "Real-time Ticket Status Tracker",
        description:
          "Live tenant-facing view: ticket status, assigned vendor, scheduled visit time, and resolution ETA. Automated WhatsApp/SMS updates on status changes.",
        impact: transparencyTotal,
        costSaved: 0,
        effort: "High",
        evidence: `${commGap.length} communication gaps + ${visGap.length} visibility issues detected`,
      });
    }

    // Proactive maintenance
    const repeatHeavy = tickets.filter(
      (t) => t.is_repeat_property_issue && t.repeat_count_property >= 5
    );
    if (repeatHeavy.length > 20) {
      const uniqueProps = new Set(repeatHeavy.map((t) => t.rid)).size;
      recs.push({
        title: "Proactive Maintenance Program",
        description:
          "Quarterly inspections for flagged properties. Address root causes (aging plumbing, substandard fixtures) instead of fixing symptoms ticket-by-ticket.",
        impact: repeatHeavy.length,
        costSaved: Math.round(repeatHeavy.reduce((s, t) => s + t.cost, 0)),
        effort: "High",
        evidence: `${repeatHeavy.length} tickets from ${uniqueProps} properties with 5+ repeat issues in same category`,
      });
    }

    // Duplicate prevention
    const dupes = tickets.filter((t) => t.resolution_type === "Duplicate ticket");
    const noIssue = tickets.filter((t) => t.resolution_type === "No issue found");
    if (dupes.length + noIssue.length > 10) {
      recs.push({
        title: "Smart Ticket Deduplication",
        description:
          "Before creating a ticket, show existing open tickets for the same property/category. Add a 'me too' button instead of creating duplicates.",
        impact: dupes.length + noIssue.length,
        costSaved: 0,
        effort: "Low",
        evidence: `${dupes.length} duplicate tickets + ${noIssue.length} no-issue tickets found`,
      });
    }

    return recs.sort((a, b) => b.impact - a.impact);
  }, [tickets, s]);

  // Map recommendation titles to their relevant tickets for drawer
  const recTicketsMap = useMemo(() => {
    const map: Record<string, Ticket[]> = {};
    map["Tenant Payment Dashboard"] = tickets.filter(t => t.ux_theme === "Payments & Billing" && t.is_preventable);
    map["Interactive Move-in Checklist"] = tickets.filter(t => t.is_first_week_ticket);
    map["Self-serve Troubleshooting Portal"] = tickets.filter(t => t.is_self_serve_possible);
    const commGap = tickets.filter(t => t.is_communication_gap);
    const visGap = tickets.filter(t => t.is_visibility_issue);
    map["Real-time Ticket Status Tracker"] = [...new Map([...commGap, ...visGap].map(t => [t.id, t])).values()];
    map["Proactive Maintenance Program"] = tickets.filter(t => t.is_repeat_property_issue && t.repeat_count_property >= 5);
    map["Smart Ticket Deduplication"] = tickets.filter(t => t.resolution_type === "Duplicate ticket" || t.resolution_type === "No issue found");
    return map;
  }, [tickets]);

  const EFFORT_COLORS = { Low: "#10b981", Medium: "#f59e0b", High: "#ef4444" };

  return (
    <div className="p-6 max-w-[1200px]">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-text-primary">
          Preventable Issues
        </h1>
        <p className="text-[13px] text-text-quaternary mt-0.5">
          Tickets eliminable through better UX, automation, or proactive
          operations
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <div className="cursor-pointer" onClick={() => openDrawer(tickets.filter(t => t.is_preventable), "Preventable Tickets")}>
          <MetricCard
            label="Preventable"
            value={s.preventable_count}
            sub={`${s.preventable_pct}% of all tickets`}
            accent="amber"
          />
        </div>
        <div className="cursor-pointer" onClick={() => openDrawer(tickets.filter(t => t.resolution_type === "No issue found" || t.resolution_type === "Duplicate ticket" || t.resolution_type === "Self-resolved"), "Zero-effort Tickets")}>
          <MetricCard
            label="Zero-effort"
            value={s.zero_effort_count}
            sub={`${s.zero_effort_pct}% needed no work`}
            accent="green"
          />
        </div>
        <div className="cursor-pointer" onClick={() => openDrawer(tickets.filter(t => t.is_first_week_ticket), "First-week Tickets")}>
          <MetricCard
            label="First-week"
            value={s.first_week_count}
            sub={`${s.first_week_pct}% onboarding friction`}
            accent="purple"
          />
        </div>
        <div className="cursor-pointer" onClick={() => openDrawer(tickets.filter(t => t.is_self_serve_possible), "Self-serve Tickets")}>
          <MetricCard
            label="Self-serve"
            value={s.self_serve_count}
            sub={`could be user-resolved`}
            accent="blue"
          />
        </div>
        <div className="cursor-pointer" onClick={() => openDrawer(tickets.filter(t => t.is_preventable), "Preventable Tickets — Cost at Stake")}>
          <MetricCard
            label="Cost at Stake"
            value={`₹${(s.preventable_cost / 1000).toFixed(0)}K`}
            sub="spend on preventable tickets"
            accent="red"
          />
        </div>
      </div>

      {/* Charts: how + where */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
          <div className="text-[12px] font-medium text-gray-700 mb-4">
            How Preventable Tickets Got Resolved
          </div>
          <MiniBar data={preventableByResType} color="#10b981" height={200} />
        </div>
        <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
          <div className="text-[12px] font-medium text-gray-700 mb-4">
            Preventable by UX Theme
          </div>
          <MiniBar data={preventableByTheme} color="#f59e0b" height={200} />
        </div>
        <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
          <div className="text-[12px] font-medium text-gray-700 mb-4">
            UX Issues in Preventable Tickets
          </div>
          <MiniBar data={preventableByIssue} color="#8b5cf6" height={200} />
        </div>
      </div>

      {/* Product Recommendations */}
      <div className="mb-6">
        <div className="text-[11px] text-text-quaternary font-medium uppercase tracking-wider mb-3">
          Product Recommendations — ranked by impact
        </div>
        <div className="space-y-3">
          {recommendations.map((rec, i) => (
            <div
              key={i}
              className="bg-bg-primary rounded-xl border border-border-secondary p-5"
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-text-quaternary w-5">
                      {i + 1}.
                    </span>
                    <div className="text-[14px] font-medium text-text-primary">
                      {rec.title}
                    </div>
                    <BadgeWithDot
                      color={rec.effort === "Low" ? "success" : rec.effort === "Medium" ? "warning" : "error"}
                      size="sm"
                      type="pill-color"
                    >
                      {rec.effort} effort
                    </BadgeWithDot>
                  </div>
                  <div className="text-[12px] text-text-tertiary ml-5 leading-relaxed">
                    {rec.description}
                  </div>
                  <div className="text-[10px] text-text-quaternary ml-5 mt-1.5 italic">
                    Evidence: {rec.evidence}
                  </div>
                  <button
                    className="text-[11px] text-indigo-600 hover:text-indigo-700 ml-5 mt-2 font-medium"
                    onClick={() => openDrawer(recTicketsMap[rec.title] || [], rec.title)}
                  >
                    View tickets &rarr;
                  </button>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-semibold text-indigo-600">
                    {rec.impact}
                  </div>
                  <div className="text-[10px] text-text-quaternary">
                    tickets impacted
                  </div>
                  {rec.costSaved > 0 && (
                    <div className="text-[10px] text-emerald-600 mt-0.5">
                      ₹{(rec.costSaved / 1000).toFixed(0)}K saveable
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sample preventable tickets */}
      <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
        <div className="text-[12px] font-medium text-gray-700 mb-1">
          Highest Preventability Score Tickets
        </div>
        <div className="text-[10px] text-text-quaternary mb-4">
          These tickets should never have needed human intervention
        </div>
        <div className="space-y-2">
          {preventableTickets.slice(0, 12).map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-bg-secondary rounded-lg px-1 transition-colors"
              onClick={() => openDrawer([t], t.description)}
            >
              <div className="shrink-0 w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-[11px] font-bold text-amber-700">
                {t.preventability_score}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-gray-700 line-clamp-1">
                  {t.description}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge color="gray" size="sm" type="modern">
                    {t.ux_theme}
                  </Badge>
                  <Badge color="gray" size="sm" type="pill-color">
                    {t.resolution_type}
                  </Badge>
                  {t.ux_issues
                    .filter((i) => i !== "Physical Resolution Needed")
                    .slice(0, 2)
                    .map((issue) => (
                      <span key={issue} className="text-[9px] text-text-quaternary">
                        {issue}
                      </span>
                    ))}
                </div>
                {t.resolution_notes && (
                  <div className="text-[10px] text-text-quaternary mt-0.5 line-clamp-1 italic">
                    → {t.resolution_notes}
                  </div>
                )}
              </div>
            </div>
          ))}
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
