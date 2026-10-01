import * as Notifications from 'expo-notifications';
import { ISQLiteDatabase } from '../sqlite/DatabaseManager';
import {
  NotificationService,
  NotificationSettings,
} from '../../domain/services/NotificationService';

// Configure foreground notification behavior
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  // Silent fallback in test or headless environments
}

export class ExpoNotificationService implements NotificationService {
  private schemaInitialized = false;

  constructor(private readonly db: ISQLiteDatabase) {}

  private async ensureSettingsTable(): Promise<void> {
    if (this.schemaInitialized) return;
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    this.schemaInitialized = true;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch {
      return false;
    }
  }

  async getSettings(): Promise<NotificationSettings> {
    await this.ensureSettingsTable();

    const enabledRow = await this.db.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_settings WHERE key = 'reminder_enabled'"
    );
    const hourRow = await this.db.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_settings WHERE key = 'reminder_hour'"
    );
    const minuteRow = await this.db.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_settings WHERE key = 'reminder_minute'"
    );

    return {
      enabled: enabledRow ? enabledRow.value === '1' : false,
      hour: hourRow ? parseInt(hourRow.value, 10) : 8,
      minute: minuteRow ? parseInt(minuteRow.value, 10) : 0,
    };
  }

  async saveSettings(settings: NotificationSettings): Promise<void> {
    await this.ensureSettingsTable();

    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('reminder_enabled', ?)",
        settings.enabled ? '1' : '0'
      );
      await this.db.runAsync(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('reminder_hour', ?)",
        String(settings.hour)
      );
      await this.db.runAsync(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('reminder_minute', ?)",
        String(settings.minute)
      );
    });
  }

  async scheduleDailyReminder(hour: number, minute: number): Promise<boolean> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      return false;
    }

    try {
      // Cancel previous reminder triggers to prevent duplicates
      await Notifications.cancelAllScheduledNotificationsAsync();

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📖 Hora de tu lectura bíblica',
          body: 'Continuá con tus lecturas del día de hoy en Vida, Esperanza y Verdad.',
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });

      await this.saveSettings({ enabled: true, hour, minute });
      return true;
    } catch {
      return false;
    }
  }

  async cancelReminders(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      // Ignore if canceling fails
    }
    const current = await this.getSettings();
    await this.saveSettings({ ...current, enabled: false });
  }

  async sendTestNotification(): Promise<boolean> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      return false;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Recordatorio de Lectura (Prueba)',
          body: '¡Excelente! Las notificaciones de Planes de Lectura funcionan correctamente en tu teléfono.',
          sound: 'default',
        },
        trigger: null, // Fires immediately
      });
      return true;
    } catch {
      return false;
    }
  }
}
