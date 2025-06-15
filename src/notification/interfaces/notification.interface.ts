export interface NotificationData {
  message?: string;
  count?: number;
  type?: string;
  [key: string]: any; // 允許其他動態屬性
}

export interface NotificationPayload {
  to: string;
  site: string;
  data?: NotificationData;
}

export interface BroadcastPayload extends NotificationPayload {
  to: 'all';
}

export interface UserNotificationPayload extends NotificationPayload {
  to: string; // userId
}
