import type { ReactNode } from "react";
import { toApiClientError } from "@/shared/api/apiClient";
import { cn } from "@/shared/lib/cn";

type PageHeaderProps = {
  action?: ReactNode;
  eyebrow?: string;
  subtitle?: string;
  title: string;
};

export function PageHeader({ action, eyebrow, subtitle, title }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-1 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-normal text-primary">{eyebrow}</p> : null}
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-[-0.28px] text-foreground">{title}</h1>
        {subtitle ? <p className="mt-0 text-[12px] font-normal leading-7 text-muted tracking-[0.05px]">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0 font-normal text-[12px]">{action}</div> : null}
    </div>
  );
}

type SurfaceProps = {
  children: ReactNode;
  className?: string;
};

export function Surface({ children, className }: SurfaceProps) {
  return <section className={cn("rounded-xl border border-border bg-card p-5", className)}>{children}</section>;
}

export function EmptyState({ action, description, title }: { action?: ReactNode; description: string; title: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-pearl p-8 text-center">
      <h2 className="text-xl font-semibold tracking-normal text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ description, title = "Loading" }: { description?: string; title?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <div className="h-4 w-32 rounded-md bg-surface-pearl" />
      <div className="mt-5 h-7 w-64 max-w-full rounded-md bg-surface-pearl" />
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="h-24 rounded-xl bg-surface-pearl" />
        <div className="h-24 rounded-xl bg-surface-pearl" />
        <div className="h-24 rounded-xl bg-surface-pearl" />
      </div>
      <p className="mt-5 text-sm font-semibold text-foreground">{title}</p>
      {description ? <p className="mt-1 text-sm leading-6 text-muted">{description}</p> : null}
    </div>
  );
}

export function ErrorState({ action, description, error, title = "Something went wrong" }: {
  action?: ReactNode;
  description?: string;
  error?: unknown;
  title?: string;
}) {
  const apiError = error ? toApiClientError(error) : null;

  return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-8">
      <h2 className="text-xl font-semibold tracking-normal text-danger">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-red-700">{description ?? apiError?.message ?? "Please try again."}</p>
      {apiError ? (
        <p className="mt-3 text-xs font-semibold uppercase text-red-700">
          {apiError.traceId ? `Trace ID: ${apiError.traceId}` : apiError.code}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
