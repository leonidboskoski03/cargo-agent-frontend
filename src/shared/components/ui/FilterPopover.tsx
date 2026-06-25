import { SlidersHorizontal, X } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

type FilterPopoverProps = {
  activeCount?: number;
  children: ReactNode;
  description?: string;
  onApply: (event?: FormEvent) => void;
  onClear: () => void;
  title?: string;
};

export function FilterPopover({
  activeCount = 0,
  children,
  description = "Filters apply after you confirm them.",
  onApply,
  onClear,
  title = "Filters",
}: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleApply = (event?: FormEvent) => {
    event?.preventDefault();
    onApply(event);
    setOpen(false);
  };

  return (
    <>
      <Button aria-expanded={open} onClick={() => setOpen(true)} type="button" variant="secondary">
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Filters{activeCount ? ` (${activeCount})` : ""}
      </Button>
      {open && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-50 bg-black/35 px-3 py-4 sm:px-5" role="presentation">
          <div className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="filter-popover-title">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-normal" id="filter-popover-title">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
              </div>
              <button
                aria-label="Close filters"
                className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-pearl hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                onClick={() => setOpen(false)}
                ref={closeButtonRef}
                type="button"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleApply}>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <div className="space-y-5">{children}</div>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-border bg-card px-5 py-4">
                <Button onClick={onClear} type="button" variant="ghost">Clear</Button>
                <Button type="submit">Apply</Button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
