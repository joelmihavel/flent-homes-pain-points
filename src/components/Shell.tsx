"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  TrendUp01,
  Grid01,
  Route,
  Target04,
} from "@untitledui/icons";

const NAV = [
  { href: "/", label: "Pain Points", icon: AlertTriangle },
  { href: "/trends", label: "Trends", icon: TrendUp01 },
  { href: "/heatmap", label: "Property × Theme", icon: Grid01 },
  { href: "/resolution", label: "Resolution Journey", icon: Route },
  { href: "/root-causes", label: "Root Causes", icon: Target04 },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full">
      <nav className="w-60 shrink-0 border-r border-border-secondary bg-bg-primary flex flex-col">
        <div className="px-5 pt-6 pb-5">
          <div className="text-sm font-semibold text-text-primary tracking-tight">
            Flent Homes
          </div>
          <div className="text-xs text-text-tertiary mt-0.5">
            Pain Points Deep Dive
          </div>
        </div>

        <div className="flex-1 px-3 flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition duration-100 ease-linear ${
                  active
                    ? "bg-bg-active text-text-primary font-medium"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-primary_hover"
                }`}
              >
                <Icon className="size-5 shrink-0 text-fg-quaternary" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-border-secondary">
          <div className="text-[10px] text-text-quaternary uppercase tracking-wider font-medium">
            3,010 tickets analyzed
          </div>
        </div>
      </nav>
      <main className="flex-1 overflow-y-auto bg-bg-secondary">{children}</main>
    </div>
  );
}
