import type { InsightCard } from "@/lib/types";
import { Badge } from "@/components/uui-base/badges/badges";

const TYPE_ICONS: Record<string, string> = {
  preventable: "⚡",
  zero_effort: "⚡",
  onboarding: "🚪",
  communication: "💬",
  infrastructure: "🏗",
  self_serve: "🔧",
  frustration: "😤",
  payment: "💳",
  connectivity: "📡",
  cost: "💰",
  resolution_time: "⏱",
  repeat_customers: "🔄",
};

export function InsightBanner({ insight }: { insight: InsightCard }) {
  const borderColor =
    insight.severity === "high"
      ? "border-l-[var(--color-border-error)]"
      : "border-l-[var(--color-fg-warning-primary)]";

  return (
    <div
      className={`rounded-xl border border-border-secondary border-l-[3px] ${borderColor} p-4 bg-bg-primary`}
    >
      <div className="flex items-start gap-3">
        <span className="text-base mt-0.5">
          {TYPE_ICONS[insight.type] || "💡"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text-primary">
            {insight.title}
          </div>
          <div className="text-xs text-text-tertiary mt-1 leading-relaxed">
            {insight.description}
          </div>
          <div className="mt-2.5 flex items-start gap-1.5">
            <Badge color="success" size="sm" type="pill-color">
              Recommendation
            </Badge>
            <span className="text-xs text-text-secondary leading-relaxed">
              {insight.recommendation}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
