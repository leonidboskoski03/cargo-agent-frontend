import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("border-b border-border px-4 py-3 text-xs font-semibold uppercase text-muted", className)}>{children}</th>;
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("border-b border-border px-4 py-3 align-middle text-sm", className)}>{children}</td>;
}

export function StatusBadge({ tone = "neutral", children }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const toneClass = {
    danger: "bg-red-50 text-danger",
    neutral: "bg-surface-pearl text-muted",
    success: "bg-green-50 text-success",
    warning: "bg-amber-50 text-amber-700",
  }[tone];

  return <span className={cn("inline-flex rounded-md px-2.5 py-1 text-xs font-semibold", toneClass)}>{children}</span>;
}
