"use client";

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

const DEFAULT_COLOR = "#6366f1";

export function MiniBar({
  data,
  color = DEFAULT_COLOR,
  colors,
  layout = "vertical",
  height = 260,
}: {
  data: { name: string; value: number }[];
  color?: string;
  colors?: string[];
  layout?: "vertical" | "horizontal";
  height?: number;
}) {
  if (layout === "vertical") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f1f1" />
          <XAxis type="number" fontSize={11} tick={{ fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={100} fontSize={11} tick={{ fill: "#6b7280" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {data.map((_, i) => (
              <Cell key={i} fill={colors ? colors[i % colors.length] : color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 0, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
        <XAxis dataKey="name" fontSize={11} tick={{ fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis fontSize={11} tick={{ fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={32}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors ? colors[i % colors.length] : color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
