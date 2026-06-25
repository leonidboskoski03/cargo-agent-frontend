import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, CalendarDays, CheckCircle2, Inbox, MessageSquare, Send, UserRound, XCircle } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  createVehicleMarketplaceInquiryReply,
  listVehicleMarketplaceInquiries,
  listVehicleMarketplaceInquiryReplies,
  updateVehicleMarketplaceInquiry,
  type VehicleMarketplaceInquiry,
} from "@/shared/api/modules/vehicleMarketplace";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge } from "@/shared/components/ui/DataTable";
import { FilterPopover } from "@/shared/components/ui/FilterPopover";
import { Field, Select } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { WorkflowReplyThread } from "@/shared/components/ui/WorkflowReplyThread";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";
import { marketplaceStatusTone } from "./vehicleMarketplaceFormatters";

type InquiryCardProps = {
  currentCompanyId?: string | null;
  currentUserId?: string | null;
  inquiry: VehicleMarketplaceInquiry;
  isPending: boolean;
  onClose: (id: string) => void;
  onResponded: (id: string) => void;
  ownsListing: boolean;
  sentInquiry: boolean;
};

function InquiryCard({ currentCompanyId, currentUserId, inquiry, isPending, onClose, onResponded, ownsListing, sentInquiry }: InquiryCardProps) {
  const queryClient = useQueryClient();
  const repliesQuery = useQuery({
    queryFn: () => listVehicleMarketplaceInquiryReplies(inquiry.id),
    queryKey: ["vehicle-marketplace", "inquiries", inquiry.id, "replies"],
  });
  const replyMutation = useAppMutation({
    messages: { success: "Reply sent" },
    mutationFn: (message: string) => createVehicleMarketplaceInquiryReply(inquiry.id, { message }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["vehicle-marketplace", "inquiries", inquiry.id, "replies"] }),
  });
  const sender = inquiry.senderCompany?.name ?? [inquiry.senderUser?.firstName, inquiry.senderUser?.lastName].filter(Boolean).join(" ") ?? "Unknown sender";
  const directionLabel = ownsListing ? "Received" : sentInquiry ? "Sent" : "Related";
  const createdDate = inquiry.createdAt ? inquiry.createdAt.slice(0, 10) : "Not dated";
  const contactItems = [
    inquiry.contactName ? `Contact: ${inquiry.contactName}` : null,
    inquiry.contactEmail,
    inquiry.contactPhone,
  ].filter(Boolean);

  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-muted">
            <span className="inline-flex items-center gap-1 rounded-md bg-surface-pearl px-2 py-1">
              {ownsListing ? <Inbox className="size-3.5" aria-hidden="true" /> : <Send className="size-3.5" aria-hidden="true" />}
              {directionLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-surface-pearl px-2 py-1">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {createdDate}
            </span>
          </div>
          <Link className="mt-3 inline-flex items-center gap-2 text-2xl font-semibold tracking-normal hover:text-primary" to={`/vehicle-marketplace/${inquiry.listingId}`}>
            {inquiry.listing.title}
            <ArrowUpRight className="size-5 text-muted" aria-hidden="true" />
          </Link>
          <p className="mt-1 text-sm text-muted">{humanizeEnum(inquiry.listing.intent)} / {humanizeEnum(inquiry.listing.vehicleType)} / {inquiry.listing.city}, {inquiry.listing.countryCode}</p>
        </div>
        <StatusBadge tone={marketplaceStatusTone(inquiry.status)}>{humanizeEnum(inquiry.status)}</StatusBadge>
      </div>

      <div className="mt-5 border-y border-border py-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted">
          <MessageSquare className="size-4 text-primary" aria-hidden="true" />
          Message
        </p>
        <p className="mt-2 text-sm leading-6 text-foreground">{inquiry.message}</p>
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted">
            <UserRound className="size-4 text-primary" aria-hidden="true" />
            Sender
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">{sender}</p>
          {contactItems.length ? <p className="mt-1 text-sm text-muted">{contactItems.join(" / ")}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {ownsListing && inquiry.status !== "RESPONDED" && inquiry.status !== "CLOSED" ? (
            <Button className="h-9 min-h-9 px-3" disabled={isPending} onClick={() => onResponded(inquiry.id)} type="button" variant="secondary">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Responded
            </Button>
          ) : null}
          {inquiry.status !== "CLOSED" ? (
            <Button className="h-9 min-h-9 px-3" disabled={isPending} onClick={() => window.confirm("Close this inquiry?") && onClose(inquiry.id)} type="button" variant="ghost">
              <XCircle className="size-4" aria-hidden="true" />
              Close
            </Button>
          ) : null}
        </div>
      </div>
      <WorkflowReplyThread
        currentCompanyId={currentCompanyId}
        currentUserId={currentUserId}
        error={repliesQuery.error}
        isLoading={repliesQuery.isLoading}
        isSending={replyMutation.isPending}
        onSend={(message) => replyMutation.mutate(message)}
        replies={repliesQuery.data}
        title="Inquiry replies"
      />
    </article>
  );
}

export function VehicleMarketplaceInquiriesPage() {
  const user = useAuthStore((state) => state.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const direction = searchParams.get("direction") ?? "ALL";
  const status = searchParams.get("status") ?? "ALL";
  const [draftFilters, setDraftFilters] = useState({ direction, status });
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

  useEffect(() => {
    setDraftFilters({ direction, status });
  }, [direction, status]);

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
  const activeFilterCount = [direction !== "ALL" ? direction : "", status !== "ALL" ? status : ""].filter(Boolean).length;
  const updateDraftFilter = (key: "direction" | "status", value: string) => setDraftFilters((current) => ({ ...current, [key]: value }));
  const applyFilters = (event?: FormEvent) => {
    event?.preventDefault();
    const next = new URLSearchParams(searchParams);
    next.delete("direction");
    next.delete("status");
    if (draftFilters.direction !== "ALL") next.set("direction", draftFilters.direction);
    if (draftFilters.status !== "ALL") next.set("status", draftFilters.status);
    setSearchParams(next);
  };
  const clearFilters = () => {
    setDraftFilters({ direction: "ALL", status: "ALL" });
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Vehicle marketplace" subtitle="Review sent and received inquiries for vehicle listings." title="Vehicle inquiries" />
      <Surface>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Inquiry queue</p>
            <p className="mt-1 text-sm text-muted">Filter sent and received conversations without changing the table layout.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <FilterPopover
              activeCount={activeFilterCount}
              description="Choose whether to review all, received, or sent vehicle marketplace inquiries by status."
              onApply={applyFilters}
              onClear={clearFilters}
              title="Inquiry filters"
            >
              <section className="grid gap-3 sm:grid-cols-2">
                <Field label="Direction">
                  <Select onChange={(event) => updateDraftFilter("direction", event.target.value)} value={draftFilters.direction}>
                    <option value="ALL">All inquiries</option>
                    <option value="RECEIVED">Received</option>
                    <option value="SENT">Sent</option>
                  </Select>
                </Field>
                <Field label="Status">
                  <Select onChange={(event) => updateDraftFilter("status", event.target.value)} value={draftFilters.status}>
                    <option value="ALL">All statuses</option>
                    <option value="OPEN">Open</option>
                    <option value="RESPONDED">Responded</option>
                    <option value="CLOSED">Closed</option>
                  </Select>
                </Field>
              </section>
            </FilterPopover>
            {activeFilterCount ? <Button onClick={clearFilters} type="button" variant="secondary">Clear</Button> : null}
          </div>
        </div>
      </Surface>
      {filteredInquiries.length === 0 ? (
        <EmptyState description="Inquiries you send or receive for marketplace listings will appear here." title="No inquiries yet" />
      ) : (
        <div className="grid gap-4">
          {filteredInquiries.map((inquiry) => {
            const ownsListing = inquiry.listing.ownerUserId === user?.id || (user?.companyId && inquiry.listing.ownerCompanyId === user.companyId);
            const sentInquiry = inquiry.senderUserId === user?.id || (user?.companyId && inquiry.senderCompanyId === user.companyId);
            return (
              <InquiryCard
                currentCompanyId={user?.companyId}
                currentUserId={user?.id}
                inquiry={inquiry}
                isPending={mutation.isPending}
                key={inquiry.id}
                onClose={(id) => mutation.mutate({ id, status: "CLOSED" })}
                onResponded={(id) => mutation.mutate({ id, status: "RESPONDED" })}
                ownsListing={Boolean(ownsListing)}
                sentInquiry={Boolean(sentInquiry)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
