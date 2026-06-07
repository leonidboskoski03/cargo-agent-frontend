import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  meta?: string;
  value: string;
};

export function StatCard({ icon: Icon, label, meta, value }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="grid size-9 place-items-center rounded-lg bg-surface-pearl text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <span className="text-2xl font-semibold tracking-normal">{value}</span>
      </div>
      <p className="mt-3 text-sm font-medium text-muted">{label}</p>
      {meta ? <p className="mt-1 text-xs text-muted">{meta}</p> : null}
    </div>
  );
}
