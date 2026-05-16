export function MetricCard({
  label,
  value,
  sub,
  accent,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "red" | "amber" | "green" | "blue" | "purple";
  onClick?: () => void;
}) {
  const colors = {
    red: "text-text-error-primary",
    amber: "text-text-warning-primary",
    green: "text-text-success-primary",
    blue: "text-text-brand-secondary",
    purple: "text-[#7c3aed]",
  };

  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={`bg-bg-primary rounded-xl border border-border-secondary px-5 py-4 text-left ${
        onClick ? "hover:border-border-brand cursor-pointer transition duration-100 ease-linear" : ""
      }`}
    >
      <div className="text-xs text-text-tertiary font-medium">
        {label}
      </div>
      <div
        className={`text-2xl font-semibold mt-1 tracking-tight ${accent ? colors[accent] : "text-text-primary"}`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-text-quaternary mt-0.5">{sub}</div>
      )}
    </Component>
  );
}
