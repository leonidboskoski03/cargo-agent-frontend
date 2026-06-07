import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type NotificationRecord = {
  body: string;
  createdAt: string;
  id: string;
  isRead: boolean;
  title: string;
};

export type NotificationsQuery = {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
};

export function listNotifications(params?: NotificationsQuery) {
  return unwrapData<NotificationRecord[]>(apiClient.get("/notifications", { params }));
}

export function markNotificationRead(notificationId: string) {
  return unwrapData<NotificationRecord>(apiClient.patch(`/notifications/${notificationId}/read`, {}));
}

export function markAllNotificationsRead() {
  return unwrapData<{ count?: number } | NotificationRecord[]>(apiClient.patch("/notifications/read-all", {}));
}
