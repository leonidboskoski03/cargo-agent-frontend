import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/shared/components/ui/Button";

type OtpResendButtonProps = {
  attemptsRemaining?: number;
  className?: string;
  disabled?: boolean;
  isPending?: boolean;
  nextResendAt?: string;
  onResend: () => void;
};

export function OtpResendButton({
  attemptsRemaining,
  className,
  disabled,
  isPending,
  nextResendAt,
  onResend,
}: OtpResendButtonProps) {
  const [now, setNow] = useState(() => Date.now());
  const remainingSeconds = useMemo(() => {
    if (!nextResendAt) return 0;
    const timestamp = new Date(nextResendAt).getTime();
    if (!Number.isFinite(timestamp)) return 0;
    return Math.max(0, Math.ceil((timestamp - now) / 1000));
  }, [nextResendAt, now]);
  const isOutOfAttempts = attemptsRemaining === 0;
  const isCoolingDown = remainingSeconds > 0;
  const buttonText = useMemo(() => {
    if (isPending) return "Sending code";
    if (isOutOfAttempts) return "Resend limit reached";
    if (isCoolingDown) return `Resend in ${remainingSeconds}s`;
    return "Resend code";
  }, [isCoolingDown, isOutOfAttempts, isPending, remainingSeconds]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className={className}>
      <Button
        disabled={disabled || isPending || isCoolingDown || isOutOfAttempts}
        onClick={onResend}
        type="button"
        variant="secondary"
      >
        <RefreshCw aria-hidden="true" className="size-4" />
        {buttonText}
      </Button>
      {typeof attemptsRemaining === "number" ? (
        <p className="mt-2 text-xs text-muted">{attemptsRemaining} resend attempts remaining</p>
      ) : null}
    </div>
  );
}
