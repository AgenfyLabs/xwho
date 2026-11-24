import { BookOpen, CalendarDays, Search } from "lucide-react";

export function Empty({ kind = "book", title, children }: {
  kind?: "book" | "calendar" | "search"; title: string; children: React.ReactNode;
}) {
  const Icon = kind === "book" ? BookOpen : kind === "search" ? Search : CalendarDays;
  return <div className="empty"><Icon size={30} strokeWidth={1.4} aria-hidden="true" /><div>
    <h3>{title}</h3><div className="empty-copy">{children}</div>
  </div></div>;
}
