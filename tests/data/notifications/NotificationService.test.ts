import { ExpoNotificationService } from '../../../src/data/notifications/ExpoNotificationService';
import { DatabaseManager, ISQLiteDatabase } from '../../../src/data/sqlite/DatabaseManager';

// Mock expo-notifications
const mockRequestPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
const mockGetPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
const mockScheduleNotificationAsync = jest.fn().mockResolvedValue('notification-id-123');
const mockCancelAllScheduledNotificationsAsync = jest.fn().mockResolvedValue(undefined);
const mockSetNotificationHandler = jest.fn();

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: () => mockRequestPermissionsAsync(),
  getPermissionsAsync: () => mockGetPermissionsAsync(),
  scheduleNotificationAsync: (args: any) => mockScheduleNotificationAsync(args),
  cancelAllScheduledNotificationsAsync: () => mockCancelAllScheduledNotificationsAsync(),
  setNotificationHandler: (handler: any) => mockSetNotificationHandler(handler),
  SchedulableTriggerInputTypes: {
    DAILY: 'daily',
    TIME_INTERVAL: 'timeInterval',
  },
}));

describe('ExpoNotificationService', () => {
  let db: ISQLiteDatabase;
  let service: ExpoNotificationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    db = await DatabaseManager.createInMemory();
    service = new ExpoNotificationService(db);
  });

  it('should request permissions and return true if granted', async () => {
    const granted = await service.requestPermissions();
    expect(granted).toBe(true);
    expect(mockGetPermissionsAsync).toHaveBeenCalled();
  });

  it('should return false if permissions are denied', async () => {
    mockGetPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    mockRequestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });

    const granted = await service.requestPermissions();
    expect(granted).toBe(false);
  });

  it('should get default settings if none saved', async () => {
    const settings = await service.getSettings();
    expect(settings.enabled).toBe(false);
    expect(settings.hour).toBe(8);
    expect(settings.minute).toBe(0);
  });

  it('should save and retrieve notification settings in database', async () => {
    await service.saveSettings({ enabled: true, hour: 7, minute: 30 });
    const settings = await service.getSettings();

    expect(settings.enabled).toBe(true);
    expect(settings.hour).toBe(7);
    expect(settings.minute).toBe(30);
  });

  it('should schedule daily notification reminder', async () => {
    const success = await service.scheduleDailyReminder(8, 0);
    expect(success).toBe(true);
    expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: expect.stringContaining('lectura'),
        }),
      })
    );
  });

  it('should send immediate test notification', async () => {
    const success = await service.sendTestNotification();
    expect(success).toBe(true);
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: expect.stringContaining('Prueba'),
        }),
        trigger: null,
      })
    );
  });

  it('should cancel all reminders when requested', async () => {
    await service.cancelReminders();
    expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  });
});
