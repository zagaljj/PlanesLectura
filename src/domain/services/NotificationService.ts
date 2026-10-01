export interface NotificationSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

export interface NotificationService {
  requestPermissions(): Promise<boolean>;
  getSettings(): Promise<NotificationSettings>;
  saveSettings(settings: NotificationSettings): Promise<void>;
  scheduleDailyReminder(hour: number, minute: number): Promise<boolean>;
  cancelReminders(): Promise<void>;
  sendTestNotification(): Promise<boolean>;
}
