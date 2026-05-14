import { AdminNotification, NotificationType } from "../interfaces/notification";
import { apiClient, baseUrl } from "./config";

interface NotificationsResponse {
  notifications: AdminNotification[];
  unreadCount: number;
}

interface CreateNotificationData {
  type?: NotificationType;
  title?: string;
  message: string;
  entityType?: string;
  entityId?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

const getNotificationSocketUrl = (token: string) => {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws/notifications";
  url.searchParams.set("token", token);
  return url.toString();
};

export const notificationApi = {
  getNotifications: async (limit = 20): Promise<NotificationsResponse> => {
    const response = await apiClient.get<NotificationsResponse>(
      "/api/admin/notifications",
      { params: { limit } },
    );
    return response.data;
  },

  createNotification: async (
    data: CreateNotificationData,
  ): Promise<AdminNotification> => {
    const response = await apiClient.post<{ notification: AdminNotification }>(
      "/api/admin/notifications",
      data,
    );
    return response.data.notification;
  },

  markAsRead: async (id: string): Promise<AdminNotification> => {
    const response = await apiClient.patch<{ notification: AdminNotification }>(
      `/api/admin/notifications/${id}/read`,
    );
    return response.data.notification;
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch("/api/admin/notifications/read-all");
  },

  getSocketUrl: getNotificationSocketUrl,
};
