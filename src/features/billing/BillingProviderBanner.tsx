import { CheckCircle2, TriangleAlert } from "lucide-react";
import type { BillingReadiness } from "@/shared/api/modules/billingReadiness";
import { StatusBadge } from "@/shared/components/ui/DataTable";
import { Surface } from "@/shared/components/ui/Page";
import { cn } from "@/shared/lib/cn";

type BillingProviderBannerProps = {
  context: "company-billing" | "company-credits" | "job-wallet";
  readiness?: BillingReadiness;
};

function missingItems(context: BillingProviderBannerProps["context"], readiness?: BillingReadiness) {
  if (!readiness) return ["Billing readiness could not be loaded"];

  const missing = [
    !readiness.stripeSecretConfigured ? "Stripe test secret key" : null,
    !readiness.stripeWebhookSecretConfigured ? "Stripe webhook signing secret" : null,
    context === "company-billing" && !readiness.proPriceConfigured ? "PRO plan Stripe price" : null,
    context === "company-credits" && !readiness.companyCreditPricesConfigured ? "Company credit pack prices" : null,
    context === "job-wallet" && !readiness.jobSeekerCreditPricesConfigured ? "Job seeker credit pack prices" : null,
  ].filter((item): item is string => Boolean(item));

  return missing;
}

function titleFor(context: BillingProviderBannerProps["context"]) {
  if (context === "company-billing") return "Stripe subscription readiness";
  if (context === "company-credits") return "Company credit checkout readiness";
  return "Job wallet checkout readiness";
}

export function BillingProviderBanner({ context, readiness }: BillingProviderBannerProps) {
  if (!readiness) {
    return (
      <Surface className="border-l-4 border-l-slate-300 bg-surface-pearl/70">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">{titleFor(context)}</h2>
              <StatusBadge>Checking</StatusBadge>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted">Checking Stripe sandbox keys, prices, webhook signature mode, and queue readiness.</p>
          </div>
        </div>
      </Surface>
    );
  }

  const missing = missingItems(context, readiness);
  const ready = missing.length === 0;

  return (
    <Surface className={cn("border-l-4", ready ? "border-l-emerald-500 bg-green-50/50" : "border-l-amber-500 bg-amber-50/50")}>
      <div className="flex items-start gap-3">
        {ready ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
        ) : (
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">{titleFor(context)}</h2>
            <StatusBadge tone={ready ? "success" : "warning"}>{ready ? "Ready for sandbox" : "Setup incomplete"}</StatusBadge>
            <StatusBadge tone={readiness.bullmqEnabled ? "success" : "warning"}>{readiness.bullmqEnabled ? "BullMQ on" : "BullMQ off"}</StatusBadge>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted">
            {ready
              ? "Stripe test keys, prices, and webhook signature checks are configured. After checkout, webhooks may take a moment to update the wallet or subscription."
              : `Missing: ${missing.join(", ")}. Checkout may fail or remain pending until these are configured.`}
          </p>
        </div>
      </div>
    </Surface>
  );
}
