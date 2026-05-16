"use client";

import { useMemo, useState } from "react";
import type { Ticket } from "@/lib/types";
import { Badge, BadgeWithDot } from "@/components/uui-base/badges/badges";
import { MiniBar } from "./MiniBar";
import { TicketDrawer } from "./TicketDrawer";

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "dare", "ought",
  "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
  "as", "into", "through", "during", "before", "after", "above", "below",
  "between", "out", "off", "over", "under", "again", "further", "then",
  "once", "here", "there", "when", "where", "why", "how", "all", "both",
  "each", "few", "more", "most", "other", "some", "such", "no", "nor",
  "not", "only", "own", "same", "so", "than", "too", "very", "just",
  "don", "now", "and", "but", "or", "if", "while", "because", "until",
  "although", "since", "about", "up", "down", "he", "she", "it", "we",
  "they", "you", "i", "me", "him", "her", "us", "them", "my", "your",
  "his", "its", "our", "their", "this", "that", "these", "those", "am",
  "what", "which", "who", "whom", "whose", "where", "when", "how",
  "also", "still", "please", "dear", "sir", "madam", "team", "hi",
  "hello", "thanks", "thank", "regards", "flat", "apartment", "house",
  "property", "issue", "problem", "complaint", "request", "regarding",
  "kindly", "noted", "yet", "also", "since", "already", "even", "get",
  "got", "getting", "like", "know", "take", "come", "going", "goes",
  "went", "told", "said", "called", "given", "done", "made", "let",
  "well", "back", "much", "many", "every", "any", "one", "two", "three",
  "new", "old", "big", "long", "last", "first", "next", "time", "times",
  "day", "days", "today", "yesterday", "tomorrow", "month", "months",
  "week", "weeks", "year", "been", "being", "does", "doing",
]);

function extractKeywordClusters(
  descriptions: string[],
  topN = 10
): { phrase: string; count: number }[] {
  const ngramCounts: Record<string, number> = {};

  for (const desc of descriptions) {
    const words = desc
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    const seen = new Set<string>();

    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (!seen.has(bigram)) {
        ngramCounts[bigram] = (ngramCounts[bigram] || 0) + 1;
        seen.add(bigram);
      }
    }

    for (let i = 0; i < words.length - 2; i++) {
      const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      if (!seen.has(trigram)) {
        ngramCounts[trigram] = (ngramCounts[trigram] || 0) + 1;
        seen.add(trigram);
      }
    }
  }

  return Object.entries(ngramCounts)
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([phrase, count]) => ({ phrase, count }));
}

type SubCategory = {
  category: string;
  count: number;
  avgFrustration: number;
  preventableCount: number;
  avgResolutionDays: number;
  totalCost: number;
  topResolutionTypes: { name: string; count: number }[];
  tickets: Ticket[];
};

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
  subCategories: SubCategory[];
  keywordClusters: { phrase: string; count: number }[];
  tickets: Ticket[];
};

const THEME_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

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

        const resHours = tix
          .filter((t) => t.resolution_time_hours && t.resolution_time_hours > 0)
          .map((t) => t.resolution_time_hours!);

        // Build sub-categories
        const catGrouped: Record<string, Ticket[]> = {};
        for (const t of tix) {
          if (!catGrouped[t.category]) catGrouped[t.category] = [];
          catGrouped[t.category].push(t);
        }

        const subCategories = Object.entries(catGrouped)
          .map(([category, catTix]): SubCategory => {
            const catResHours = catTix
              .filter((t) => t.resolution_time_hours && t.resolution_time_hours > 0)
              .map((t) => t.resolution_time_hours!);

            const rtCount: Record<string, number> = {};
            for (const t of catTix)
              if (t.resolution_type !== "Unknown")
                rtCount[t.resolution_type] = (rtCount[t.resolution_type] || 0) + 1;

            return {
              category,
              count: catTix.length,
              avgFrustration:
                Math.round(
                  (catTix.reduce((s, t) => s + t.frustration_score, 0) / catTix.length) * 10
                ) / 10,
              preventableCount: catTix.filter((t) => t.is_preventable).length,
              avgResolutionDays:
                catResHours.length > 0
                  ? Math.round(catResHours.reduce((a, b) => a + b, 0) / catResHours.length / 24)
                  : 0,
              totalCost: Math.round(catTix.reduce((s, t) => s + t.cost, 0)),
              topResolutionTypes: Object.entries(rtCount)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([name, count]) => ({ name, count })),
              tickets: catTix,
            };
          })
          .sort((a, b) => b.count - a.count);

        const keywordClusters = extractKeywordClusters(tix.map((t) => t.description));

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
          subCategories,
          keywordClusters,
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
          Click a theme to explore sub-categories, failure modes, and drill into tickets.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Theme list */}
        <div className="col-span-2 space-y-2">
          {painPoints.map((pp) => (
            <div
              key={pp.theme}
              className={`bg-bg-primary rounded-xl border transition duration-100 ease-linear ${
                selectedTheme === pp.theme
                  ? "border-border-brand ring-1 ring-brand-500/10"
                  : "border-border-secondary hover:border-border-primary"
              }`}
            >
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
                  <Badge color="gray" size="sm" type="modern">
                    {pp.subCategories.length} sub-categories
                  </Badge>
                </div>
              </button>

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
        <div className="col-span-3">
          {selected ? (
            <div className="space-y-4 sticky top-6">
              {/* Theme header */}
              <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-base font-semibold text-text-primary">
                    {selected.theme}
                  </div>
                  <button
                    onClick={() =>
                      openDrawer(selected.tickets, `${selected.theme} — All Tickets`)
                    }
                    className="text-xs font-medium text-text-brand-secondary hover:text-text-brand-primary transition"
                  >
                    View all {selected.count} tickets →
                  </button>
                </div>
                <div className="text-xs text-text-tertiary mb-3">
                  {selected.count} tickets · {selected.preventableCount} preventable ·{" "}
                  {selected.avgResolutionDays}d avg · {selected.firstWeekPct}% first-week ·{" "}
                  {selected.repeatPct}% repeat
                </div>

                {/* Root causes */}
                {selected.topRootCauses.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.topRootCauses.map((rc) => (
                      <Badge key={rc.name} color="gray" size="sm" type="modern">
                        {rc.name} ({rc.count})
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Sub-category chart */}
              <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
                <h3 className="text-sm font-medium text-text-primary mb-4">
                  Sub-Category Breakdown
                </h3>
                <MiniBar
                  data={selected.subCategories.map((sc) => ({
                    name: sc.category,
                    value: sc.count,
                  }))}
                  color={
                    THEME_COLORS[
                      painPoints.findIndex((g) => g.theme === selected.theme) %
                        THEME_COLORS.length
                    ]
                  }
                  height={Math.max(160, selected.subCategories.length * 30)}
                />
              </div>

              {/* Keyword clusters */}
              {selected.keywordClusters.length > 0 && (
                <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
                  <h3 className="text-sm font-medium text-text-primary mb-1">
                    Failure Mode Keywords
                  </h3>
                  <p className="text-xs text-text-quaternary mb-4">
                    Common phrases from ticket descriptions — click to see matching tickets
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selected.keywordClusters.map((kw) => {
                      const maxCount = selected.keywordClusters[0].count;
                      const intensity = Math.max(0.4, kw.count / maxCount);
                      return (
                        <button
                          key={kw.phrase}
                          onClick={() =>
                            openDrawer(
                              selected.tickets.filter((t) =>
                                t.description.toLowerCase().includes(kw.phrase)
                              ),
                              `"${kw.phrase}" — ${selected.theme}`
                            )
                          }
                          className="px-3 py-1.5 rounded-lg border border-border-secondary hover:border-border-brand transition duration-100 ease-linear bg-bg-primary hover:bg-bg-secondary"
                          style={{ opacity: 0.5 + intensity * 0.5 }}
                        >
                          <span className="text-sm text-text-primary font-medium">
                            {kw.phrase}
                          </span>
                          <span className="ml-1.5 text-xs text-text-quaternary tabular-nums">
                            {kw.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-category detail cards */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-text-primary px-1">
                  Sub-Categories
                </h3>
                {selected.subCategories.map((sc) => (
                  <div
                    key={sc.category}
                    className="bg-bg-primary rounded-xl border border-border-secondary p-4 hover:border-border-primary transition duration-100 ease-linear"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-text-primary">
                        {sc.category}
                      </div>
                      <button
                        onClick={() =>
                          openDrawer(sc.tickets, `${selected.theme} → ${sc.category}`)
                        }
                        className="text-xs font-medium text-text-brand-secondary hover:text-text-brand-primary transition"
                      >
                        {sc.count} ticket{sc.count !== 1 ? "s" : ""} →
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-text-quaternary font-medium">
                          Frustration
                        </span>
                        <span
                          className={`text-xs font-medium tabular-nums ${
                            sc.avgFrustration >= 5
                              ? "text-text-error-primary"
                              : sc.avgFrustration >= 3
                                ? "text-text-warning-primary"
                                : "text-text-primary"
                          }`}
                        >
                          {sc.avgFrustration}/10
                        </span>
                      </div>
                      {sc.preventableCount > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider text-text-quaternary font-medium">
                            Preventable
                          </span>
                          <Badge color="warning" size="sm" type="pill-color">
                            {sc.preventableCount}
                          </Badge>
                        </div>
                      )}
                      {sc.avgResolutionDays > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider text-text-quaternary font-medium">
                            Resolve
                          </span>
                          <span className="text-xs text-text-secondary tabular-nums">
                            {sc.avgResolutionDays}d
                          </span>
                        </div>
                      )}
                      {sc.totalCost > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider text-text-quaternary font-medium">
                            Cost
                          </span>
                          <span className="text-xs text-text-secondary tabular-nums">
                            ₹{sc.totalCost.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* How resolved */}
                    {sc.topResolutionTypes.length > 0 && (
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <span className="text-[10px] uppercase tracking-wider text-text-quaternary font-medium shrink-0">
                          Resolved via
                        </span>
                        {sc.topResolutionTypes.map((rt) => (
                          <Badge key={rt.name} color="gray" size="sm" type="modern">
                            {rt.name} ({rt.count})
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Volume bar */}
                    <div className="w-full bg-bg-quaternary rounded-full h-1 mb-2.5">
                      <div
                        className="bg-fg-brand-primary rounded-full h-1 transition-all"
                        style={{
                          width: `${(sc.count / selected.subCategories[0].count) * 100}%`,
                        }}
                      />
                    </div>

                    {/* Sample tickets */}
                    <div className="space-y-1">
                      {sc.tickets
                        .sort((a, b) => b.frustration_score - a.frustration_score)
                        .slice(0, 2)
                        .map((t) => (
                          <div
                            key={t.id}
                            className="text-xs text-text-tertiary line-clamp-1"
                          >
                            <span className="text-text-quaternary mr-1">
                              [{t.frustration_score}/10]
                            </span>
                            {t.description}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
              <div className="text-sm text-text-quaternary py-16 text-center">
                Click a pain point to explore sub-categories, failure mode keywords,
                and resolution patterns
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
