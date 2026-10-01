import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppContext, useAppTheme } from '../../src/presentation/context/AppContext';
import { GetPlanCatalog, PlanCatalogResult, PlanCatalogItem } from '../../src/domain/usecases/GetPlanCatalog';
import { SubscribeToPlan } from '../../src/domain/usecases/SubscribeToPlan';
import { PlanProgressBadge } from '../../src/presentation/components/PlanProgressBadge';
import { fontFamilies, fontSizes, fontWeights } from '../../src/presentation/theme/typography';
import { PlanArchetype } from '../../src/domain/entities/ReadingPlan';

export interface PlansScreenProps {
  getPlanCatalogUseCase?: GetPlanCatalog;
  subscribeToPlanUseCase?: SubscribeToPlan;
}

type FilterCategory = 'all' | 'annual' | 'monthly' | 'thematic';

export default function PlansScreen({
  getPlanCatalogUseCase: propGetCatalog,
  subscribeToPlanUseCase: propSubscribe,
}: PlansScreenProps) {
  const router = useRouter();
  const context = useAppContext();
  const { colors } = useAppTheme();

  const getPlanCatalogUseCase = propGetCatalog ?? context.getPlanCatalogUseCase;
  const subscribeToPlanUseCase = propSubscribe ?? context.subscribeToPlanUseCase;

  const [catalog, setCatalog] = useState<PlanCatalogResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [actionLoadingPlanId, setActionLoadingPlanId] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    if (!getPlanCatalogUseCase) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const result = await getPlanCatalogUseCase.execute();
      setCatalog(result);
    } catch {
      // Offline fallback: keep existing catalog
    } finally {
      setLoading(false);
    }
  }, [getPlanCatalogUseCase]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog, context.refreshTrigger]);

  const handleSubscribe = async (planId: string) => {
    if (!subscribeToPlanUseCase) return;
    try {
      setActionLoadingPlanId(planId);
      await subscribeToPlanUseCase.subscribe(planId);
      context.notifyDataChanged();
      await loadCatalog();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo iniciar el plan');
    } finally {
      setActionLoadingPlanId(null);
    }
  };

  const handleUnsubscribe = async (planId: string) => {
    if (!subscribeToPlanUseCase) return;
    try {
      setActionLoadingPlanId(planId);
      await subscribeToPlanUseCase.unsubscribe(planId);
      context.notifyDataChanged();
      await loadCatalog();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo pausar el plan');
    } finally {
      setActionLoadingPlanId(null);
    }
  };

  const renderPlanCard = (item: PlanCatalogItem) => {
    const { plan, isSubscribed, subscription } = item;
    const isActionLoading = actionLoadingPlanId === plan.id;

    return (
      <View
        key={plan.id}
        style={[
          styles.planCard,
          { backgroundColor: colors.surface, borderColor: isSubscribed ? colors.primaryLight : colors.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleArea}>
            <Text style={[styles.planTitle, { color: colors.text }]}>{plan.title}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.archetypeBadge, { backgroundColor: colors.borderSubtle }]}>
                <Text style={[styles.archetypeBadgeText, { color: colors.textSecondary }]}>
                  {plan.archetype === 'annual'
                    ? '📅 Anual'
                    : plan.archetype === 'monthly'
                    ? '🌙 Mensual'
                    : '📖 Temático'}
                </Text>
              </View>
              <View style={[styles.daysBadge, { backgroundColor: colors.infoBg }]}>
                <Text style={[styles.daysBadgeText, { color: colors.info }]}>
                  {plan.totalDays} {plan.totalDays === 1 ? 'día' : 'días'}
                </Text>
              </View>
            </View>
          </View>

          {isSubscribed && subscription && (
            <PlanProgressBadge
              completedDays={subscription.currentDayNumber - 1}
              totalDays={plan.totalDays}
              size="medium"
            />
          )}
        </View>

        <Text style={[styles.planDescription, { color: colors.textSecondary }]}>
          {plan.description}
        </Text>

        <View style={styles.cardFooter}>
          {isSubscribed ? (
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.primaryActionButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(tabs)/today')}
                accessibilityRole="button"
                accessibilityLabel={`Continuar ${plan.title}`}
              >
                <Text style={[styles.primaryActionText, { color: colors.textInverse }]}>
                  Continuar lectura →
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryActionButton, { borderColor: colors.border }]}
                onPress={() => handleUnsubscribe(plan.id)}
                disabled={isActionLoading}
                accessibilityRole="button"
                accessibilityLabel={`Pausar plan ${plan.title}`}
              >
                {isActionLoading ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : (
                  <Text style={[styles.secondaryActionText, { color: colors.textSecondary }]}>
                    Pausar plan
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.subscribeButton, { backgroundColor: colors.secondary }]}
              onPress={() => handleSubscribe(plan.id)}
              disabled={isActionLoading}
              accessibilityRole="button"
              accessibilityLabel={`Empezar plan ${plan.title}`}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text style={[styles.subscribeButtonText, { color: colors.textInverse }]}>
                  + Empezar Plan
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const getFilteredItems = (items: PlanCatalogItem[]) => {
    if (selectedCategory === 'all') return items;
    return items.filter((item) => item.plan.archetype === selectedCategory);
  };

  if (loading && !catalog) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Cargando catálogo de planes...
        </Text>
      </View>
    );
  }

  const items = catalog ? catalog.all : [];
  const filteredItems = getFilteredItems(items);

  const annualItems = catalog ? catalog.annual : [];
  const monthlyItems = catalog ? catalog.monthly : [];
  const thematicItems = catalog ? catalog.thematic : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Category Filter Pills */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              selectedCategory === 'all'
                ? [styles.filterPillActive, { backgroundColor: colors.primary }]
                : [styles.filterPillInactive, { backgroundColor: colors.borderSubtle }],
            ]}
            onPress={() => setSelectedCategory('all')}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedCategory === 'all' }}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedCategory === 'all'
                  ? [styles.filterPillTextActive, { color: colors.textInverse }]
                  : [styles.filterPillTextInactive, { color: colors.textSecondary }],
              ]}
            >
              Todos ({items.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              selectedCategory === 'annual'
                ? [styles.filterPillActive, { backgroundColor: colors.primary }]
                : [styles.filterPillInactive, { backgroundColor: colors.borderSubtle }],
            ]}
            onPress={() => setSelectedCategory('annual')}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedCategory === 'annual' }}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedCategory === 'annual'
                  ? [styles.filterPillTextActive, { color: colors.textInverse }]
                  : [styles.filterPillTextInactive, { color: colors.textSecondary }],
              ]}
            >
              Anuales ({annualItems.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              selectedCategory === 'monthly'
                ? [styles.filterPillActive, { backgroundColor: colors.primary }]
                : [styles.filterPillInactive, { backgroundColor: colors.borderSubtle }],
            ]}
            onPress={() => setSelectedCategory('monthly')}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedCategory === 'monthly' }}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedCategory === 'monthly'
                  ? [styles.filterPillTextActive, { color: colors.textInverse }]
                  : [styles.filterPillTextInactive, { color: colors.textSecondary }],
              ]}
            >
              Mensuales ({monthlyItems.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              selectedCategory === 'thematic'
                ? [styles.filterPillActive, { backgroundColor: colors.primary }]
                : [styles.filterPillInactive, { backgroundColor: colors.borderSubtle }],
            ]}
            onPress={() => setSelectedCategory('thematic')}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedCategory === 'thematic' }}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedCategory === 'thematic'
                  ? [styles.filterPillTextActive, { color: colors.textInverse }]
                  : [styles.filterPillTextInactive, { color: colors.textSecondary }],
              ]}
            >
              Temáticos ({thematicItems.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Plans List */}
      <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
        {selectedCategory === 'all' ? (
          <>
            {annualItems.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>Planes Anuales (365 días)</Text>
                <Text style={[styles.sectionSubheading, { color: colors.textMuted }]}>
                  Lectura completa de las Sagradas Escrituras a lo largo del año.
                </Text>
                {annualItems.map(renderPlanCard)}
              </View>
            )}

            {monthlyItems.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>Desafíos Mensuales (30 días)</Text>
                <Text style={[styles.sectionSubheading, { color: colors.textMuted }]}>
                  Enfoques temáticos y versículos seleccionados para meditación diaria.
                </Text>
                {monthlyItems.map(renderPlanCard)}
              </View>
            )}

            {thematicItems.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>Guías de Estudio Temáticas</Text>
                <Text style={[styles.sectionSubheading, { color: colors.textMuted }]}>
                  Estudios bíblicos profundos con preguntas de reflexión y artículos doctrinales.
                </Text>
                {thematicItems.map(renderPlanCard)}
              </View>
            )}
          </>
        ) : (
          filteredItems.map(renderPlanCard)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  filterBar: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterPillActive: {},
  filterPillInactive: {},
  filterPillText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sans,
  },
  filterPillTextActive: {
    fontWeight: fontWeights.bold,
  },
  filterPillTextInactive: {
    fontWeight: fontWeights.medium,
  },
  scrollList: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionBlock: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.bold,
    marginBottom: 4,
  },
  sectionSubheading: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.sans,
    marginBottom: 12,
  },
  planCard: {
    borderRadius: 14,
    padding: 18,
    marginVertical: 8,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleArea: {
    flex: 1,
    marginRight: 10,
  },
  planTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.bold,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  archetypeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  archetypeBadgeText: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.medium,
  },
  daysBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  daysBadgeText: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.bold,
  },
  planDescription: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sans,
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    marginTop: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryActionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.bold,
  },
  secondaryActionButton: {
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.medium,
  },
  subscribeButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeButtonText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.bold,
  },
});
