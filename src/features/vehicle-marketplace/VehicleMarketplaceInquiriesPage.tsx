import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Filter, Inbox, Send, XCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { listVehicleMarketplaceInquiries, updateVehicleMarketplaceInquiry } from "@/shared/api/modules/vehicleMarketplace";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { Field, Select } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";
import { marketplaceStatusTone } from "./vehicleMarketplaceFormatters";

export function VehicleMarketplaceInquiriesPage() {
  const user = useAuthStore((state) => state.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const direction = searchParams.get("direction") ?? "ALL";
  const status = searchParams.get("status") ?? "ALL";
  const queryClient = useQueryClient();
  const query = useQuery({
    queryFn: () => listVehicleMarketplaceInquiries({ status: status === "ALL" ? undefined : status as never }),
    queryKey: ["vehicle-marketplace", "inquiries", status],
  });
  const mutation = useAppMutation({
    messages: { success: "Inquiry updated" },
    mutationFn: ({ id, status }: { id: string; status: "RESPONDED" | "CLOSED" }) => updateVehicleMarketplaceInquiry(id, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["vehicle-marketplace", "inquiries"] }),
  });

  if (query.isLoading) return <LoadingState description="Loading sent and received vehicle marketplace inquiries." title="Loading inquiries" />;
  if (query.error) return <ErrorState description="Vehicle marketplace inquiries could not be loaded." error={query.error} title="Unable to load inquiries" />;

  const inquiries = query.data ?? [];
  const filteredInquiries = inquiries.filter((inquiry) => {
    const ownsListing = inquiry.listing.ownerUserId === user?.id || (user?.companyId && inquiry.listing.ownerCompanyId === user.companyId);
    const sentInquiry = inquiry.senderUserId === user?.id || (user?.companyId && inquiry.senderCompanyId === user.companyId);
    if (direction === "RECEIVED") return ownsListing;
    if (direction === "SENT") return sentInquiry && !ownsListing;
    return true;
  });
  const updateFilter = (key: "direction" | "status", value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "ALL") next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Vehicle marketplace" subtitle="Review sent and received inquiries for vehicle listings." title="Vehicle inquiries" />
      <Surface>
        <div className="grid gap-4 md:grid-cols-[14rem_14rem_auto] md:items-end">
          <Field label="Direction">
            <Select onChange={(event) => updateFilter("direction", event.target.value)} value={direction}>
              <option value="ALL">All inquiries</option>
              <option value="RECEIVED">Received</option>
              <option value="SENT">Sent</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select onChange={(event) => updateFilter("status", event.target.value)} value={status}>
              <option value="ALL">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="RESPONDED">Responded</option>
              <option value="CLOSED">Closed</option>
            </Select>
          </Field>
          <Button onClick={() => setSearchParams(new URLSearchParams())} type="button" variant="secondary">
            <Filter className="size-4" aria-hidden="true" />
            Clear
          </Button>
        </div>
      </Surface>
      {filteredInquiries.length === 0 ? (
        <EmptyState description="Inquiries you send or receive for marketplace listings will appear here." title="No inquiries yet" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Listing</Th>
              <Th>Message</Th>
              <Th>Sender</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filteredInquiries.map((inquiry) => {
              const ownsListing = inquiry.listing.ownerUserId === user?.id || (user?.companyId && inquiry.listing.ownerCompanyId === user.companyId);
              const sentInquiry = inquiry.senderUserId === user?.id || (user?.companyId && inquiry.senderCompanyId === user.companyId);
              const sender = inquiry.senderCompany?.name ?? [inquiry.senderUser?.firstName, inquiry.senderUser?.lastName].filter(Boolean).join(" ") ?? "Unknown sender";
              return (
                <tr key={inquiry.id}>
                  <Td>
                    <Link className="font-semibold text-primary" to={`/vehicle-marketplace/${inquiry.listingId}`}>{inquiry.listing.title}</Link>
                    <p className="mt-1 text-xs text-muted">{humanizeEnum(inquiry.listing.intent)} / {humanizeEnum(inquiry.listing.vehicleType)}</p>
                    <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-surface-pearl px-2 py-1 text-xs font-semibold text-muted">
                      {ownsListing ? <Inbox className="size-3" aria-hidden="true" /> : <Send className="size-3" aria-hidden="true" />}
                      {ownsListing ? "Received" : sentInquiry ? "Sent" : "Related"}
                    </p>
                  </Td>
                  <Td>
                    <p className="line-clamp-2">{inquiry.message}</p>
                    {inquiry.contactName ? <p className="mt-1 text-xs text-muted">{inquiry.contactName}</p> : null}
                    {inquiry.contactEmail ? <p className="mt-1 text-xs text-muted">{inquiry.contactEmail}</p> : null}
                    {inquiry.contactPhone ? <p className="mt-1 text-xs text-muted">{inquiry.contactPhone}</p> : null}
                  </Td>
                  <Td>{sender}</Td>
                  <Td><StatusBadge tone={marketplaceStatusTone(inquiry.status)}>{humanizeEnum(inquiry.status)}</StatusBadge></Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      {ownsListing && inquiry.status !== "RESPONDED" && inquiry.status !== "CLOSED" ? (
                        <Button className="h-9 min-h-9 px-3" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: inquiry.id, status: "RESPONDED" })} type="button" variant="secondary">
                          <CheckCircle2 className="size-4" aria-hidden="true" />
                          Responded
                        </Button>
                      ) : null}
                      {inquiry.status !== "CLOSED" ? (
                      <Button className="h-9 min-h-9 px-3" disabled={mutation.isPending} onClick={() => window.confirm("Close this inquiry?") && mutation.mutate({ id: inquiry.id, status: "CLOSED" })} type="button" variant="ghost">
                        <XCircle className="size-4" aria-hidden="true" />
                        Close
                      </Button>
                      ) : null}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
