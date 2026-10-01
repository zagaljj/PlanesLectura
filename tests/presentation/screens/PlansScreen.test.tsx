import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PlansScreen from '../../../app/(tabs)/plans';
import { ReadingPlan, PlanSubscription } from '../../../src/domain/entities';
import { PlanCatalogResult } from '../../../src/domain/usecases/GetPlanCatalog';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
}));

describe('PlansScreen', () => {
  const planAnnual = new ReadingPlan({
    id: 'plan-chronological',
    title: 'Plan Cronológico',
    description: 'Lectura en orden histórico',
    archetype: 'annual',
    totalDays: 365,
  });

  const subAnnual = new PlanSubscription({
    id: 'sub-chrono',
    planId: 'plan-chronological',
    startedAt: '2026-10-01T00:00:00.000Z',
    isActive: true,
    currentDayNumber: 10,
  });

  const planMonthly = new ReadingPlan({
    id: 'plan-ued',
    title: 'Una Escritura Diaria',
    description: '30 días de meditación',
    archetype: 'monthly',
    totalDays: 30,
  });

  const planThematic = new ReadingPlan({
    id: 'plan-pentecost',
    title: 'Hechos 2 - Pentecostés',
    description: 'Guía devocional de 7 días',
    archetype: 'thematic',
    totalDays: 7,
  });

  const mockCatalogResult: PlanCatalogResult = {
    annual: [
      {
        plan: planAnnual,
        isSubscribed: true,
        subscription: subAnnual,
      },
    ],
    monthly: [
      {
        plan: planMonthly,
        isSubscribed: false,
        subscription: null,
      },
    ],
    thematic: [
      {
        plan: planThematic,
        isSubscribed: false,
        subscription: null,
      },
    ],
    all: [
      {
        plan: planAnnual,
        isSubscribed: true,
        subscription: subAnnual,
      },
      {
        plan: planMonthly,
        isSubscribed: false,
        subscription: null,
      },
      {
        plan: planThematic,
        isSubscribed: false,
        subscription: null,
      },
    ],
  };

  let mockGetPlanCatalogUseCase: any;
  let mockSubscribeToPlanUseCase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPlanCatalogUseCase = {
      execute: jest.fn().mockResolvedValue(mockCatalogResult),
    };
    mockSubscribeToPlanUseCase = {
      subscribe: jest.fn().mockResolvedValue(subAnnual),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('should render catalog of plans grouped by archetype', async () => {
    const { getByText } = await render(
      <PlansScreen
        getPlanCatalogUseCase={mockGetPlanCatalogUseCase}
        subscribeToPlanUseCase={mockSubscribeToPlanUseCase}
      />
    );

    await waitFor(() => {
      expect(getByText('Plan Cronológico')).toBeTruthy();
      expect(getByText('Una Escritura Diaria')).toBeTruthy();
      expect(getByText('Hechos 2 - Pentecostés')).toBeTruthy();
    });

    // Check archetype headings
    expect(getByText('Planes Anuales (365 días)')).toBeTruthy();
    expect(getByText('Desafíos Mensuales (30 días)')).toBeTruthy();
    expect(getByText('Guías de Estudio Temáticas')).toBeTruthy();
  });

  it('should subscribe to an unsubscribed plan when "+ Empezar Plan" is pressed', async () => {
    const { getAllByText } = await render(
      <PlansScreen
        getPlanCatalogUseCase={mockGetPlanCatalogUseCase}
        subscribeToPlanUseCase={mockSubscribeToPlanUseCase}
      />
    );

    await waitFor(() => {
      expect(getAllByText('+ Empezar Plan').length).toBeGreaterThan(0);
    });

    const startButtons = getAllByText('+ Empezar Plan');
    await fireEvent.press(startButtons[0]);

    expect(mockSubscribeToPlanUseCase.subscribe).toHaveBeenCalledWith('plan-ued');
  });

  it('should unsubscribe from an active plan when "Pausar plan" is pressed', async () => {
    const { getByText } = await render(
      <PlansScreen
        getPlanCatalogUseCase={mockGetPlanCatalogUseCase}
        subscribeToPlanUseCase={mockSubscribeToPlanUseCase}
      />
    );

    await waitFor(() => {
      expect(getByText('Pausar plan')).toBeTruthy();
    });

    const pauseButton = getByText('Pausar plan');
    await fireEvent.press(pauseButton);

    expect(mockSubscribeToPlanUseCase.unsubscribe).toHaveBeenCalledWith('plan-chronological');
  });

  it('should navigate to today screen when "Continuar lectura →" is pressed', async () => {
    const { getByText } = await render(
      <PlansScreen
        getPlanCatalogUseCase={mockGetPlanCatalogUseCase}
        subscribeToPlanUseCase={mockSubscribeToPlanUseCase}
      />
    );

    await waitFor(() => {
      expect(getByText('Continuar lectura →')).toBeTruthy();
    });

    const continueBtn = getByText('Continuar lectura →');
    await fireEvent.press(continueBtn);

    expect(mockPush).toHaveBeenCalledWith('/(tabs)/today');
  });

  it('should filter plans when archetype filter pills are tapped', async () => {
    const { getByText, queryByText } = await render(
      <PlansScreen
        getPlanCatalogUseCase={mockGetPlanCatalogUseCase}
        subscribeToPlanUseCase={mockSubscribeToPlanUseCase}
      />
    );

    await waitFor(() => {
      expect(getByText('Todos (3)')).toBeTruthy();
    });

    // Press "Anuales (1)" pill
    const annualPill = getByText('Anuales (1)');
    await fireEvent.press(annualPill);

    await waitFor(() => {
      expect(getByText('Plan Cronológico')).toBeTruthy();
      expect(queryByText('Una Escritura Diaria')).toBeNull();
    });
  });
});
