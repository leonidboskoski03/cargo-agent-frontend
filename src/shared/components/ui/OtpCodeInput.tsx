import { useMemo, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/shared/lib/cn";

type OtpCodeInputProps = {
  ariaLabel?: string;
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
  length?: number;
  onChange: (value: string) => void;
  value: string;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function OtpCodeInput({
  ariaLabel = "OTP code",
  autoFocus,
  className,
  disabled,
  length = 6,
  onChange,
  value,
}: OtpCodeInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = useMemo(() => digitsOnly(value).slice(0, length).padEnd(length, " ").split(""), [length, value]);

  const updateDigit = (index: number, nextValue: string) => {
    const clean = digitsOnly(nextValue);
    const current = digits.map((digit) => (digit === " " ? "" : digit));

    if (clean.length > 1) {
      clean
        .slice(0, length - index)
        .split("")
        .forEach((digit, offset) => {
          current[index + offset] = digit;
        });
      onChange(current.join("").slice(0, length));
      inputsRef.current[Math.min(index + clean.length, length - 1)]?.focus();
      return;
    }

    current[index] = clean;
    onChange(current.join("").slice(0, length));
    if (clean && index < length - 1) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace" && !digits[index].trim() && index > 0) {
      event.preventDefault();
      const current = digits.map((digit) => (digit === " " ? "" : digit));
      current[index - 1] = "";
      onChange(current.join("").slice(0, length));
      inputsRef.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputsRef.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>, index: number) => {
    const pasted = digitsOnly(event.clipboardData.getData("text"));
    if (!pasted) return;
    event.preventDefault();
    updateDigit(index, pasted);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {digits.map((digit, index) => (
        <input
          aria-label={index === 0 ? ariaLabel : `Digit ${index + 1}`}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          autoFocus={autoFocus && index === 0}
          className="h-11 w-10 rounded-lg border border-border bg-card text-center text-base font-semibold text-foreground outline-none transition focus:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 sm:w-11"
          disabled={disabled}
          inputMode="numeric"
          key={index}
          maxLength={1}
          onChange={(event) => updateDigit(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onPaste={(event) => handlePaste(event, index)}
          pattern="[0-9]*"
          ref={(node) => {
            inputsRef.current[index] = node;
          }}
          type="text"
          value={digit.trim()}
        />
      ))}
    </div>
  );
}
