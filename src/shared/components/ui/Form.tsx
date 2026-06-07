import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import type { FieldError } from "react-hook-form";
import { cn } from "@/shared/lib/cn";

type FieldProps = {
  children: ReactNode;
  description?: string;
  error?: FieldError | string;
  label: string;
  required?: boolean;
};

export function Field({ children, description, error, label, required }: FieldProps) {
  const errorMessage = typeof error === "string" ? error : error?.message;

  return (
    <label className="block text-sm font-semibold text-foreground">
      <span>
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      <div className="mt-2">{children}</div>
      {description ? <p className="mt-1 text-xs font-normal text-muted">{description}</p> : null}
      {errorMessage ? <p className="mt-1 text-xs font-normal text-danger">{errorMessage}</p> : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    className={cn(
      "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-slate-300 disabled:opacity-50",
      "focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      className,
    )}
    ref={ref}
    {...props}
  />
));

Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-lg border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-slate-300 disabled:opacity-50",
        "focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <CustomSelect ref={ref} className={className} {...props} />
));

Select.displayName = "Select";

type OptionProps = { children?: ReactNode; value?: string };

function optionText(children: ReactNode) {
  return Children.toArray(children).join("").trim();
}

export const CustomSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ children, className, disabled, name, onBlur, onChange, value, defaultValue, ...props }, ref) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [internalValue, setInternalValue] = useState(String(defaultValue ?? ""));
    const selectedValue = String(value ?? internalValue);
    const options = useMemo(
      () =>
        Children.toArray(children)
          .filter(isValidElement)
          .map((child) => {
            const element = child as ReactElement<OptionProps>;
            const optionValue = String(element.props.value ?? "");
            return { disabled: Boolean((element.props as { disabled?: boolean }).disabled), label: optionText(element.props.children), value: optionValue };
          }),
      [children],
    );
    const selected = options.find((option) => option.value === selectedValue);

    useEffect(() => {
      function handlePointerDown(event: MouseEvent) {
        if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
      }
      document.addEventListener("mousedown", handlePointerDown);
      return () => document.removeEventListener("mousedown", handlePointerDown);
    }, []);

    const choose = (nextValue: string) => {
      if (value === undefined) setInternalValue(nextValue);
      onChange?.({
        currentTarget: { name, value: nextValue },
        target: { name, value: nextValue },
      } as unknown as ChangeEvent<HTMLSelectElement>);
      setOpen(false);
    };

    const handleNativeChange = (event: ChangeEvent<HTMLSelectElement>) => {
      if (value === undefined) setInternalValue(event.target.value);
      onChange?.(event);
    };

    return (
      <div className="relative" ref={wrapperRef}>
        <select
          className="sr-only"
          disabled={disabled}
          name={name}
          onBlur={onBlur}
          onChange={handleNativeChange}
          ref={ref}
          value={selectedValue}
          {...props}
        >
          {children}
        </select>
        <button
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 text-left text-sm text-foreground shadow-sm outline-none transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            !selected?.value && "text-muted",
            className,
          )}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span className="truncate">{selected?.label || options[0]?.label || "Select"}</span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted transition", open && "rotate-180")} aria-hidden="true" />
        </button>
        {open ? (
          <div className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-card p-1 shadow-lg">
            {options.map((option) => (
              <button
                className={cn(
                  "flex min-h-9 w-full items-center justify-between gap-2 rounded-md px-2.5 text-left text-sm transition hover:bg-surface-pearl disabled:cursor-not-allowed disabled:opacity-50",
                  option.value === selectedValue && "bg-surface-pearl font-semibold text-primary",
                )}
                disabled={option.disabled}
                key={`${option.value}-${option.label}`}
                onClick={() => choose(option.value)}
                type="button"
              >
                <span className="truncate">{option.label}</span>
                {option.value === selectedValue ? <Check className="size-4" aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  },
);

CustomSelect.displayName = "CustomSelect";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { children: ReactNode };

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ children, className, ...props }, ref) => (
  <label className={cn("inline-flex items-center gap-2 text-sm font-semibold text-foreground", className)}>
    <span className="relative grid size-5 place-items-center rounded-md border border-border bg-card">
      <input className="peer absolute inset-0 opacity-0" ref={ref} type="checkbox" {...props} />
      <Check className="size-3.5 text-primary opacity-0 peer-checked:opacity-100" aria-hidden="true" />
    </span>
    {children}
  </label>
));

Checkbox.displayName = "Checkbox";
