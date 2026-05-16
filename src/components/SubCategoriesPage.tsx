"use client";

import { useMemo, useState } from "react";
import type { Ticket } from "@/lib/types";
import { Badge, BadgeWithDot } from "@/components/uui-base/badges/badges";
import { MiniBar } from "@/components/MiniBar";
import { TicketDrawer } from "./TicketDrawer";

// ─── Stop words for keyword extraction ───────────────────────────────────────

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

// ─── Keyword extraction ──────────────────────────────────────────────────────

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

    // Bigrams
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (!seen.has(bigram)) {
        ngramCounts[bigram] = (ngramCounts[bigram] || 0) + 1;
        seen.add(bigram);
      }
    }

    // Trigrams
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

// ─── Types ───────────────────────────────────────────────────────────────────

type SubCategory = {
  category: string;
  count: number;
  avgFrustration: number;
  preventableCount: number;
  avgResolutionDays: number;
  totalCost: number;
  tickets: Ticket[];
};

type ThemeGroup = {
  theme: string;
  count: number;
  avgFrustration: number;
  preventableCount: number;
  subCategories: SubCategory[];
  keywordClusters: { phrase: string; count: number }[];
  tickets: Ticket[];
};

// ─── Theme color palette ─────────────────────────────────────────────────────

const THEME_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

// ─── Component ───────────────────────────────────────────────────────────────

export function SubCategoriesPage({ tickets }: { tickets: Ticket[] }) {
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);
  const [drawerTickets, setDrawerTickets] = useState<Ticket[] | null>(null);
  const [drawerTitle, setDrawerTitle] = useState("");

  const themeGroups = useMemo(() => {
    const grouped: Record<string, Ticket[]> = {};
    for (const t of tickets) {
      if (!grouped[t.ux_theme]) grouped[t.ux_theme] = [];
      grouped[t.ux_theme].push(t);
    }

    return Object.entries(grouped)
      .map(([theme, tix]): ThemeGroup => {
        // Sub-categories within this theme
        const catGrouped: Record<string, Ticket[]> = {};
        for (const t of tix) {
          if (!catGrouped[t.category]) catGrouped[t.category] = [];
          catGrouped[t.category].push(t);
        }

        const subCategories = Object.entries(catGrouped)
          .map(([category, catTix]): SubCategory => {
            const resHours = catTix
              .filter((t) => t.resolution_time_hours && t.resolution_time_hours > 0)
              .map((t) => t.resolution_time_hours!);

            return {
              category,
              count: catTix.length,
              avgFrustration:
                Math.round(
                  (catTix.reduce((s, t) => s + t.frustration_score, 0) / catTix.length) * 10
                ) / 10,
              preventableCount: catTix.filter((t) => t.is_preventable).length,
              avgResolutionDays:
                resHours.length > 0
                  ? Math.round(
                      resHours.reduce((a, b) => a + b, 0) / resHours.length / 24
                    )
                  : 0,
              totalCost: Math.round(catTix.reduce((s, t) => s + t.cost, 0)),
              tickets: catTix,
            };
          })
          .sort((a, b) => b.count - a.count);

        const keywordClusters = extractKeywordClusters(
          tix.map((t) => t.description)
        );

        return {
          theme,
          count: tix.length,
          avgFrustration:
            Math.round(
              (tix.reduce((s, t) => s + t.frustration_score, 0) / tix.length) * 10
            ) / 10,
          preventableCount: tix.filter((t) => t.is_preventable).length,
          subCategories,
          keywordClusters,
          tickets: tix,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [tickets]);

  const expanded = expandedTheme
    ? themeGroups.find((g) => g.theme === expandedTheme)
    : null;

  function openDrawer(tix: Ticket[], title: string) {
    setDrawerTickets(tix);
    setDrawerTitle(title);
  }

  return (
    <div className="p-6 max-w-[1200px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-text-primary">
          Sub-Category Drill-Down
        </h1>
        <p className="text-sm text-text-tertiary mt-0.5">
          Explore failure modes within each UX theme. Keyword clusters reveal
          what actually goes wrong.
        </p>
      </div>

      <div className="flex gap-5">
        {/* ── Left panel: theme list ── */}
        <div className="w-[340px] shrink-0 space-y-1.5">
          {themeGroups.map((group, idx) => {
            const isExpanded = expandedTheme === group.theme;
            return (
              <div key={group.theme}>
                <button
                  onClick={() =>
                    setExpandedTheme(isExpanded ? null : group.theme)
                  }
                  className={`w-full text-left rounded-xl border p-3.5 transition duration-100 ease-linear ${
                    isExpanded
                      ? "border-border-brand ring-1 ring-brand-500/10 bg-bg-primary"
                      : "border-border-secondary bg-bg-primary hover:border-border-primary"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-text-primary">
                      {group.theme}
                    </span>
                    <span className="text-xs tabular-nums text-text-tertiary">
                      {group.count}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <BadgeWithDot
                      color={
                        group.avgFrustration >= 3
                          ? "error"
                          : group.avgFrustration >= 2
                            ? "warning"
                            : "gray"
                      }
                      size="sm"
                      type="pill-color"
                    >
                      {group.avgFrustration}/10
                    </BadgeWithDot>
                    {group.preventableCount > 0 && (
                      <Badge color="warning" size="sm" type="pill-color">
                        {group.preventableCount} preventable
                      </Badge>
                    )}
                    <Badge color="gray" size="sm" type="modern">
                      {group.subCategories.length} sub-categories
                    </Badge>
                  </div>

                  {/* Inline sub-category preview when expanded */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border-secondary space-y-1">
                      {group.subCategories.slice(0, 6).map((sc) => (
                        <div
                          key={sc.category}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-text-secondary truncate mr-2">
                            {sc.category}
                          </span>
                          <span className="text-text-quaternary tabular-nums shrink-0">
                            {sc.count}
                          </span>
                        </div>
                      ))}
                      {group.subCategories.length > 6 && (
                        <div className="text-[10px] text-text-quaternary">
                          +{group.subCategories.length - 6} more
                        </div>
                      )}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Right panel: detail view ── */}
        <div className="flex-1 min-w-0">
          {expanded ? (
            <div className="space-y-5">
              {/* Theme header */}
              <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-semibold text-text-primary">
                    {expanded.theme}
                  </h2>
                  <button
                    onClick={() =>
                      openDrawer(
                        expanded.tickets,
                        `${expanded.theme} — All Tickets`
                      )
                    }
                    className="text-xs font-medium text-text-brand-secondary hover:text-text-brand-primary transition"
                  >
                    View all {expanded.count} tickets →
                  </button>
                </div>
                <div className="text-xs text-text-tertiary">
                  {expanded.subCategories.length} sub-categories ·{" "}
                  {expanded.preventableCount} preventable · Avg frustration{" "}
                  {expanded.avgFrustration}/10
                </div>
              </div>

              {/* Sub-category distribution chart */}
              <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
                <h3 className="text-sm font-medium text-text-primary mb-4">
                  Sub-Category Distribution
                </h3>
                <MiniBar
                  data={expanded.subCategories.map((sc) => ({
                    name: sc.category,
                    value: sc.count,
                  }))}
                  color={
                    THEME_COLORS[
                      themeGroups.findIndex(
                        (g) => g.theme === expanded.theme
                      ) % THEME_COLORS.length
                    ]
                  }
                  height={Math.max(180, expanded.subCategories.length * 32)}
                />
              </div>

              {/* Keyword clusters — the most valuable section */}
              {expanded.keywordClusters.length > 0 && (
                <div className="bg-bg-primary rounded-xl border border-border-secondary p-5">
                  <h3 className="text-sm font-medium text-text-primary mb-1">
                    Failure Mode Keywords
                  </h3>
                  <p className="text-xs text-text-quaternary mb-4">
                    Common phrases extracted from ticket descriptions — reveals
                    what actually breaks.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {expanded.keywordClusters.map((kw) => {
                      const maxCount = expanded.keywordClusters[0].count;
                      const intensity = Math.max(
                        0.4,
                        kw.count / maxCount
                      );
                      return (
                        <button
                          key={kw.phrase}
                          onClick={() =>
                            openDrawer(
                              expanded.tickets.filter((t) =>
                                t.description
                                  .toLowerCase()
                                  .includes(kw.phrase)
                              ),
                              `"${kw.phrase}" — ${expanded.theme}`
                            )
                          }
                          className="group relative px-3 py-1.5 rounded-lg border border-border-secondary hover:border-border-brand transition duration-100 ease-linear bg-bg-primary hover:bg-bg-secondary"
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
                {expanded.subCategories.map((sc) => (
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
                          openDrawer(
                            sc.tickets,
                            `${expanded.theme} → ${sc.category}`
                          )
                        }
                        className="text-xs font-medium text-text-brand-secondary hover:text-text-brand-primary transition"
                      >
                        {sc.count} ticket{sc.count !== 1 ? "s" : ""} →
                      </button>
                    </div>

                    {/* Stats row */}
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
                            Avg resolve
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

                    {/* Inline volume bar */}
                    <div className="w-full bg-bg-quaternary rounded-full h-1">
                      <div
                        className="bg-fg-brand-primary rounded-full h-1 transition-all"
                        style={{
                          width: `${(sc.count / expanded.subCategories[0].count) * 100}%`,
                        }}
                      />
                    </div>

                    {/* Sample descriptions — show top 2 most frustrated tickets */}
                    <div className="mt-3 space-y-1.5">
                      {sc.tickets
                        .sort(
                          (a, b) =>
                            b.frustration_score - a.frustration_score
                        )
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
              <div className="text-sm text-text-quaternary py-20 text-center">
                Select a theme from the left to explore its sub-categories and
                failure modes
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
