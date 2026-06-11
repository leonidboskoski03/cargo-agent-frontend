import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type NotificationType =
  | "BID_SUBMITTED"
  | "BID_ACCEPTED"
  | "BID_REJECTED"
  | "CONTRACT_CREATED"
  | "CONTRACT_STATUS_CHANGED"
  | "REVIEW_PUBLISHED"
  | "VEHICLE_MARKETPLACE_INQUIRY_CREATED"
  | "VEHICLE_MARKETPLACE_INQUIRY_RESPONDED"
  | "JOB_APPLICATION_SUBMITTED";

export type NotificationRecord = {
  body: string;
  createdAt: string;
  id: string;
  isRead: boolean;
  payloadJson?: unknown;
  title: string;
  type: NotificationType;
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
