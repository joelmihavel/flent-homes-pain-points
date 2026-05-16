"use client";

import { useState, useMemo } from "react";
import type { Ticket } from "@/lib/types";
import { XClose, SearchLg, ChevronDown } from "@untitledui/icons";
import { Badge, BadgeWithDot } from "@/components/uui-base/badges/badges";

const PRIORITY_COLOR: Record<string, "error" | "warning" | "gray" | "success"> = {
  URGENT: "error",
  HIGH: "warning",
  MEDIUM: "gray",
  LOW: "success",
};

function TicketRow({
  ticket,
  onSelect,
}: {
  ticket: Ticket;
  onSelect: (t: Ticket) => void;
}) {
  return (
    <button
      onClick={() => onSelect(ticket)}
      className="w-full text-left px-4 py-3 border-b border-border-secondary hover:bg-bg-primary_hover transition duration-100 ease-linear"
    >
      <div className="flex items-center gap-2 mb-1">
        <BadgeWithDot
          color={PRIORITY_COLOR[ticket.priority] || "gray"}
          size="sm"
          type="pill-color"
        >
          {ticket.priority}
        </BadgeWithDot>
        {ticket.is_preventable && (
          <Badge color="warning" size="sm" type="pill-color">
            Preventable
          </Badge>
        )}
        {ticket.is_first_week_ticket && (
          <Badge color="purple" size="sm" type="pill-color">
            Week 1
          </Badge>
        )}
        {ticket.resolution_type !== "Unknown" && (
          <Badge color="gray" size="sm" type="modern">
            {ticket.resolution_type}
          </Badge>
        )}
      </div>
      <div className="text-sm text-text-primary line-clamp-2 leading-relaxed">
        {ticket.description}
      </div>
      <div className="flex items-center gap-2 mt-1.5 text-xs text-text-tertiary">
        {ticket.rid && <span>{ticket.rid}</span>}
        <span>·</span>
        <span>{ticket.category}</span>
        <span>·</span>
        <span>{ticket.create_date}</span>
        {ticket.customer_name && (
          <>
            <span>·</span>
            <span>{ticket.customer_name}</span>
          </>
        )}
      </div>
    </button>
  );
}

function TicketDetail({ ticket, onBack }: { ticket: Ticket; onBack: () => void }) {
  return (
    <div className="p-5">
      <button
        onClick={onBack}
        className="text-xs text-text-tertiary hover:text-text-primary mb-4 flex items-center gap-1 transition"
      >
        ← Back to list
      </button>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <BadgeWithDot
          color={PRIORITY_COLOR[ticket.priority] || "gray"}
          size="md"
          type="pill-color"
        >
          {ticket.priority}
        </BadgeWithDot>
        <Badge color="gray" size="md" type="modern">
          {ticket.status}
        </Badge>
        {ticket.is_preventable && (
          <Badge color="warning" size="md" type="pill-color">
            Preventable ({ticket.preventability_score}/10)
          </Badge>
        )}
        {ticket.is_first_week_ticket && (
          <Badge color="purple" size="md" type="pill-color">
            First Week
          </Badge>
        )}
      </div>

      <h3 className="text-base font-medium text-text-primary mb-2">
        {ticket.name}
      </h3>

      <div className="text-sm text-text-secondary leading-relaxed mb-4">
        {ticket.description}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-bg-secondary rounded-lg p-3">
          <div className="text-[10px] text-text-quaternary uppercase tracking-wider font-medium">
            Category
          </div>
          <div className="text-sm text-text-primary mt-0.5">{ticket.category}</div>
        </div>
        <div className="bg-bg-secondary rounded-lg p-3">
          <div className="text-[10px] text-text-quaternary uppercase tracking-wider font-medium">
            UX Theme
          </div>
          <div className="text-sm text-text-primary mt-0.5">{ticket.ux_theme}</div>
        </div>
        <div className="bg-bg-secondary rounded-lg p-3">
          <div className="text-[10px] text-text-quaternary uppercase tracking-wider font-medium">
            Property
          </div>
          <div className="text-sm text-text-primary mt-0.5">{ticket.rid || "—"}</div>
        </div>
        <div className="bg-bg-secondary rounded-lg p-3">
          <div className="text-[10px] text-text-quaternary uppercase tracking-wider font-medium">
            Resolution Time
          </div>
          <div className="text-sm text-text-primary mt-0.5">
            {ticket.resolution_time_hours
              ? `${Math.round(ticket.resolution_time_hours / 24)} days`
              : "—"}
          </div>
        </div>
        <div className="bg-bg-secondary rounded-lg p-3">
          <div className="text-[10px] text-text-quaternary uppercase tracking-wider font-medium">
            Frustration Score
          </div>
          <div className={`text-sm font-medium mt-0.5 ${
            ticket.frustration_score >= 5 ? "text-text-error-primary" :
            ticket.frustration_score >= 3 ? "text-text-warning-primary" :
            "text-text-primary"
          }`}>
            {ticket.frustration_score}/10
          </div>
        </div>
        <div className="bg-bg-secondary rounded-lg p-3">
          <div className="text-[10px] text-text-quaternary uppercase tracking-wider font-medium">
            Cost
          </div>
          <div className="text-sm text-text-primary mt-0.5">
            {ticket.cost > 0 ? `₹${ticket.cost.toLocaleString()}` : "—"}
          </div>
        </div>
      </div>

      {/* UX Issues */}
      <div className="mb-4">
        <div className="text-[10px] text-text-quaternary uppercase tracking-wider font-medium mb-2">
          UX Issues Detected
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ticket.ux_issues.map((issue) => (
            <Badge key={issue} color="brand" size="sm" type="pill-color">
              {issue}
            </Badge>
          ))}
        </div>
      </div>

      {/* Root Causes */}
      <div className="mb-4">
        <div className="text-[10px] text-text-quaternary uppercase tracking-wider font-medium mb-2">
          Root Causes
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ticket.root_causes.map((rc) => (
            <Badge key={rc} color="gray" size="sm" type="modern">
              {rc}
            </Badge>
          ))}
        </div>
      </div>

      {/* Resolution */}
      {ticket.resolution_notes && (
        <div className="mb-4">
          <div className="text-[10px] text-text-quaternary uppercase tracking-wider font-medium mb-2">
            Resolution Notes
          </div>
          <div className="text-sm text-text-secondary bg-bg-secondary rounded-lg p-3 leading-relaxed">
            {ticket.resolution_notes}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-text-quaternary">
        <span>Created {ticket.create_date}</span>
        {ticket.close_date && <span>· Closed {ticket.close_date}</span>}
        {ticket.owner && <span>· Owner: {ticket.owner}</span>}
        {ticket.resolution_type !== "Unknown" && (
          <span>· {ticket.resolution_type}</span>
        )}
      </div>
    </div>
  );
}

export function TicketDrawer({
  tickets,
  title,
  onClose,
}: {
  tickets: Ticket[];
  title: string;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "frustration" | "preventability">("date");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const filtered = useMemo(() => {
    let result = tickets;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          (t.rid && t.rid.toLowerCase().includes(q)) ||
          t.category.toLowerCase().includes(q) ||
          (t.customer_name && t.customer_name.toLowerCase().includes(q))
      );
    }

    if (sortBy === "frustration") {
      result = [...result].sort((a, b) => b.frustration_score - a.frustration_score);
    } else if (sortBy === "preventability") {
      result = [...result].sort((a, b) => b.preventability_score - a.preventability_score);
    } else {
      result = [...result].sort((a, b) =>
        (b.create_date || "").localeCompare(a.create_date || "")
      );
    }

    return result;
  }, [tickets, search, sortBy]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-bg-overlay/60 z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[560px] bg-bg-primary z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 border-l border-border-secondary">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-secondary shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
            <p className="text-xs text-text-tertiary mt-0.5">
              {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-bg-secondary transition text-fg-quaternary hover:text-fg-secondary"
          >
            <XClose className="size-5" />
          </button>
        </div>

        {/* Search + Sort */}
        {!selectedTicket && (
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border-secondary shrink-0">
            <div className="flex-1 relative">
              <SearchLg className="size-4 text-fg-quaternary absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-border-primary rounded-lg bg-bg-primary text-text-primary placeholder:text-text-quaternary focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-border-brand"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-xs border border-border-primary rounded-lg px-2.5 py-1.5 bg-bg-primary text-text-secondary"
            >
              <option value="date">Newest first</option>
              <option value="frustration">Most frustrated</option>
              <option value="preventability">Most preventable</option>
            </select>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedTicket ? (
            <TicketDetail
              ticket={selectedTicket}
              onBack={() => setSelectedTicket(null)}
            />
          ) : (
            filtered.map((t) => (
              <TicketRow key={t.id} ticket={t} onSelect={setSelectedTicket} />
            ))
          )}
          {!selectedTicket && filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-text-quaternary">
              No tickets found
            </div>
          )}
        </div>
      </div>
    </>
  );
}
