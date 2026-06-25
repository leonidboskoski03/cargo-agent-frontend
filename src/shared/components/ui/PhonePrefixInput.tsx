import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { countryFlag } from "@/shared/lib/countries";
import { cn } from "@/shared/lib/cn";
import { type CountryOption } from "./CountryCombobox";

const dialingCodes: Record<string, string> = {
  AL: "+355",
  BA: "+387",
  BG: "+359",
  GR: "+30",
  HR: "+385",
  MK: "+389",
  RO: "+40",
  RS: "+381",
  TR: "+90",
  XK: "+383",
};

type PhonePrefixInputProps = {
  countries: CountryOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

type MenuPosition = {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
};

function resolveInitialCountry(value: string, countries: CountryOption[]) {
  const match = countries.find((country) => value.startsWith(dialingCodes[country.code] ?? ""));
  return match?.code ?? countries.find((country) => country.code === "MK")?.code ?? countries[0]?.code ?? "";
}

function stripDialingCode(value: string, countryCode: string) {
  const dialingCode = dialingCodes[countryCode];
  if (!dialingCode || !value.startsWith(dialingCode)) return value;
  return value.slice(dialingCode.length).trimStart();
}

export function PhonePrefixInput({ countries, disabled, onChange, placeholder = "70 123 456", value }: PhonePrefixInputProps) {
  const supportedCountries = useMemo(
    () => countries.filter((country) => dialingCodes[country.code]),
    [countries],
  );
  const [countryCode, setCountryCode] = useState(() => resolveInitialCountry(value, supportedCountries));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const activeCountryCode = countryCode || resolveInitialCountry(value, supportedCountries);
  const dialingCode = dialingCodes[activeCountryCode] ?? "";
  const localNumber = stripDialingCode(value, activeCountryCode);
  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return supportedCountries;
    return supportedCountries.filter((country) =>
      [country.code, country.name, country.nativeName ?? "", dialingCodes[country.code] ?? ""].some((part) =>
        part.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [query, supportedCountries]);

  useEffect(() => {
    if (!countryCode && supportedCountries.length) {
      setCountryCode(resolveInitialCountry(value, supportedCountries));
    }
  }, [countryCode, supportedCountries, value]);

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

  const updateCountry = (nextCountryCode: string) => {
    setCountryCode(nextCountryCode);
    setOpen(false);
    setQuery("");
    const nextDialingCode = dialingCodes[nextCountryCode] ?? "";
    onChange(localNumber.trim() ? `${nextDialingCode} ${localNumber.trim()}` : "");
  };

  const updateLocalNumber = (nextLocalNumber: string) => {
    onChange(nextLocalNumber.trim() ? `${dialingCode} ${nextLocalNumber}` : "");
  };

  return (
    <div ref={wrapperRef}>
      <div className="flex h-10 items-center rounded-lg border border-border bg-card text-sm outline-none transition focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-300 focus-within:ring-offset-2 focus-within:ring-offset-background">
        <button
          aria-expanded={open}
          aria-label={`Phone prefix ${dialingCode || "+ -"}`}
          className="flex h-full shrink-0 items-center gap-1.5 rounded-l-lg border-r border-border px-3 text-muted transition hover:bg-surface-pearl disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || supportedCountries.length === 0}
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span aria-hidden="true">{countryFlag(activeCountryCode)}</span>
          <span>{dialingCode || "+ -"}</span>
          <ChevronDown aria-hidden="true" className={cn("size-3.5 transition", open && "rotate-180")} />
        </button>
        <input
          autoComplete="tel-national"
          className="h-full w-full min-w-0 rounded-r-lg bg-transparent px-3 outline-none"
          disabled={disabled}
          inputMode="tel"
          onChange={(event) => updateLocalNumber(event.target.value)}
          placeholder={placeholder}
          type="tel"
          value={localNumber}
        />
      </div>

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
                  aria-label={`${country.name}${country.code}`}
                  className={cn(
                    "flex min-h-9 w-full items-center justify-between gap-2 rounded-md px-2.5 text-left text-sm transition hover:bg-surface-pearl",
                    country.code === activeCountryCode && "bg-surface-pearl font-semibold text-primary",
                  )}
                  key={country.code}
                  onClick={() => updateCountry(country.code)}
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true" className="text-base leading-none">{countryFlag(country.code)}</span>
                    <span className="truncate">{country.name}</span>
                    <span className="shrink-0 text-xs text-muted">{country.code}</span>
                    <span className="shrink-0 text-xs text-muted">{dialingCodes[country.code]}</span>
                  </span>
                  {country.code === activeCountryCode ? <Check aria-hidden="true" className="size-4" /> : null}
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
