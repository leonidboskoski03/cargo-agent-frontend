import type { ContractStatus } from "@/shared/api/modules/contracts";

export function contractTone(status: ContractStatus): "neutral" | "success" | "warning" | "danger" {
  if (status === "COMPLETED") return "success";
  if (status === "CONFIRMED" || status === "IN_PROGRESS") return "warning";
  if (status === "CANCELLED" || status === "DISPUTED") return "danger";
  return "neutral";
}

export function formatCurrency(amount?: string | null, currency = "EUR") {
  if (!amount) return "Not priced";
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) return `${amount} ${currency}`;
  return new Intl.NumberFormat(undefined, { currency, style: "currency" }).format(numeric);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Not planned";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
