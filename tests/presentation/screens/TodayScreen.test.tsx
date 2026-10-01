import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';
import TodayScreen from '../../../app/(tabs)/today';
import {
  ReadingPlan,
  PlanDay,
  PlanReading,
  PlanSubscription,
  StudyArticle,
} from '../../../src/domain/entities';
import { ActivePlanToday } from '../../../src/domain/usecases/GetActivePlansWithTodayReadings';

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

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn().mockResolvedValue({ type: 'opened' }),
}));

describe('TodayScreen', () => {
  const planAnnual = new ReadingPlan({
    id: 'plan-chronological',
    title: 'Plan Cronológico',
    description: 'Lectura en orden cronológico',
    archetype: 'annual',
    totalDays: 365,
  });

  const subAnnual = new PlanSubscription({
    id: 'sub-chronological',
    planId: 'plan-chronological',
    startedAt: '2026-10-01T00:00:00.000Z',
    isActive: true,
    currentDayNumber: 1,
  });

  const dayAnnual = new PlanDay({
    id: 'day-chrono-1',
    planId: 'plan-chronological',
    dayNumber: 1,
    title: 'Día 1: La Creación',
  });

  const readingAnnual = new PlanReading({
    id: 'reading-chrono-1',
    dayId: 'day-chrono-1',
    orderIndex: 0,
    bookId: 'GEN',
    bookName: 'Génesis',
    startChapter: 1,
    startVerse: 1,
    endChapter: 3,
    endVerse: 24,
    citationLabel: 'Génesis 1-3',
  });

  const articleChrono = new StudyArticle({
    id: 'art-chrono-1',
    title: 'El origen de la vida y el Génesis',
    url: 'https://vidaesperanzayverdad.org/origen-vida',
    bookId: 'GEN',
    section: 'Ciencia y Fe',
    lastSyncedAt: '2026-10-01T00:00:00.000Z',
  });

  const planThematic = new ReadingPlan({
    id: 'plan-pentecost',
    title: 'Hechos 2 - Pentecostés',
    description: 'Guía de estudio sobre el día de Pentecostés',
    archetype: 'thematic',
    totalDays: 7,
  });

  const subThematic = new PlanSubscription({
    id: 'sub-pentecost',
    planId: 'plan-pentecost',
    startedAt: '2026-10-01T00:00:00.000Z',
    isActive: true,
    currentDayNumber: 2,
  });

  const dayThematic = new PlanDay({
    id: 'day-pente-2',
    planId: 'plan-pentecost',
    dayNumber: 2,
    title: 'Día 2: El don de lenguas',
    reflectionQuestions: ['¿Por qué se sorprendían los oyentes en Pentecostés?'],
    explicitArticleTitles: ['¿Qué es el don de lenguas?'],
  });

  const readingThematic = new PlanReading({
    id: 'reading-pente-2',
    dayId: 'day-pente-2',
    orderIndex: 0,
    bookId: 'ACT',
    bookName: 'Hechos',
    startChapter: 2,
    startVerse: 1,
    endChapter: 2,
    endVerse: 13,
    citationLabel: 'Hechos 2:1-13',
  });

  const activePlansMock: ActivePlanToday[] = [
    {
      subscription: subAnnual,
      plan: planAnnual,
      day: dayAnnual,
      readings: [{ reading: readingAnnual, isCompleted: false }],
      articles: [articleChrono],
    },
    {
      subscription: subThematic,
      plan: planThematic,
      day: dayThematic,
      readings: [{ reading: readingThematic, isCompleted: true }],
      articles: [],
    },
  ];

  let mockGetActivePlansUseCase: any;
  let mockToggleReadingProgressUseCase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActivePlansUseCase = {
      execute: jest.fn().mockResolvedValue(activePlansMock),
    };
    mockToggleReadingProgressUseCase = {
      execute: jest.fn().mockResolvedValue({
        subscriptionId: 'sub-chronological',
        completedReadingsCount: 1,
        totalReadingsCount: 1,
        percentage: 100,
        isCompleted: true,
      }),
    };
  });

  it('should render active plan switchers and reading list', async () => {
    const { getByText, getAllByText } = await render(
      <TodayScreen
        getActivePlansUseCase={mockGetActivePlansUseCase}
        toggleReadingProgressUseCase={mockToggleReadingProgressUseCase}
      />
    );

    // Verify plan chips/switchers
    await waitFor(() => {
      expect(getAllByText('Plan Cronológico').length).toBeGreaterThan(0);
      expect(getAllByText('Hechos 2 - Pentecostés').length).toBeGreaterThan(0);
    });

    // Verify current plan day title and readings
    expect(getByText('Día 1: La Creación')).toBeTruthy();
    expect(getByText('Génesis 1-3')).toBeTruthy();
  });

  it('should switch active plan when another plan tab is tapped', async () => {
    const { getByText, getAllByText } = await render(
      <TodayScreen
        getActivePlansUseCase={mockGetActivePlansUseCase}
        toggleReadingProgressUseCase={mockToggleReadingProgressUseCase}
      />
    );

    await waitFor(() => {
      expect(getAllByText('Plan Cronológico').length).toBeGreaterThan(0);
    });

    const thematicTab = getAllByText('Hechos 2 - Pentecostés')[0];
    fireEvent.press(thematicTab);

    // Verify switched content
    await waitFor(() => {
      expect(getByText('Día 2: El don de lenguas')).toBeTruthy();
      expect(getByText('Hechos 2:1-13')).toBeTruthy();
      expect(getByText('¿Por qué se sorprendían los oyentes en Pentecostés?')).toBeTruthy();
    });
  });

  it('should toggle reading completion when checkbox is pressed', async () => {
    const { getByTestId } = await render(
      <TodayScreen
        getActivePlansUseCase={mockGetActivePlansUseCase}
        toggleReadingProgressUseCase={mockToggleReadingProgressUseCase}
      />
    );

    await waitFor(() => {
      expect(getByTestId('checkbox')).toBeTruthy();
    });

    const checkbox = getByTestId('checkbox');
    fireEvent.press(checkbox);

    expect(mockToggleReadingProgressUseCase.execute).toHaveBeenCalledWith(
      'sub-chronological',
      'reading-chrono-1'
    );
  });

  it('should open WebBrowser when a study article card is pressed', async () => {
    const { getByText } = await render(
      <TodayScreen
        getActivePlansUseCase={mockGetActivePlansUseCase}
        toggleReadingProgressUseCase={mockToggleReadingProgressUseCase}
      />
    );

    await waitFor(() => {
      expect(getByText('El origen de la vida y el Génesis')).toBeTruthy();
    });

    const articleCardTitle = getByText('El origen de la vida y el Génesis');
    fireEvent.press(articleCardTitle);

    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
      'https://vidaesperanzayverdad.org/origen-vida'
    );
  });

  it('should render fallback live search button and open browser when no articles exist', async () => {
    const { getByText, getAllByText } = await render(
      <TodayScreen
        getActivePlansUseCase={mockGetActivePlansUseCase}
        toggleReadingProgressUseCase={mockToggleReadingProgressUseCase}
      />
    );

    await waitFor(() => {
      expect(getAllByText('Plan Cronológico').length).toBeGreaterThan(0);
    });

    // Switch to thematic plan which has empty articles
    fireEvent.press(getAllByText('Hechos 2 - Pentecostés')[0]);

    await waitFor(() => {
      expect(getByText(/Buscar artículos en vidaesperanzayverdad\.org/i)).toBeTruthy();
    });

    const searchButton = getByText(/Buscar artículos en vidaesperanzayverdad\.org/i);
    fireEvent.press(searchButton);

    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
      expect.stringContaining('https://vidaesperanzayverdad.org/search/?q=')
    );
  });

  it('should navigate to reader screen when "Leer pasaje" is pressed', async () => {
    const { getByText } = await render(
      <TodayScreen
        getActivePlansUseCase={mockGetActivePlansUseCase}
        toggleReadingProgressUseCase={mockToggleReadingProgressUseCase}
      />
    );

    await waitFor(() => {
      expect(getByText('Leer pasaje')).toBeTruthy();
    });

    const readButton = getByText('Leer pasaje');
    fireEvent.press(readButton);

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/(tabs)/reader',
      })
    );
  });

  it('should render empty state when user has no active plan subscriptions', async () => {
    mockGetActivePlansUseCase.execute.mockResolvedValue([]);

    const { getByText } = await render(
      <TodayScreen
        getActivePlansUseCase={mockGetActivePlansUseCase}
        toggleReadingProgressUseCase={mockToggleReadingProgressUseCase}
      />
    );

    await waitFor(() => {
      expect(getByText(/No tienes planes activos/i)).toBeTruthy();
    });

    const exploreButton = getByText(/Explorar catálogo de planes/i);
    expect(exploreButton).toBeTruthy();

    fireEvent.press(exploreButton);
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/plans');
  });
});
