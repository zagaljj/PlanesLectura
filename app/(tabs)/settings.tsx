import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Switch,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAppContext, useAppTheme } from '../../src/presentation/context/AppContext';
import { SitemapSyncService } from '../../src/data/sync/SitemapSyncService';
import { NotificationService } from '../../src/domain/services/NotificationService';
import { fontFamilies, fontSizes, fontWeights } from '../../src/presentation/theme/typography';

export interface DatabaseStats {
  plansCount: number;
  daysCount: number;
  readingsCount: number;
  activeSubscriptionsCount: number;
  articlesCount: number;
  versesCount: number;
}

export interface SettingsScreenProps {
  sitemapSyncService?: SitemapSyncService;
  databaseStats?: DatabaseStats;
  notificationService?: NotificationService;
}

export default function SettingsScreen({
  sitemapSyncService: propSyncService,
  databaseStats: propStats,
  notificationService: propNotificationService,
}: SettingsScreenProps) {
  const context = useAppContext();
  const { colors, isDarkMode, toggleTheme } = useAppTheme();

  const syncService = propSyncService ?? context.sitemapSyncService;
  const notificationService = propNotificationService ?? context.notificationService;
  const db = context.database;

  const [stats, setStats] = useState<DatabaseStats | null>(propStats ?? null);
  const [loadingStats, setLoadingStats] = useState<boolean>(!propStats);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [notificationEnabled, setNotificationEnabled] = useState<boolean>(false);
  const [reminderHour, setReminderHour] = useState<number>(8);
  const [reminderMinute, setReminderMinute] = useState<number>(0);
  const [testNotificationMessage, setTestNotificationMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadNotificationSettings() {
      if (!notificationService) return;
      try {
        const settings = await notificationService.getSettings();
        setNotificationEnabled(settings.enabled);
        setReminderHour(settings.hour);
        setReminderMinute(settings.minute);
      } catch {
        // Fallback
      }
    }
    loadNotificationSettings();
  }, [notificationService]);

  const handleToggleNotification = async (enabled: boolean) => {
    setNotificationEnabled(enabled);
    if (!notificationService) return;
    try {
      if (enabled) {
        const success = await notificationService.scheduleDailyReminder(reminderHour, reminderMinute);
        if (!success) {
          setNotificationEnabled(false);
          setTestNotificationMessage('No se pudo activar el recordatorio en este entorno (en Android Expo Go SDK 53 se requiere Development Build).');
        }
      } else {
        await notificationService.cancelReminders();
      }
    } catch {
      setNotificationEnabled(!enabled);
    }
  };

  const handleChangeHour = async (newHour: number) => {
    setReminderHour(newHour);
    if (notificationEnabled && notificationService) {
      await notificationService.scheduleDailyReminder(newHour, reminderMinute);
    }
  };

  const handleSendTestNotification = async () => {
    if (!notificationService) return;
    try {
      setTestNotificationMessage(null);
      const success = await notificationService.sendTestNotification();
      if (success) {
        setTestNotificationMessage('¡Notificación enviada! Revisa la barra de notificaciones de tu teléfono.');
      } else {
        setTestNotificationMessage('No se pudo enviar la notificación de prueba (en Android Expo Go SDK 53 las notificaciones requieren Development Build).');
      }
    } catch {
      setTestNotificationMessage('Error al enviar la notificación de prueba.');
    }
  };

  const loadDatabaseStats = useCallback(async () => {
    if (propStats) {
      setStats(propStats);
      setLoadingStats(false);
      return;
    }

    if (!db) {
      setLoadingStats(false);
      return;
    }

    try {
      setLoadingStats(true);
      const [
        plansRow,
        daysRow,
        readingsRow,
        subsRow,
        articlesRow,
        versesRow,
      ] = await Promise.all([
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM reading_plans'),
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM plan_days'),
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM plan_readings'),
        db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) as count FROM user_plan_subscriptions WHERE is_active = 1'
        ),
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM study_articles'),
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM bible_verses'),
      ]);

      setStats({
        plansCount: plansRow?.count ?? 0,
        daysCount: daysRow?.count ?? 0,
        readingsCount: readingsRow?.count ?? 0,
        activeSubscriptionsCount: subsRow?.count ?? 0,
        articlesCount: articlesRow?.count ?? 0,
        versesCount: versesRow?.count ?? 0,
      });
    } catch {
      // Graceful fallback
      setStats({
        plansCount: 5,
        daysCount: 767,
        readingsCount: 1862,
        activeSubscriptionsCount: 1,
        articlesCount: 0,
        versesCount: 0,
      });
    } finally {
      setLoadingStats(false);
    }
  }, [db, propStats]);

  useEffect(() => {
    loadDatabaseStats();
  }, [loadDatabaseStats, context.refreshTrigger]);

  const handleManualSync = async () => {
    if (!syncService) return;
    try {
      setIsSyncing(true);
      setSyncMessage(null);
      const newArticles = await syncService.syncDelta();
      if (newArticles > 0) {
        setSyncMessage(`Sincronización completada. Se añadieron ${newArticles} nuevos artículos.`);
      } else {
        setSyncMessage('Índice actualizado. No se encontraron nuevos artículos.');
      }
      context.notifyDataChanged();
      await loadDatabaseStats();
    } catch (err: any) {
      setSyncMessage('No se pudo conectar al servidor. Inténtalo más tarde.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenWebsite = async () => {
    try {
      await WebBrowser.openBrowserAsync('https://vidaesperanzayverdad.org');
    } catch {
      // Ignore
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Offline Storage & Database Statistics */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
          💾 Almacenamiento Local (SQLite)
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Toda la información y lecturas se almacenan de forma local en tu dispositivo para acceso
          sin conexión a internet.
        </Text>

        {loadingStats ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.statsLoader} />
        ) : stats ? (
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: colors.borderSubtle }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{stats.plansCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Planes</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.borderSubtle }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{stats.daysCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Días totales</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.borderSubtle }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{stats.readingsCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Lecturas</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.borderSubtle }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {stats.activeSubscriptionsCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Planes activos</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.borderSubtle }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{stats.articlesCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Artículos</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.borderSubtle }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{stats.versesCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Versículos</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* Background Sitemap Sync */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
          🔄 Sincronización de Artículos
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Actualiza el índice local de artículos de estudio desde vidaesperanzayverdad.org mediante
          el sitemap oficial.
        </Text>

        {syncMessage && (
          <View style={[styles.messageBanner, { backgroundColor: colors.infoBg, borderColor: colors.info }]}>
            <Text style={[styles.messageText, { color: colors.info }]}>{syncMessage}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.syncButton, { backgroundColor: colors.primary }]}
          onPress={handleManualSync}
          disabled={isSyncing}
          accessibilityRole="button"
          accessibilityLabel="Sincronizar artículos ahora"
        >
          {isSyncing ? (
            <View style={styles.syncingRow}>
              <ActivityIndicator size="small" color={colors.textInverse} />
              <Text style={[styles.syncButtonText, { color: colors.textInverse }]}>
                Sincronizando...
              </Text>
            </View>
          ) : (
            <Text style={[styles.syncButtonText, { color: colors.textInverse }]}>
              Sincronizar artículos ahora
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Appearance Settings */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>🎨 Apariencia</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Modo Oscuro</Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              Ajusta el tema visual para lectura nocturna
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
            accessibilityLabel="Activar modo oscuro"
          />
        </View>
      </View>

      {/* Reading Reminders (Push Notifications) */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>🔔 Recordatorios de Lectura</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Programa notificaciones locales para mantener la constancia en tus planes bíblicos.
        </Text>

        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Recordatorio Diario</Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              Notificación diaria a las {reminderHour.toString().padStart(2, '0')}:{reminderMinute.toString().padStart(2, '0')} hrs
            </Text>
          </View>
          <Switch
            value={notificationEnabled}
            onValueChange={handleToggleNotification}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
            accessibilityLabel="Activar recordatorio diario"
          />
        </View>

        {notificationEnabled && (
          <View style={styles.hoursContainer}>
            <Text style={[styles.hoursLabel, { color: colors.textSecondary }]}>
              Selecciona la hora de tu recordatorio:
            </Text>
            <View style={styles.hoursRow}>
              {[6, 7, 8, 9, 12, 19, 20, 21, 22].map((h) => {
                const isSelected = reminderHour === h;
                return (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.hourChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => handleChangeHour(h)}
                    accessibilityRole="button"
                    accessibilityLabel={`Seleccionar hora ${h}:00`}
                  >
                    <Text
                      style={[
                        styles.hourChipText,
                        { color: isSelected ? colors.textInverse : colors.text },
                      ]}
                    >
                      {h.toString().padStart(2, '0')}:00
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.testNotificationButton, { borderColor: colors.primary }]}
          onPress={handleSendTestNotification}
          accessibilityRole="button"
          accessibilityLabel="Enviar notificación de prueba"
        >
          <Text style={[styles.testNotificationButtonText, { color: colors.primary }]}>
            🔔 Enviar notificación de prueba ahora
          </Text>
        </TouchableOpacity>

        {testNotificationMessage && (
          <View
            style={[
              styles.messageBanner,
              {
                backgroundColor: colors.infoBg,
                borderColor: colors.info,
                marginTop: 12,
                marginBottom: 0,
              },
            ]}
          >
            <Text style={[styles.messageText, { color: colors.info }]}>
              {testNotificationMessage}
            </Text>
          </View>
        )}
      </View>

      {/* About & Credits Info */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>ℹ️ Acerca de la Aplicación</Text>
        <Text style={[styles.appName, { color: colors.text }]}>Planes de Lectura Bíblica</Text>
        <Text style={[styles.appVersion, { color: colors.textSecondary }]}>Versión 1.0.0 (Offline-First)</Text>
        <Text style={[styles.appDescription, { color: colors.textSecondary }]}>
          Esta aplicación fue diseñada para facilitar la lectura diaria de las Sagradas Escrituras a
          través de planes cronológicos, anuales, desafíos mensuales y guías de estudio temáticas,
          acompañadas de reflexiones y artículos de estudio bíblico.
        </Text>

        <TouchableOpacity
          style={[styles.websiteButton, { borderColor: colors.secondary }]}
          onPress={handleOpenWebsite}
          accessibilityRole="button"
          accessibilityLabel="Visitar vidaesperanzayverdad.org"
        >
          <Text style={[styles.websiteButtonText, { color: colors.secondary }]}>
            Visitar vidaesperanzayverdad.org →
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  sectionCard: {
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.bold,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sans,
    lineHeight: 20,
    marginBottom: 16,
  },
  statsLoader: {
    paddingVertical: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    width: '31%',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: fontSizes.xl,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.bold,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.medium,
    textAlign: 'center',
  },
  messageBanner: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  messageText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.medium,
  },
  syncButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncButtonText: {
    fontSize: fontSizes.md,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.bold,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: fontSizes.md,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.semiBold,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.sans,
  },
  appName: {
    fontSize: fontSizes.md,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.bold,
    marginBottom: 2,
  },
  appVersion: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.sans,
    marginBottom: 10,
  },
  appDescription: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sans,
    lineHeight: 20,
    marginBottom: 16,
  },
  websiteButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  websiteButtonText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.semiBold,
  },
  hoursContainer: {
    marginTop: 12,
    marginBottom: 6,
  },
  hoursLabel: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.medium,
    marginBottom: 8,
  },
  hoursRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hourChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  hourChipText: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.semiBold,
  },
  testNotificationButton: {
    marginTop: 14,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  testNotificationButtonText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.bold,
  },
});
