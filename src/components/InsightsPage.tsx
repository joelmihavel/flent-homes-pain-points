"use client";

import { useMemo, useState } from "react";
import type { Ticket, Insights } from "@/lib/types";
import { InsightBanner } from "./InsightBanner";
import { MiniBar } from "./MiniBar";
import { Badge } from "@/components/uui-base/badges/badges";
import { TicketDrawer } from "./TicketDrawer";

type DeepInsight = {
  icon: string;
  title: string;
  body: string;
  severity: "high" | "medium" | "low";
  tags: string[];
  dataPoints: string[];
  tickets: Ticket[];
};

export function InsightsPage({
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

  const deepInsights = useMemo(() => {
    const out: DeepInsight[] = [];

    const fwTickets = tickets.filter((t) => t.is_first_week_ticket);
    const fwThemes: Record<string, number> = {};
    for (const t of fwTickets) fwThemes[t.ux_theme] = (fwThemes[t.ux_theme] || 0) + 1;
    const topFW = Object.entries(fwThemes).sort(([, a], [, b]) => b - a).slice(0, 3);
    if (fwTickets.length > 50) {
      out.push({
        icon: "🚪",
        title: `${s.first_week_pct}% of tickets happen in week 1 — onboarding is broken`,
        body: `${fwTickets.length} tickets are raised within 7 days of a tenant's first interaction. This means nearly one in three tickets is about confusion, setup, or unmet expectations during move-in. The top themes for first-week tickets are: ${topFW.map(([t, c]) => `${t} (${c})`).join(", ")}. Each of these represents a gap in the onboarding experience that could be closed with proactive information and guided flows.`,
        severity: "high",
        tags: ["Onboarding", "First Impressions", "Setup"],
        tickets: fwTickets,
        dataPoints: [
          `${fwTickets.length} first-week tickets out of ${s.total_tickets}`,
          `${fwTickets.filter((t) => t.is_preventable).length} of these are preventable`,
          `Top theme: ${topFW[0]?.[0]} with ${topFW[0]?.[1]} tickets`,
        ],
      });
    }

    const zeroEffort = tickets.filter((t) =>
      ["Information shared", "Self-resolved", "No issue found", "Duplicate ticket"].includes(t.resolution_type)
    );
    if (zeroEffort.length > 30) {
      const zeByType: Record<string, number> = {};
      for (const t of zeroEffort) zeByType[t.resolution_type] = (zeByType[t.resolution_type] || 0) + 1;
      out.push({
        icon: "⚡",
        title: `${zeroEffort.length} tickets (${s.zero_effort_pct}%) required zero physical work`,
        body: `These tickets were resolved by sharing information (${zeByType["Information shared"] || 0}), tenant self-fixing (${zeByType["Self-resolved"] || 0}), finding no real issue (${zeByType["No issue found"] || 0}), or being duplicates (${zeByType["Duplicate ticket"] || 0}). Every single one represents a failure in the product to surface information or tools the user needed. The CX team is acting as a human middleware layer between users and information.`,
        severity: "high",
        tags: ["Efficiency", "Self-serve", "Info Gap"],
        tickets: zeroEffort,
        dataPoints: [
          `${zeByType["Information shared"] || 0} resolved by sharing info the user couldn't find`,
          `${zeByType["Self-resolved"] || 0} fixed by the tenant themselves after guidance`,
          `Total team hours saved if eliminated: ~${Math.round(zeroEffort.length * 0.5)}h`,
        ],
      });
    }

    const repeatHeavy = tickets.filter(
      (t) => t.is_repeat_property_issue && t.repeat_count_property >= 4
    );
    if (repeatHeavy.length > 50) {
      const propCounts: Record<string, number> = {};
      for (const t of repeatHeavy) propCounts[t.rid || ""] = (propCounts[t.rid || ""] || 0) + 1;
      const worst3 = Object.entries(propCounts).sort(([, a], [, b]) => b - a).slice(0, 3);
      const totalCost = repeatHeavy.reduce((s, t) => s + t.cost, 0);
      out.push({
        icon: "🏗",
        title: `${s.repeat_property_pct}% of tickets are repeat property issues`,
        body: `${repeatHeavy.length} tickets come from properties with 4+ repeat issues in the same category. This is infrastructure debt manifesting as support volume. The worst properties are: ${worst3.map(([r, c]) => `${r} (${c} repeat tickets)`).join(", ")}. These properties need root-cause audits — plumbing inspections, electrical checks, fixture replacements — rather than ticket-by-ticket band-aids.`,
        severity: "high",
        tags: ["Infrastructure", "Recurring", "Root Cause"],
        tickets: repeatHeavy,
        dataPoints: [
          `₹${(totalCost / 1000).toFixed(0)}K spent on repeat property issues`,
          `${new Set(repeatHeavy.map((t) => t.rid)).size} properties with chronic issues`,
          `Most common repeat categories: Plumbing, Electrical, Carpentry`,
        ],
      });
    }

    const paymentTickets = tickets.filter((t) => t.ux_theme === "Payments & Billing");
    if (paymentTickets.length > 30) {
      const payPreventable = paymentTickets.filter((t) => t.is_preventable);
      const payInfoShared = paymentTickets.filter((t) => t.resolution_type === "Information shared");
      out.push({
        icon: "💳",
        title: `${paymentTickets.length} payment tickets — ${payPreventable.length} are preventable`,
        body: `Users raise tickets about rent confusion, bill breakdowns, reimbursement status, and deposit questions. ${payInfoShared.length} were resolved by simply sharing information. This is the clearest product gap: users have no self-serve way to check payment status, view bill breakdowns, or track reimbursements. A payment dashboard would eliminate this entire ticket category.`,
        severity: "high",
        tags: ["Payments", "Dashboard", "Transparency"],
        tickets: paymentTickets,
        dataPoints: [
          `${payInfoShared.length} resolved by sharing info`,
          `${payPreventable.length} preventable out of ${paymentTickets.length}`,
          `Common queries: rent status, bill breakdown, reimbursement tracking`,
        ],
      });
    }

    const wifiTickets = tickets.filter((t) => t.ux_theme === "Connectivity");
    if (wifiTickets.length > 30) {
      const wifiSelfServe = wifiTickets.filter((t) => t.is_self_serve_possible);
      const wifiFW = wifiTickets.filter((t) => t.is_first_week_ticket);
      out.push({
        icon: "📡",
        title: `WiFi/internet issues: ${wifiTickets.length} tickets, ${wifiSelfServe.length} self-servable`,
        body: `Connectivity is a top emotional pain point — internet is a baseline expectation, not a luxury. ${wifiFW.length} WiFi tickets come in the first week (setup confusion). Many resolve with router restarts or ISP coordination that tenants could do themselves. Adding a "WiFi not working?" guided flow before ticket creation, plus proactive WiFi setup during onboarding, would cut this category significantly.`,
        severity: "medium",
        tags: ["WiFi", "Self-serve", "Onboarding"],
        tickets: wifiTickets,
        dataPoints: [
          `${wifiFW.length} WiFi tickets in first week`,
          `${wifiSelfServe.length} could be self-served`,
          `Common fix: router restart, ISP contact, settings change`,
        ],
      });
    }

    const allRes = tickets.filter((t) => t.resolution_time_hours && t.resolution_time_hours > 0);
    const slowTickets = allRes.filter((t) => t.resolution_time_hours! > 168);
    if (slowTickets.length > 50) {
      const slowFrust = Math.round(
        slowTickets.reduce((s, t) => s + t.frustration_score, 0) / slowTickets.length * 10
      ) / 10;
      const fastFrust = Math.round(
        allRes.filter((t) => t.resolution_time_hours! <= 24)
          .reduce((s, t) => s + t.frustration_score, 0) /
          Math.max(1, allRes.filter((t) => t.resolution_time_hours! <= 24).length) * 10
      ) / 10;
      out.push({
        icon: "⏱",
        title: `Tickets open >7 days have ${slowFrust} avg frustration vs ${fastFrust} for <24h`,
        body: `${slowTickets.length} tickets took over a week to close. These generate significantly higher frustration scores and are more likely to produce follow-up complaints. The relationship is clear: speed of resolution directly maps to user satisfaction. Setting visible SLAs per category and proactively communicating delays would manage expectations even when resolution takes time.`,
        severity: "medium",
        tags: ["SLA", "Resolution Time", "Expectations"],
        tickets: slowTickets,
        dataPoints: [
          `${slowTickets.length} tickets took >7 days`,
          `Avg frustration: ${slowFrust}/10 for slow vs ${fastFrust}/10 for fast`,
          `Median resolution: ${Math.round(s.median_resolution_hours / 24)} days`,
        ],
      });
    }

    const vendorDep = tickets.filter((t) => t.ux_issues.includes("Vendor Dependency"));
    if (vendorDep.length > 10) {
      out.push({
        icon: "🔨",
        title: `${vendorDep.length} tickets bottlenecked by vendor dependency`,
        body: `These tickets involve vendor no-shows, scheduling delays, or waiting on external parties. From the user's perspective, they don't care about your vendor management challenges — they care about their broken tap. Building a vendor SLA tracking system with automated escalation when vendors miss windows would improve both CX and operational efficiency.`,
        severity: "medium",
        tags: ["Vendor", "SLA", "Operations"],
        tickets: vendorDep,
        dataPoints: [
          `${vendorDep.length} tickets with vendor dependency issues`,
          `Common pattern: "vendor didn't come", "waiting on vendor"`,
          `Fix: automated vendor SLA tracking with escalation`,
        ],
      });
    }

    if (s.total_cost > 0) {
      const costByCat = insights.cost_by_category.slice(0, 3);
      const preventableTickets = tickets.filter((t) => t.is_preventable);
      out.push({
        icon: "💰",
        title: `₹${(s.total_cost / 100000).toFixed(1)} lakh total ticket cost — ₹${(s.preventable_cost / 100000).toFixed(1)} lakh preventable`,
        body: `Top cost categories: ${costByCat.map((c) => `${c.category} (₹${(c.cost / 1000).toFixed(0)}K)`).join(", ")}. The preventable ticket cost represents direct ROI for product improvements — if you build self-serve tools and better onboarding, that's how much you save.`,
        severity: "medium",
        tags: ["Cost", "ROI", "Investment"],
        tickets: preventableTickets,
        dataPoints: [
          `₹${(s.preventable_cost / 1000).toFixed(0)}K in preventable ticket costs`,
          `Average cost per ticket: ₹${Math.round(s.total_cost / s.total_tickets)}`,
          `Highest cost: ${costByCat[0]?.category} at ₹${((costByCat[0]?.cost || 0) / 1000).toFixed(0)}K`,
        ],
      });
    }

    const heavyUsers = insights.repeat_customers.filter((c) => c.tickets >= 15);
    if (heavyUsers.length > 0) {
      const heavyUserTickets = tickets.filter((t) =>
        heavyUsers.some((u) => u.name === t.customer_name)
      );
      out.push({
        icon: "🔄",
        title: `${heavyUsers.length} tenants have raised 15+ tickets each`,
        body: `Top: ${heavyUsers.slice(0, 5).map((c) => `${c.name} (${c.tickets})`).join(", ")}. These could be power users in difficult properties, or genuinely frustrated tenants at risk of churn. Either way, they deserve proactive outreach — understanding their root frustrations could reveal systemic issues invisible in aggregate data.`,
        severity: "medium",
        tags: ["Retention", "Proactive", "Churn Risk"],
        tickets: heavyUserTickets,
        dataPoints: [
          `${heavyUsers.length} tenants with 15+ tickets`,
          `Highest: ${heavyUsers[0]?.name} with ${heavyUsers[0]?.tickets} tickets`,
          `These tenants account for ${heavyUsers.reduce((s, c) => s + c.tickets, 0)} total tickets`,
        ],
      });
    }

    return out;
  }, [tickets, insights, s]);

  const rootCauseData = insights.root_cause_distribution
    .filter((d) => d.name !== "Undiagnosed")
    .slice(0, 8);

  return (
    <div className="p-6 max-w-[1200px]">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-text-primary">
          AI UX Insights
        </h1>
        <p className="text-[13px] text-text-quaternary mt-0.5">
          Deep pattern analysis across {s.total_tickets.toLocaleString()} tickets
        </p>
      </div>

      {/* Deep insights */}
      <div className="space-y-4 mb-8">
        {deepInsights.map((insight, i) => (
          <div
            key={i}
            className={`bg-bg-primary rounded-xl border border-border-secondary p-5 ${
              insight.severity === "high"
                ? "border-l-[3px] border-l-[var(--color-border-error)]"
                : "border-l-[3px] border-l-[var(--color-fg-warning-primary)]"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">{insight.icon}</span>
              <div className="flex-1">
                <div className="text-[14px] font-medium text-text-primary mb-2">
                  {insight.title}
                </div>
                <div className="text-[12px] text-text-tertiary leading-relaxed mb-3">
                  {insight.body}
                </div>

                <div className="bg-bg-secondary rounded-xl p-3 mb-3">
                  <div className="text-[10px] text-text-quaternary font-medium uppercase tracking-wider mb-1.5">
                    Supporting Data
                  </div>
                  <div className="space-y-1">
                    {insight.dataPoints.map((dp, j) => (
                      <div key={j} className="flex items-center gap-2 text-[11px] text-text-secondary">
                        <span className="w-1 h-1 rounded-full bg-brand-500 shrink-0" />
                        {dp}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {insight.tags.map((tag) => (
                    <Badge key={tag} color="gray" size="sm" type="modern">
                      {tag}
                    </Badge>
                  ))}
                  <button
                    className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium ml-2"
                    onClick={() => openDrawer(insight.tickets, insight.title)}
                  >
                    View {insight.tickets.length} tickets &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Root cause chart + resolution time */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
          <div className="text-[12px] font-medium text-text-secondary mb-4">
            Root Cause Distribution
          </div>
          <MiniBar data={rootCauseData} color="#6366f1" height={240} />
        </div>
        <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
          <div className="text-[12px] font-medium text-text-secondary mb-4">
            Resolution Time by Category
          </div>
          <MiniBar
            data={insights.resolution_by_category.slice(0, 8).map((d) => ({
              name: d.category,
              value: Math.round(d.avg_hours / 24),
            }))}
            color="#f59e0b"
            height={240}
          />
        </div>
      </div>

      {/* Structured insights from data processing */}
      <div>
        <div className="text-[11px] text-text-quaternary font-medium uppercase tracking-wider mb-3">
          Data-Driven Recommendations
        </div>
        <div className="grid grid-cols-2 gap-3">
          {insights.ai_insights.map((insight, i) => (
            <InsightBanner key={i} insight={insight} />
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
