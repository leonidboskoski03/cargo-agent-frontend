import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  changeContractStatus,
  deleteContract,
  getContract,
  restoreContract,
  type ContractStatus,
} from "@/shared/api/modules/contracts";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge } from "@/shared/components/ui/DataTable";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";
import { contractTone, formatCurrency, formatDateTime } from "./contractFormatters";
import { canChangeContractStatus, canDeleteContract, contractStatusTargets } from "./contractPermissions";

function actionLabel(status: ContractStatus) {
  if (status === "IN_PROGRESS") return "Start Contract";
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

export function ContractDetailPage() {
  const { contractId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const contractQuery = useQuery({
    enabled: Boolean(contractId),
    queryFn: () => getContract(contractId),
    queryKey: ["contracts", contractId],
  });
  const contract = contractQuery.data;
  const isInvolved = Boolean(contract && (contract.shipperCompanyId === user?.companyId || contract.carrierCompanyId === user?.companyId));
  const isShipper = Boolean(contract && contract.shipperCompanyId === user?.companyId);
  const statusTargets = contract ? contractStatusTargets(contract.status) : [];

  const statusMutation = useAppMutation({
    messages: { success: "Contract status updated" },
    mutationFn: (status: ContractStatus) => changeContractStatus(contractId, status),
    onSuccess: () => {
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
                    onClick={() => statusMutation.mutate(status)}
                    type="button"
                    variant={status === "CANCELLED" || status === "DISPUTED" ? "secondary" : "primary"}
                  >
                    {actionLabel(status)}
                  </Button>
                ))
              : null}
            {canDeleteContract({ isShipper, role: user?.role }) ? (
              <Button disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()} type="button" variant="danger">
                <Trash2 aria-hidden="true" className="size-4" />
                Delete
              </Button>
            ) : null}
          </div>
        }
        eyebrow="Contract detail"
        subtitle="Review the agreed transport lifecycle and update status only through supported backend transitions."
        title={`Contract ${contract.id.slice(0, 8)}`}
      />

      <div className="grid gap-5 lg:grid-cols-[0.62fr_0.38fr]">
        <Surface>
          <dl className="grid gap-4 md:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Status</dt>
              <dd className="mt-1"><StatusBadge tone={contractTone(contract.status)}>{humanizeEnum(contract.status)}</StatusBadge></dd>
            </div>
            <DetailItem label="Agreed price" value={formatCurrency(contract.agreedPriceAmount, contract.currency)} />
            <DetailItem label="Pickup planned" value={formatDateTime(contract.pickupPlannedAt)} />
            <DetailItem label="Delivery planned" value={formatDateTime(contract.deliveryPlannedAt)} />
            <DetailItem label="Pickup actual" value={formatDateTime(contract.pickupActualAt)} />
            <DetailItem label="Delivery actual" value={formatDateTime(contract.deliveryActualAt)} />
          </dl>
        </Surface>

        <Surface>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-surface-pearl text-primary">
              <RotateCcw aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.28px]">Lifecycle links</h2>
              <p className="text-sm leading-6 text-muted">Backend source IDs for this contract.</p>
            </div>
          </div>
          <dl className="mt-5 space-y-4">
            <DetailItem label="Post ID" value={contract.postId} />
            <DetailItem label="Accepted bid ID" value={contract.acceptedBidId} />
            <DetailItem label="Route ID" value={contract.routeId} />
            <DetailItem label="Your role" value={isShipper ? "Shipper" : "Carrier"} />
          </dl>
        </Surface>
      </div>
    </div>
  );
}
