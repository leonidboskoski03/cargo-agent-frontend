import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/lib/cn";
import { countryFlag } from "@/shared/lib/countries";

export type CountryOption = {
  code: string;
  name: string;
  nativeName?: string | null;
};

type CountryComboboxProps = {
  countries: CountryOption[];
  disabled?: boolean;
  onChange: (code: string) => void;
  placeholder?: string;
  value: string;
};

type MenuPosition = {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
};

export function CountryCombobox({ countries, disabled, onChange, placeholder = "Select country", value }: CountryComboboxProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const selected = countries.find((country) => country.code === value);
  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return countries;
    return countries.filter((country) =>
      [country.code, country.name, country.nativeName ?? ""].some((part) => part.toLowerCase().includes(normalizedQuery)),
    );
  }, [countries, query]);

  const updateMenuPosition = () => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const margin = 8;
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openUp = spaceBelow < 260 && spaceAbove > spaceBelow;
    const availableSpace = Math.max(180, openUp ? spaceAbove : spaceBelow);
    const maxHeight = Math.min(320, Math.max(180, availableSpace - gap));

    setMenuPosition({
      left: Math.max(margin, rect.left),
      maxHeight,
      top: openUp ? Math.max(margin, rect.top - maxHeight - gap) : Math.min(rect.bottom + gap, window.innerHeight - margin),
      width: rect.width,
    });
  };

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();
    window.setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleReposition = () => updateMenuPosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open]);

  const choose = (code: string) => {
    onChange(code);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrapperRef}>
      <button
        aria-expanded={open}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 text-left text-sm text-foreground shadow-sm outline-none transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          !selected && "text-muted",
        )}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected ? <span aria-hidden="true" className="text-base leading-none">{countryFlag(selected.code)}</span> : null}
          <span className="truncate">{selected ? `${selected.name} (${selected.code})` : placeholder}</span>
        </span>
        <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 text-muted transition", open && "rotate-180")} />
      </button>

      {open && menuPosition && typeof document !== "undefined" ? createPortal(
        <div
          className="fixed z-[100] rounded-lg border border-border bg-card p-1 shadow-lg"
          ref={menuRef}
          style={{
            left: menuPosition.left,
            maxHeight: menuPosition.maxHeight,
            top: menuPosition.top,
            width: menuPosition.width,
          }}
        >
          <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-background px-2">
            <Search aria-hidden="true" className="size-4 text-muted" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search country"
              ref={searchRef}
              value={query}
            />
          </div>
          <div className="mt-1 overflow-auto" style={{ maxHeight: Math.max(120, menuPosition.maxHeight - 48) }}>
            {filteredCountries.length ? (
              filteredCountries.map((country) => (
                <button
                  className={cn(
                    "flex min-h-9 w-full items-center justify-between gap-2 rounded-md px-2.5 text-left text-sm transition hover:bg-surface-pearl",
                    country.code === value && "bg-surface-pearl font-semibold text-primary",
                  )}
                  key={country.code}
                  onClick={() => choose(country.code)}
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true" className="text-base leading-none">{countryFlag(country.code)}</span>
                    <span className="truncate">{country.name}</span>
                    <span className="shrink-0 text-xs text-muted">{country.code}</span>
                  </span>
                  {country.code === value ? <Check aria-hidden="true" className="size-4" /> : null}
                </button>
              ))
            ) : (
              <p className="px-2.5 py-3 text-sm text-muted">No countries found</p>
            )}
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
