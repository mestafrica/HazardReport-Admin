export type NotificationType = "report" | "announcement" | "user" | "system";
export type NotificationEntityType =
  | "hazardReport"
  | "announcement"
  | "user"
  | "system";

export interface AdminNotification {
  id: string;
  _id?: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  entityType?: NotificationEntityType;
  entityId?: string;
  link?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
