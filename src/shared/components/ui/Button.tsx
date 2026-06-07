import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-focus",
  secondary: "border border-primary bg-card text-primary hover:bg-surface-pearl",
  ghost: "bg-transparent text-primary hover:bg-surface-pearl",
  danger: "bg-danger text-white hover:bg-red-700",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, disabled, variant = "primary", ...props }, ref) => (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-normal transition duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        variants[variant],
        className,
      )}
      disabled={disabled}
      ref={ref}
      {...props}
    />
  ),
);

Button.displayName = "Button";
