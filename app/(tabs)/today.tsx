import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  ReadingCard,
  ArticleCard,
  ReflectionQuestionBlock,
  PlanProgressBadge,
} from '../../src/presentation/components';
import { useAppContext, useAppTheme } from '../../src/presentation/context/AppContext';
import {
  GetActivePlansWithTodayReadings,
  ActivePlanToday,
} from '../../src/domain/usecases/GetActivePlansWithTodayReadings';
import { ToggleReadingProgress } from '../../src/domain/usecases/ToggleReadingProgress';
import { fontFamilies, fontSizes, fontWeights } from '../../src/presentation/theme/typography';
import { PlanReading } from '../../src/domain/entities';

export interface TodayScreenProps {
  getActivePlansUseCase?: GetActivePlansWithTodayReadings;
  toggleReadingProgressUseCase?: ToggleReadingProgress;
}

export default function TodayScreen({
  getActivePlansUseCase: propGetActivePlans,
  toggleReadingProgressUseCase: propToggleProgress,
}: TodayScreenProps) {
  const router = useRouter();
  const context = useAppContext();
  const { colors } = useAppTheme();

  const getActivePlansUseCase = propGetActivePlans ?? context.getActivePlansUseCase;
  const toggleReadingProgressUseCase = propToggleProgress ?? context.toggleReadingProgressUseCase;

  const [activePlans, setActivePlans] = useState<ActivePlanToday[]>([]);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const loadActivePlans = useCallback(async () => {
    if (!getActivePlansUseCase) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const plans = await getActivePlansUseCase.execute();
      setActivePlans(plans);
      setSelectedPlanIndex((prev) => (prev >= plans.length && plans.length > 0 ? 0 : prev));
    } catch {
      // Offline fallback: keep current state
    } finally {
      setLoading(false);
    }
  }, [getActivePlansUseCase]);

  useEffect(() => {
    loadActivePlans();
  }, [loadActivePlans, context.refreshTrigger]);

  const currentPlanData: ActivePlanToday | undefined = activePlans[selectedPlanIndex];

  const handleToggleReading = async (subscriptionId: string, readingId: string) => {
    if (!toggleReadingProgressUseCase) return;

    // Optimistic UI update
    setActivePlans((prevPlans) =>
      prevPlans.map((planData) => {
        if (planData.subscription.id !== subscriptionId) return planData;
        return {
          ...planData,
          readings: planData.readings.map((r) =>
            r.reading.id === readingId ? { ...r, isCompleted: !r.isCompleted } : r
          ),
        };
      })
    );

    try {
      await toggleReadingProgressUseCase.execute(subscriptionId, readingId);
      context.notifyDataChanged();
    } catch {
      // Revert if error
      loadActivePlans();
    }
  };

  const handleReadPress = (reading: PlanReading, isCompleted: boolean, subscriptionId: string) => {
    context.setSelectedReading(reading, subscriptionId);
    router.push({
      pathname: '/(tabs)/reader',
      params: {
        readingId: reading.id,
        subscriptionId,
        citationLabel: reading.citationLabel,
        bookId: reading.bookId,
        bookName: reading.bookName,
        startChapter: String(reading.startChapter),
        startVerse: reading.startVerse !== undefined ? String(reading.startVerse) : undefined,
        endChapter: String(reading.endChapter),
        endVerse: reading.endVerse !== undefined ? String(reading.endVerse) : undefined,
        isCompleted: String(isCompleted),
      },
    });
  };

  const handleArticlePress = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      // Handle browser error
    }
  };

  const handleFallbackSearchPress = async (firstReading?: PlanReading) => {
    const searchQuery = firstReading
      ? `${firstReading.bookName} ${firstReading.startChapter}`
      : 'estudio biblico';
    const encoded = encodeURIComponent(searchQuery);
    const searchUrl = `https://vidaesperanzayverdad.org/search/?q=${encoded}`;
    try {
      await WebBrowser.openBrowserAsync(searchUrl);
    } catch {
      // Handle browser error
    }
  };

  if (loading && activePlans.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Cargando lecturas de hoy...
        </Text>
      </View>
    );
  }

  if (activePlans.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📖</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No tienes planes activos</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Elige un plan de lectura anual, mensual o temático para comenzar tus lecturas diarias de
            la Biblia.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/plans')}
            accessibilityRole="button"
            accessibilityLabel="Explorar catálogo de planes"
          >
            <Text style={[styles.primaryButtonText, { color: colors.textInverse }]}>
              Explorar catálogo de planes
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { subscription, plan, day, readings, articles } = currentPlanData;
  const firstReading = readings.length > 0 ? readings[0].reading : undefined;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Plans Switcher Bar (Tabs) */}
        {activePlans.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.switcherContainer}
            contentContainerStyle={styles.switcherContent}
          >
            {activePlans.map((activePlan, index) => {
              const isSelected = index === selectedPlanIndex;
              return (
                <TouchableOpacity
                  key={activePlan.subscription.id}
                  style={[
                    styles.planChip,
                    isSelected
                      ? [styles.planChipSelected, { backgroundColor: colors.primary }]
                      : [styles.planChipUnselected, { backgroundColor: colors.surface, borderColor: colors.border }],
                  ]}
                  onPress={() => setSelectedPlanIndex(index)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.planChipText,
                      isSelected
                        ? [styles.planChipTextSelected, { color: colors.textInverse }]
                        : [styles.planChipTextUnselected, { color: colors.textSecondary }],
                    ]}
                  >
                    {activePlan.plan.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Plan Header & Day Info */}
        <View style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.planHeaderRow}>
            <View style={styles.planTitleContainer}>
              <Text style={[styles.planTitle, { color: colors.primary }]}>{plan.title}</Text>
              <Text style={[styles.archetypeBadgeText, { color: colors.textSecondary }]}>
                {plan.archetype === 'annual'
                  ? 'Plan Anual'
                  : plan.archetype === 'monthly'
                  ? 'Desafío Mensual'
                  : 'Guía Temática'}
              </Text>
            </View>
            <PlanProgressBadge
              completedDays={subscription.currentDayNumber - 1}
              totalDays={plan.totalDays}
              size="small"
            />
          </View>

          <View style={styles.dayTitleRow}>
            <Text style={[styles.dayTitle, { color: colors.text }]}>
              {day.title || `Día ${day.dayNumber}`}
            </Text>
          </View>

          {day.devotionalNotes && (
            <Text style={[styles.devotionalNotes, { color: colors.textSecondary }]}>
              {day.devotionalNotes}
            </Text>
          )}
        </View>

        {/* Today's Assigned Readings */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Lecturas de hoy</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            {readings.filter((r) => r.isCompleted).length}/{readings.length} completadas
          </Text>
        </View>

        {readings.map((item) => (
          <ReadingCard
            key={item.reading.id}
            citationLabel={item.reading.citationLabel}
            orderIndex={item.reading.orderIndex}
            bookName={item.reading.bookName}
            isCompleted={item.isCompleted}
            onToggle={() => handleToggleReading(subscription.id, item.reading.id)}
            onReadPress={() => handleReadPress(item.reading, item.isCompleted, subscription.id)}
          />
        ))}

        {/* Reflection Questions (Thematic Guides) */}
        {day.reflectionQuestions && day.reflectionQuestions.length > 0 && (
          <View style={styles.reflectionSection}>
            <ReflectionQuestionBlock
              questions={[...day.reflectionQuestions]}
              title="Preguntas de reflexión"
              defaultExpanded={true}
            />
          </View>
        )}

        {/* Related Study Articles */}
        <View style={styles.articlesSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Artículos de estudio relacionados
          </Text>

          {articles && articles.length > 0 ? (
            articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onPress={() => handleArticlePress(article.url)}
              />
            ))
          ) : (
            <View style={[styles.fallbackSearchCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
                No hay artículos descargados localmente para este pasaje.
              </Text>
              <TouchableOpacity
                style={[styles.fallbackButton, { backgroundColor: colors.secondary }]}
                onPress={() => handleFallbackSearchPress(firstReading)}
                accessibilityRole="button"
                accessibilityLabel="Buscar artículos en vidaesperanzayverdad.org"
              >
                <Text style={[styles.fallbackButtonText, { color: colors.textInverse }]}>
                  🔍 Buscar artículos en vidaesperanzayverdad.org
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: fontSizes.md,
    fontFamily: fontFamilies.sans,
  },
  switcherContainer: {
    marginBottom: 16,
  },
  switcherContent: {
    flexDirection: 'row',
    gap: 8,
  },
  planChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  planChipSelected: {},
  planChipUnselected: {},
  planChipText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sans,
  },
  planChipTextSelected: {
    fontWeight: fontWeights.bold,
  },
  planChipTextUnselected: {
    fontWeight: fontWeights.medium,
  },
  planCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  planTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  planTitle: {
    fontSize: fontSizes.xl,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.bold,
  },
  archetypeBadgeText: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.sans,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  dayTitleRow: {
    marginTop: 4,
  },
  dayTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.semiBold,
  },
  devotionalNotes: {
    marginTop: 8,
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sans,
    lineHeight: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.bold,
  },
  sectionSubtitle: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.sans,
  },
  reflectionSection: {
    marginTop: 16,
  },
  articlesSection: {
    marginTop: 20,
  },
  fallbackSearchCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  fallbackText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sans,
    textAlign: 'center',
    marginBottom: 12,
  },
  fallbackButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  fallbackButtonText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.semiBold,
  },
  emptyContainer: {
    flex: 1,
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
