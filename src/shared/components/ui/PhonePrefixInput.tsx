import { useMemo, useState } from "react";
import { countryFlag } from "@/shared/lib/countries";
import { CountryCombobox, type CountryOption } from "./CountryCombobox";

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
  const [countryCode, setCountryCode] = useState(() => resolveInitialCountry(value, countries));
  const supportedCountries = useMemo(
    () => countries.filter((country) => dialingCodes[country.code]),
    [countries],
  );
  const activeCountryCode = countryCode || resolveInitialCountry(value, supportedCountries);
  const dialingCode = dialingCodes[activeCountryCode] ?? "";
  const localNumber = stripDialingCode(value, activeCountryCode);

  const updateCountry = (nextCountryCode: string) => {
    setCountryCode(nextCountryCode);
    const nextDialingCode = dialingCodes[nextCountryCode] ?? "";
    onChange(localNumber.trim() ? `${nextDialingCode} ${localNumber.trim()}` : "");
  };

  const updateLocalNumber = (nextLocalNumber: string) => {
    onChange(nextLocalNumber.trim() ? `${dialingCode} ${nextLocalNumber}` : "");
  };

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(10rem,0.42fr)_1fr]">
      <CountryCombobox
        countries={supportedCountries}
        disabled={disabled || supportedCountries.length === 0}
        onChange={updateCountry}
        placeholder="Prefix"
        value={activeCountryCode}
      />
      <div className="flex h-10 items-center rounded-lg border border-border bg-card text-sm outline-none transition focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-300 focus-within:ring-offset-2 focus-within:ring-offset-background">
        <span className="flex h-full shrink-0 items-center gap-1.5 border-r border-border px-3 text-muted">
          <span aria-hidden="true">{countryFlag(activeCountryCode)}</span>
          <span>{dialingCode || "+ -"}</span>
        </span>
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
    </div>
  );
}
