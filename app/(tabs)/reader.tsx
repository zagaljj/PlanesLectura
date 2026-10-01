import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppContext, useAppTheme } from '../../src/presentation/context/AppContext';
import { GetPassageVerses } from '../../src/domain/usecases/GetPassageVerses';
import { ToggleReadingProgress } from '../../src/domain/usecases/ToggleReadingProgress';
import { BibleVerse, PlanReading } from '../../src/domain/entities';
import { fontFamilies, fontSizes, fontWeights, lineHeights } from '../../src/presentation/theme/typography';
import { lightColors, darkColors } from '../../src/presentation/theme/colors';

export interface ReaderScreenProps {
  reading?: PlanReading | null;
  subscriptionId?: string;
  isCompleted?: boolean;
  getPassageVersesUseCase?: GetPassageVerses;
  toggleReadingProgressUseCase?: ToggleReadingProgress;
}

export default function ReaderScreen({
  reading: propReading,
  subscriptionId: propSubscriptionId,
  isCompleted: propIsCompleted,
  getPassageVersesUseCase: propGetVerses,
  toggleReadingProgressUseCase: propToggleProgress,
}: ReaderScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    readingId?: string;
    subscriptionId?: string;
    citationLabel?: string;
    bookId?: string;
    bookName?: string;
    startChapter?: string;
    startVerse?: string;
    endChapter?: string;
    endVerse?: string;
    isCompleted?: string;
  }>();

  const context = useAppContext();
  const themeContext = useAppTheme();

  const getPassageVersesUseCase = propGetVerses ?? context.getPassageVersesUseCase;
  const toggleReadingProgressUseCase = propToggleProgress ?? context.toggleReadingProgressUseCase;

  // Local font modifier and theme override
  const [localFontSizeModifier, setLocalFontSizeModifier] = useState<number>(context.fontSizeModifier);
  const [isLocalDarkMode, setIsLocalDarkMode] = useState<boolean>(themeContext.isDarkMode);

  // Active reading resolution: prop -> params -> context
  const activeReading: PlanReading | null = useMemo(() => {
    if (propReading !== undefined) {
      return propReading;
    }

    if (params.readingId && params.citationLabel) {
      try {
        return new PlanReading({
          id: params.readingId,
          dayId: 'params-day',
          orderIndex: 0,
          bookId: params.bookId || 'GEN',
          bookName: params.bookName || 'Génesis',
          startChapter: parseInt(params.startChapter || '1', 10),
          startVerse: params.startVerse ? parseInt(params.startVerse, 10) : undefined,
          endChapter: parseInt(params.endChapter || params.startChapter || '1', 10),
          endVerse: params.endVerse ? parseInt(params.endVerse, 10) : undefined,
          citationLabel: params.citationLabel,
        });
      } catch {
        // Fall through to context
      }
    }

    return context.selectedReading;
  }, [propReading, params, context.selectedReading]);

  const activeSubscriptionId =
    propSubscriptionId ??
    params.subscriptionId ??
    context.selectedSubscriptionId ??
    'default-sub';

  const initialCompleted =
    propIsCompleted !== undefined
      ? propIsCompleted
      : params.isCompleted === 'true';

  const [isCompleted, setIsCompleted] = useState<boolean>(initialCompleted);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (propIsCompleted !== undefined) {
      setIsCompleted(propIsCompleted);
    } else if (params.isCompleted !== undefined) {
      setIsCompleted(params.isCompleted === 'true');
    }
  }, [propIsCompleted, params.isCompleted]);

  // Load verses when activeReading changes
  useEffect(() => {
    let isMounted = true;

    async function fetchVerses() {
      if (!activeReading || !getPassageVersesUseCase) {
        setVerses([]);
        return;
      }
      try {
        setLoading(true);
        const result = await getPassageVersesUseCase.execute(activeReading);
        if (isMounted) {
          setVerses(result);
        }
      } catch {
        if (isMounted) {
          setVerses([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchVerses();

    return () => {
      isMounted = false;
    };
  }, [activeReading, getPassageVersesUseCase]);

  const colors = isLocalDarkMode ? darkColors : lightColors;

  const handleDecreaseFont = () => {
    setLocalFontSizeModifier((prev) => Math.max(-4, prev - 2));
  };

  const handleIncreaseFont = () => {
    setLocalFontSizeModifier((prev) => Math.min(12, prev + 2));
  };

  const handleToggleTheme = () => {
    setIsLocalDarkMode((prev) => !prev);
  };

  const handleToggleCompleted = async () => {
    if (!activeReading || !toggleReadingProgressUseCase) return;

    const previousState = isCompleted;
    setIsCompleted(!previousState);

    try {
      await toggleReadingProgressUseCase.execute(activeSubscriptionId, activeReading.id);
      context.notifyDataChanged();
    } catch {
      setIsCompleted(previousState);
    }
  };

  if (!activeReading) {
    return (
      <View style={[styles.container, styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Text style={styles.emptyIcon}>📜</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          Ninguna lectura seleccionada
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Selecciona una lectura desde la pestaña Hoy o el catálogo de Planes para leer los pasajes
          bíblicos sin conexión.
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(tabs)/today')}
          accessibilityRole="button"
          accessibilityLabel="Ir a lecturas de hoy"
        >
          <Text style={[styles.primaryButtonText, { color: colors.textInverse }]}>
            Ir a Lecturas de Hoy
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const baseVerseFontSize = fontSizes.lg + localFontSizeModifier;
  const baseVerseLineHeight = lineHeights.readerVerse + localFontSizeModifier * 1.5;

  // Group verses by chapter for chapter headers
  const versesByChapter = useMemo(() => {
    const map = new Map<number, BibleVerse[]>();
    for (const v of verses) {
      const list = map.get(v.chapter) ?? [];
      list.push(v);
      map.set(v.chapter, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [verses]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Controls Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.toolbarLeft}>
          <Text style={[styles.citationHeading, { color: colors.text }]}>
            {activeReading.citationLabel}
          </Text>
        </View>

        <View style={styles.toolbarRight}>
          {/* Font Controls */}
          <TouchableOpacity
            testID="font-decrease-btn"
            style={[styles.toolButton, { backgroundColor: colors.borderSubtle }]}
            onPress={handleDecreaseFont}
            accessibilityRole="button"
            accessibilityLabel="Disminuir tamaño de letra"
          >
            <Text style={[styles.toolButtonText, { color: colors.text }]}>A-</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="font-increase-btn"
            style={[styles.toolButton, { backgroundColor: colors.borderSubtle }]}
            onPress={handleIncreaseFont}
            accessibilityRole="button"
            accessibilityLabel="Aumentar tamaño de letra"
          >
            <Text style={[styles.toolButtonText, { color: colors.text }]}>A+</Text>
          </TouchableOpacity>

          {/* Theme Toggle Button */}
          <TouchableOpacity
            testID="theme-toggle-btn"
            style={[styles.toolButton, { backgroundColor: colors.borderSubtle }]}
            onPress={handleToggleTheme}
            accessibilityRole="button"
            accessibilityLabel={`Cambiar a tema ${isLocalDarkMode ? 'claro' : 'oscuro'}`}
          >
            <Text style={styles.themeIcon}>{isLocalDarkMode ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reader Content (Continuous Scroll) */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Cargando pasaje bíblico...
            </Text>
          </View>
        ) : verses.length > 0 ? (
          versesByChapter.map(([chapterNum, chapterVerses]) => (
            <View key={chapterNum} style={styles.chapterBlock}>
              <Text style={[styles.chapterHeader, { color: colors.primary }]}>
                {activeReading.bookName} {chapterNum}
              </Text>
              <View style={styles.versesContainer}>
                {chapterVerses.map((verse) => (
                  <Text
                    key={`${verse.chapter}-${verse.verse}`}
                    style={[
                      styles.verseParagraph,
                      {
                        color: colors.text,
                        fontSize: baseVerseFontSize,
                        lineHeight: baseVerseLineHeight,
                      },
                    ]}
                  >
                    <Text style={[styles.verseNumber, { color: colors.secondary }]}>
                      {verse.verse}{' '}
                    </Text>
                    {verse.text}
                  </Text>
                ))}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.fallbackPassageContainer}>
            <Text style={[styles.chapterHeader, { color: colors.primary }]}>
              {activeReading.citationLabel}
            </Text>
            <Text style={[styles.fallbackPassageText, { color: colors.textSecondary, fontSize: baseVerseFontSize }]}>
              Lectura asignada: {activeReading.citationLabel} del libro de {activeReading.bookName}.
            </Text>
            <Text style={[styles.offlineHint, { color: colors.textMuted }]}>
              Los versículos completos estarán disponibles en la base de datos local para lectura
              100% offline.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Mark As Read Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.markAsReadButton,
            isCompleted
              ? [styles.completedButton, { backgroundColor: colors.successBg, borderColor: colors.success }]
              : [styles.incompleteButton, { backgroundColor: colors.primary }],
          ]}
          onPress={handleToggleCompleted}
          accessibilityRole="button"
          accessibilityLabel={isCompleted ? 'Marcar como no leído' : 'Marcar como leído'}
        >
          <Text
            style={[
              styles.markAsReadText,
              isCompleted ? { color: colors.success } : { color: colors.textInverse },
            ]}
          >
            {isCompleted ? '✓ Leído' : 'Marcar como leído'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  toolbarLeft: {
    flex: 1,
    marginRight: 10,
  },
  citationHeading: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.bold,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolButton: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
  },
  toolButtonText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.bold,
  },
  themeIcon: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 90,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: fontSizes.md,
    fontFamily: fontFamilies.sans,
  },
  chapterBlock: {
    marginBottom: 28,
  },
  chapterHeader: {
    fontSize: fontSizes.xxl,
    fontFamily: fontFamilies.serif,
    fontWeight: fontWeights.bold,
    marginBottom: 16,
    textAlign: 'center',
  },
  versesContainer: {
    gap: 12,
  },
  verseParagraph: {
    fontFamily: fontFamilies.serif,
  },
  verseNumber: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.bold,
  },
  fallbackPassageContainer: {
    padding: 20,
    alignItems: 'center',
  },
  fallbackPassageText: {
    fontFamily: fontFamilies.serif,
    lineHeight: 26,
    textAlign: 'center',
    marginTop: 12,
  },
  offlineHint: {
    marginTop: 16,
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sans,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  markAsReadButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  incompleteButton: {
    borderColor: 'transparent',
  },
  completedButton: {},
  markAsReadText: {
    fontSize: fontSizes.md,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.bold,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 54,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: fontSizes.xxl,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.bold,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: fontSizes.md,
    fontFamily: fontFamilies.sans,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    fontSize: fontSizes.md,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.bold,
  },
});
