import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, CalendarClock, ExternalLink, MapPinned, RotateCcw, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  changeContractStatus,
  deleteContract,
  getContract,
  restoreContract,
  updateContractTimeline,
  type ContractStatus,
} from "@/shared/api/modules/contracts";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge } from "@/shared/components/ui/DataTable";
import { Field, Input } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";
import { contractTone, formatCurrency, formatDateTime } from "./contractFormatters";
import { canChangeContractStatus, canDeleteContract, contractStatusTargets } from "./contractPermissions";

function actionLabel(status: ContractStatus) {
  if (status === "IN_PROGRESS") return "Start";
  if (status === "COMPLETED") return "Complete";
  if (status === "CANCELLED") return "Cancel";
  if (status === "DISPUTED") return "Dispute";
  return humanizeEnum(status);
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm text-foreground">{value}</dd>
    </div>
  );
}

function formatDuration(minutes?: number | null) {
  if (!minutes && minutes !== 0) return "Not set";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${remaining} min`;
  if (!remaining) return `${hours} hr`;
  return `${hours} hr ${remaining} min`;
}

function locationLabel(location?: { city: string; countryCode: string } | null) {
  return location ? `${location.city}, ${location.countryCode}` : "Not available";
}

function companyLabel(company?: { city?: string | null; countryCode?: string | null; id: string; name: string } | null, fallbackId?: string) {
  if (!company) return fallbackId ? `Company ${fallbackId.slice(0, 8)}` : "Company";
  const location = [company.city, company.countryCode].filter(Boolean).join(", ");
  return location ? `${company.name} - ${location}` : company.name;
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toApiDateTime(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function timelineStepTone(active: boolean, terminal = false) {
  if (terminal) return "border-danger bg-red-50 text-danger";
  if (active) return "border-primary bg-blue-50 text-primary";
  return "border-border bg-surface-pearl text-muted";
}

export function ContractDetailPage() {
  const { contractId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [pendingStatus, setPendingStatus] = useState<ContractStatus | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [timelineValues, setTimelineValues] = useState<{
    deliveryActualAt: string;
    deliveryPlannedAt: string;
    pickupActualAt: string;
    pickupPlannedAt: string;
  } | null>(null);
  const contractQuery = useQuery({
    enabled: Boolean(contractId),
    queryFn: () => getContract(contractId),
    queryKey: ["contracts", contractId],
  });
  const contract = contractQuery.data;
  const isInvolved = Boolean(contract && (contract.shipperCompanyId === user?.companyId || contract.carrierCompanyId === user?.companyId));
  const isShipper = Boolean(contract && contract.shipperCompanyId === user?.companyId);
  const userRoleLabel = isShipper ? "Shipper" : isInvolved ? "Carrier" : "Viewer";
  const statusTargets = contract ? contractStatusTargets(contract.status) : [];
  const isTerminal = contract ? ["COMPLETED", "CANCELLED", "DISPUTED"].includes(contract.status) : false;
  const canEditTimeline = Boolean(contract && user?.role === "COMPANY_ADMIN" && isInvolved && !isTerminal);
  const canSetActualDates = contract?.status === "IN_PROGRESS";

  const currentTimelineValues = useMemo(
    () => ({
      deliveryActualAt: toDateTimeLocal(contract?.deliveryActualAt),
      deliveryPlannedAt: toDateTimeLocal(contract?.deliveryPlannedAt),
      pickupActualAt: toDateTimeLocal(contract?.pickupActualAt),
      pickupPlannedAt: toDateTimeLocal(contract?.pickupPlannedAt),
    }),
    [contract?.deliveryActualAt, contract?.deliveryPlannedAt, contract?.pickupActualAt, contract?.pickupPlannedAt],
  );
  const effectiveTimelineValues = timelineValues ?? currentTimelineValues;

  const statusMutation = useAppMutation({
    messages: { success: "Contract status updated" },
    mutationFn: (status: ContractStatus) => changeContractStatus(contractId, status),
    onSuccess: () => {
      setPendingStatus(null);
      void queryClient.invalidateQueries({ queryKey: ["contracts", contractId] });
      void queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });

  const restoreMutation = useAppMutation({
    messages: { success: "Contract restored" },
    mutationFn: restoreContract,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });

  const deleteMutation = useAppMutation({
    mutationFn: () => deleteContract(contractId),
    onSuccess: (deletedContract) => {
      void queryClient.invalidateQueries({ queryKey: ["contracts"] });
      navigate("/contracts", { replace: true });
      toast.success("Contract deleted", {
        action: {
          label: "Undo",
          onClick: () => restoreMutation.mutate(deletedContract.id),
        },
      });
    },
  });

  const timelineMutation = useAppMutation({
    messages: { success: "Contract timeline updated" },
    mutationFn: () =>
      updateContractTimeline(contractId, {
        deliveryActualAt: toApiDateTime(effectiveTimelineValues.deliveryActualAt),
        deliveryPlannedAt: toApiDateTime(effectiveTimelineValues.deliveryPlannedAt),
        pickupActualAt: toApiDateTime(effectiveTimelineValues.pickupActualAt),
        pickupPlannedAt: toApiDateTime(effectiveTimelineValues.pickupPlannedAt),
      }),
    onSuccess: () => {
      setTimelineValues(null);
      void queryClient.invalidateQueries({ queryKey: ["contracts", contractId] });
      void queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });

  if (contractQuery.isLoading) {
    return <LoadingState description="Loading contract details and lifecycle controls." title="Loading contract" />;
  }

  if (contractQuery.error) {
    return (
      <ErrorState
        action={<Link className="inline-flex min-h-10 items-center rounded-lg border border-primary bg-card px-4 py-2 text-sm text-primary" to="/contracts">Back to Contracts</Link>}
        description="The contract detail workspace could not be loaded."
        error={contractQuery.error}
        title="Unable to load contract"
      />
    );
  }

  if (!contract) {
    return <EmptyState description="The contract could not be loaded or is no longer available." title="Contract not found" />;
  }

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm text-primary" to="/contracts">
        <ArrowLeft className="size-4" />
        Back to Contracts
      </Link>

      <PageHeader
        action={
          <div className="flex flex-wrap gap-2">
            {canChangeContractStatus({ isInvolved, role: user?.role, status: contract.status })
              ? statusTargets.map((status) => (
                  <Button
                    disabled={statusMutation.isPending}
                    key={status}
                    onClick={() => setPendingStatus(status)}
                    type="button"
                    variant={status === "CANCELLED" || status === "DISPUTED" ? "secondary" : "primary"}
                  >
                    {actionLabel(status)}
                  </Button>
                ))
              : null}
            {canDeleteContract({ isShipper, role: user?.role }) ? (
              <Button disabled={deleteMutation.isPending} onClick={() => setDeleteConfirmOpen(true)} type="button" variant="danger">
                <Trash2 aria-hidden="true" className="size-4" />
                Delete
              </Button>
            ) : null}
          </div>
        }
        eyebrow="Contract detail"
        subtitle="Review the agreed transport lifecycle and update status only through supported backend transitions."
        title={contract.post?.title ?? `Contract ${contract.id.slice(0, 8)}`}
      />

      <Surface className="border-blue-100 bg-blue-50">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={contractTone(contract.status)}>{humanizeEnum(contract.status)}</StatusBadge>
              <StatusBadge tone="neutral">Your role: {userRoleLabel}</StatusBadge>
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.28px]">
              {locationLabel(contract.route?.originLocation)} {"->"} {locationLabel(contract.route?.destinationLocation)}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Created automatically from the accepted bid for {contract.post?.title ?? "this transport post"}.
            </p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-card px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase text-muted">Agreed price</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{formatCurrency(contract.agreedPriceAmount, contract.currency)}</p>
          </div>
        </div>
      </Surface>

      {pendingStatus ? (
        <Surface>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Confirm {actionLabel(pendingStatus).toLowerCase()}</h2>
              <p className="mt-1 text-sm text-muted">
                This contract will move from {humanizeEnum(contract.status).toLowerCase()} to {humanizeEnum(pendingStatus).toLowerCase()}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={statusMutation.isPending} onClick={() => statusMutation.mutate(pendingStatus)} type="button">
                Confirm
              </Button>
              <Button onClick={() => setPendingStatus(null)} type="button" variant="ghost">Cancel</Button>
            </div>
          </div>
        </Surface>
      ) : null}

      {deleteConfirmOpen ? (
        <Surface>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Delete contract</h2>
              <p className="mt-1 text-sm text-muted">Only the shipper can delete this contract. You can restore it from the undo toast immediately after deletion.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()} type="button" variant="danger">
                <Trash2 aria-hidden="true" className="size-4" />
                Delete contract
              </Button>
              <Button onClick={() => setDeleteConfirmOpen(false)} type="button" variant="ghost">Cancel</Button>
            </div>
          </div>
        </Surface>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[0.62fr_0.38fr]">
        <Surface>
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-surface-pearl text-primary">
              <Building2 aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.28px]">Agreement</h2>
              <p className="text-sm leading-6 text-muted">Parties, price, and planned execution window.</p>
            </div>
          </div>
          <dl className="grid gap-4 md:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Status</dt>
              <dd className="mt-1"><StatusBadge tone={contractTone(contract.status)}>{humanizeEnum(contract.status)}</StatusBadge></dd>
            </div>
            <DetailItem label="Agreed price" value={formatCurrency(contract.agreedPriceAmount, contract.currency)} />
            <DetailItem label="Shipper" value={companyLabel(contract.shipperCompany, contract.shipperCompanyId)} />
            <DetailItem label="Carrier" value={companyLabel(contract.carrierCompany, contract.carrierCompanyId)} />
            <DetailItem label="Your role" value={userRoleLabel} />
            <DetailItem label="Source" value={`Accepted bid ${contract.acceptedBidId.slice(0, 8)}`} />
            <DetailItem label="Pickup planned" value={formatDateTime(contract.pickupPlannedAt)} />
            <DetailItem label="Delivery planned" value={formatDateTime(contract.deliveryPlannedAt)} />
            <DetailItem label="Pickup actual" value={formatDateTime(contract.pickupActualAt)} />
            <DetailItem label="Delivery actual" value={formatDateTime(contract.deliveryActualAt)} />
          </dl>
        </Surface>

        <Surface>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-surface-pearl text-primary">
              <MapPinned aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.28px]">Lifecycle links</h2>
              <p className="text-sm leading-6 text-muted">Route and source records connected to this agreement.</p>
            </div>
          </div>
          <dl className="mt-5 space-y-4">
            <DetailItem label="Route" value={`${locationLabel(contract.route?.originLocation)} -> ${locationLabel(contract.route?.destinationLocation)}`} />
            <DetailItem label="Distance" value={contract.route?.distanceKm ? `${contract.route.distanceKm} km` : "Not set"} />
            <DetailItem label="Duration" value={formatDuration(contract.route?.estimatedDurationMinutes)} />
            <DetailItem label="Post" value={contract.post?.title ?? contract.postId} />
            <DetailItem label="Accepted bid" value={`Bid ${contract.acceptedBidId.slice(0, 8)}`} />
            <DetailItem label="Handoff" value="Created automatically when the shipper accepted the bid." />
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary" to={`/posts/${contract.postId}`}>
              <ExternalLink aria-hidden="true" className="size-4" />
              Open post
            </Link>
            <Link className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary" to={`/bids?postId=${contract.postId}`}>
              <RotateCcw aria-hidden="true" className="size-4" />
              Open bids
            </Link>
          </div>
        </Surface>
      </div>

      <Surface>
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-surface-pearl text-primary">
              <CalendarClock aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.28px]">Timeline</h2>
              <p className="text-sm leading-6 text-muted">
                Planned dates can be refined while the contract is active. Actual pickup and delivery are available after start.
              </p>
            </div>
          </div>
          {isTerminal ? <StatusBadge tone={contractTone(contract.status)}>Read-only final state</StatusBadge> : null}
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          {[
            { active: true, label: "Confirmed", value: formatDateTime(contract.createdAt) },
            { active: Boolean(contract.pickupPlannedAt), label: "Planned pickup", value: formatDateTime(contract.pickupPlannedAt) },
            { active: Boolean(contract.pickupActualAt), label: "Actual pickup", value: formatDateTime(contract.pickupActualAt) },
            { active: Boolean(contract.deliveryPlannedAt), label: "Planned delivery", value: formatDateTime(contract.deliveryPlannedAt) },
            {
              active: Boolean(contract.deliveryActualAt) || isTerminal,
              label: contract.status === "COMPLETED" ? "Completed" : "Final state",
              terminal: isTerminal,
              value: contract.status === "COMPLETED" ? formatDateTime(contract.updatedAt) : humanizeEnum(contract.status),
            },
          ].map((step) => (
            <div className={`rounded-lg border p-3 ${timelineStepTone(step.active, step.terminal)}`} key={step.label}>
              <p className="text-xs font-semibold uppercase">{step.label}</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{step.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Pickup planned">
            <Input
              disabled={!canEditTimeline}
              onChange={(event) => setTimelineValues({ ...effectiveTimelineValues, pickupPlannedAt: event.target.value })}
              type="datetime-local"
              value={effectiveTimelineValues.pickupPlannedAt}
            />
          </Field>
          <Field label="Delivery planned">
            <Input
              disabled={!canEditTimeline}
              onChange={(event) => setTimelineValues({ ...effectiveTimelineValues, deliveryPlannedAt: event.target.value })}
              type="datetime-local"
              value={effectiveTimelineValues.deliveryPlannedAt}
            />
          </Field>
          <Field label="Pickup actual">
            <Input
              disabled={!canEditTimeline || !canSetActualDates}
              onChange={(event) => setTimelineValues({ ...effectiveTimelineValues, pickupActualAt: event.target.value })}
              type="datetime-local"
              value={effectiveTimelineValues.pickupActualAt}
            />
          </Field>
          <Field label="Delivery actual">
            <Input
              disabled={!canEditTimeline || !canSetActualDates}
              onChange={(event) => setTimelineValues({ ...effectiveTimelineValues, deliveryActualAt: event.target.value })}
              type="datetime-local"
              value={effectiveTimelineValues.deliveryActualAt}
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted">
            {canEditTimeline
              ? canSetActualDates
                ? "Actual dates can now be recorded because the contract is in progress."
                : "Start the contract before recording actual pickup or delivery."
              : "Drivers and terminal contracts are read-only."}
          </p>
          {canEditTimeline ? (
            <Button disabled={timelineMutation.isPending} onClick={() => timelineMutation.mutate()} type="button">
              <Save aria-hidden="true" className="size-4" />
              Save timeline
            </Button>
          ) : null}
        </div>
      </Surface>
    </div>
  );
}
