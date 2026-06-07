import { CheckCheck, MailOpen, RefreshCcw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/shared/api/modules/notifications";
import { Button } from "@/shared/components/ui/Button";
import { Field, Input, Select } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { notificationFilterSchema } from "./supportSchemas";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
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
        eyebrow="Support"
        subtitle="Operational notification queue with unread filtering and read-state actions."
        title="Notifications"
      />
      <Surface>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-normal">Inbox</h2>
            <p className="mt-1 text-sm text-muted">{unreadCount} unread on this page.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[140px_140px_160px_auto_auto]">
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
          <Table>
            <thead>
              <tr>
                <Th>Message</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((notification) => (
                <tr key={notification.id}>
                  <Td>
                    <p className="font-semibold">{notification.title}</p>
                    <p className="mt-1 text-sm text-muted">{notification.body}</p>
                  </Td>
                  <Td><StatusBadge tone={notification.isRead ? "neutral" : "warning"}>{notification.isRead ? "READ" : "UNREAD"}</StatusBadge></Td>
                  <Td>{formatDate(notification.createdAt)}</Td>
                  <Td>
                    <Button
                      disabled={notification.isRead || markOneMutation.isPending}
                      onClick={() => markOneMutation.mutate(notification.id)}
                      type="button"
                      variant="ghost"
                    >
                      <MailOpen className="size-4" /> Mark read
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Surface>
    </div>
  );
}
