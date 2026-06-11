import { BellRing, BriefcaseBusiness, CheckCheck, MailOpen, RefreshCcw, Route, Star, Truck } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listNotifications, markAllNotificationsRead, markNotificationRead, type NotificationRecord } from "@/shared/api/modules/notifications";
import { Button } from "@/shared/components/ui/Button";
import { Field, Input, Select } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { StatusBadge } from "@/shared/components/ui/DataTable";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { humanizeEnum } from "@/shared/lib/formatters";
import { notificationFilterSchema } from "./supportSchemas";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function notificationMeta(notification: NotificationRecord) {
  if (notification.type.startsWith("BID_")) return { icon: Route, label: "Route marketplace", tone: "success" as const };
  if (notification.type.startsWith("CONTRACT_")) return { icon: BriefcaseBusiness, label: "Contracts", tone: "success" as const };
  if (notification.type.startsWith("VEHICLE_")) return { icon: Truck, label: "Vehicle market", tone: "warning" as const };
  if (notification.type.startsWith("JOB_")) return { icon: BellRing, label: "Job marketplace", tone: "success" as const };
  return { icon: Star, label: "Reviews", tone: "neutral" as const };
}

function payloadRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
}

function notificationLink(notification: NotificationRecord) {
  const payload = payloadRecord(notification.payloadJson);
  const postId = typeof payload.postId === "string" ? payload.postId : null;
  const contractId = typeof payload.contractId === "string" ? payload.contractId : null;
  const listingId = typeof payload.listingId === "string" ? payload.listingId : null;
  const jobApplicationId = typeof payload.jobApplicationId === "string" ? payload.jobApplicationId : null;

  if (contractId) return { label: "Open contract", to: `/contracts/${contractId}` };
  if (postId) return { label: "Open bids", to: `/bids?postId=${postId}` };
  if (listingId) return { label: "Open listing", to: `/vehicle-marketplace/${listingId}` };
  if (jobApplicationId) return { label: "Open job", to: `/jobs/${jobApplicationId}` };
  return null;
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const filters = useMemo(() => notificationFilterSchema.parse({ page, pageSize, unreadOnly }), [page, pageSize, unreadOnly]);
  const notificationsQuery = useQuery({ queryFn: () => listNotifications(filters), queryKey: ["notifications", filters] });
  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  const markOneMutation = useAppMutation({ mutationFn: markNotificationRead, messages: { success: "Notification marked read." }, onSuccess: refresh });
  const markAllMutation = useAppMutation({ mutationFn: markAllNotificationsRead, messages: { success: "Notifications marked read." }, onSuccess: refresh });

  return (
    <div className="space-y-6">
      <PageHeader
        action={<Link className="text-sm font-semibold text-primary" to="/dashboard">Back to dashboard</Link>}
        subtitle="Operational notification queue with unread filtering and read-state actions."
        title="Notifications"
      />
      <Surface>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-normal">Inbox</h2>
            <p className="mt-1 text-sm text-muted">{unreadCount} unread on this page.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[140px_60px_60px_auto_auto]">
            <Field label="Unread">
              <Select onChange={(event) => setUnreadOnly(event.target.value === "true")} value={String(unreadOnly)}>
                <option value="false">All</option>
                <option value="true">Unread only</option>
              </Select>
            </Field>
            <Field label="Page">
              <Input min={1} onChange={(event) => setPage(Number(event.target.value))} type="number" value={page} />
            </Field>
            <Field label="Page size">
              <Input max={100} min={1} onChange={(event) => setPageSize(Number(event.target.value))} type="number" value={pageSize} />
            </Field>
            <Button className="self-end" onClick={refresh} type="button" variant="ghost"><RefreshCcw className="size-4" /> Refresh</Button>
            <Button className="self-end" disabled={markAllMutation.isPending} onClick={() => markAllMutation.mutate()} type="button" variant="secondary">
              <CheckCheck className="size-4" /> Mark all read
            </Button>
          </div>
        </div>
        {notificationsQuery.isLoading ? (
          <LoadingState title="Loading notifications" />
        ) : notificationsQuery.isError ? (
          <ErrorState error={notificationsQuery.error} title="Notifications unavailable" />
        ) : notifications.length === 0 ? (
          <EmptyState description="Notifications from company and user workflows will appear here." title="No notifications" />
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const meta = notificationMeta(notification);
              const Icon = meta.icon;
              const sourceLink = notificationLink(notification);

              return (
                <article
                  className="rounded-xl border border-border bg-surface-pearl px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.03)]"
                  key={notification.id}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-card text-primary">
                        <Icon aria-hidden="true" className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                          <span className="text-xs font-semibold uppercase text-muted">{humanizeEnum(notification.type)}</span>
                          {!notification.isRead ? <StatusBadge tone="warning">Unread</StatusBadge> : null}
                        </div>
                        <h2 className="mt-2 text-base font-semibold text-foreground">{notification.title}</h2>
                        <p className="mt-1 text-sm leading-6 text-muted">{notification.body}</p>
                        <p className="mt-2 text-xs text-muted">{formatDate(notification.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
                      {sourceLink ? (
                        <Link className="inline-flex min-h-10 items-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary" to={sourceLink.to}>
                          {sourceLink.label}
                        </Link>
                      ) : null}
                      <Button
                        disabled={notification.isRead || markOneMutation.isPending}
                        onClick={() => markOneMutation.mutate(notification.id)}
                        type="button"
                        variant="ghost"
                      >
                        <MailOpen className="size-4" /> Mark read
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Surface>
    </div>
  );
}
