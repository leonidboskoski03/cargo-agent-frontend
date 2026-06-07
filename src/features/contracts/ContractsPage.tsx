import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, Filter } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { listContracts, type ContractStatus } from "@/shared/api/modules/contracts";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { Field, Select } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";
import { contractTone, formatCurrency, formatDateTime } from "./contractFormatters";

const statuses: Array<ContractStatus | "ALL"> = ["ALL", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DISPUTED"];

function roleLabel(contract: { carrierCompanyId: string; shipperCompanyId: string }, companyId?: string | null) {
  if (companyId === contract.shipperCompanyId) return "Shipper";
  if (companyId === contract.carrierCompanyId) return "Carrier";
  return "Participant";
}

export function ContractsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const requestedStatus = searchParams.get("status");
  const status = statuses.includes(requestedStatus as ContractStatus) && requestedStatus !== "ALL" ? requestedStatus as ContractStatus : null;
  const selectedStatus = status ?? "ALL";
  const contractsQuery = useQuery({
    queryFn: () => listContracts(status ? { status } : undefined),
    queryKey: ["contracts", status ?? "ALL"],
  });
  const contracts = contractsQuery.data ?? [];

  function updateStatus(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === "ALL") next.delete("status");
    else next.set("status", value);
    setSearchParams(next);
  }

  if (contractsQuery.isLoading) {
    return <LoadingState description="Loading contract lifecycle data for your company workspace." title="Loading contracts" />;
  }

  if (contractsQuery.error) {
    return (
      <ErrorState
        description="The contracts workspace could not be loaded."
        error={contractsQuery.error}
        title="Unable to load contracts"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transport lifecycle"
        subtitle="Track confirmed marketplace work from agreement through completion, cancellation, or dispute."
        title="Contracts"
      />

      <Surface>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-surface-pearl text-primary">
                <BriefcaseBusiness aria-hidden="true" className="size-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.28px]">Lifecycle register</h2>
                <p className="mt-1 text-sm leading-6 text-muted">Filter by backend contract status without losing the URL state.</p>
              </div>
            </div>
          </div>
          <div className="w-full md:w-72">
            <Field label="Status filter">
              <Select onChange={(event) => updateStatus(event.target.value)} value={selectedStatus}>
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item === "ALL" ? "All contracts" : humanizeEnum(item)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </Surface>

      {contracts.length === 0 ? (
        <EmptyState
          action={
            selectedStatus !== "ALL" ? (
              <Button onClick={() => updateStatus("ALL")} type="button" variant="secondary">
                <Filter aria-hidden="true" className="size-4" />
                Clear filter
              </Button>
            ) : null
          }
          description="Contracts are created after an accepted bid assigns a post. They will appear here once the transport lifecycle starts."
          title="No contracts found"
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Contract</Th>
              <Th>Status</Th>
              <Th>Role</Th>
              <Th>Agreed Price</Th>
              <Th>Pickup</Th>
              <Th>Delivery</Th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => (
              <tr key={contract.id}>
                <Td>
                  <Link className="font-semibold text-primary" to={`/contracts/${contract.id}`}>
                    {contract.id.slice(0, 8)}
                  </Link>
                  <p className="mt-1 break-words text-xs text-muted">Post {contract.postId.slice(0, 8)}</p>
                </Td>
                <Td><StatusBadge tone={contractTone(contract.status)}>{humanizeEnum(contract.status)}</StatusBadge></Td>
                <Td>{roleLabel(contract, user?.companyId)}</Td>
                <Td>{formatCurrency(contract.agreedPriceAmount, contract.currency)}</Td>
                <Td>{formatDateTime(contract.pickupPlannedAt)}</Td>
                <Td>{formatDateTime(contract.deliveryPlannedAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
