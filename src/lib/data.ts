import ticketsRaw from "@/data/tickets.json";
import insightsRaw from "@/data/insights.json";
import type { Ticket, Insights } from "./types";

export const tickets = ticketsRaw as Ticket[];
export const insights = insightsRaw as Insights;

export function countBy<T>(
  items: T[],
  key: (item: T) => string | null | undefined
) {
  const map: Record<string, number> = {};
  for (const item of items) {
    const k = key(item) || "Unknown";
    map[k] = (map[k] || 0) + 1;
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function avgBy(items: number[]) {
  if (items.length === 0) return 0;
  return Math.round(items.reduce((a, b) => a + b, 0) / items.length);
}
