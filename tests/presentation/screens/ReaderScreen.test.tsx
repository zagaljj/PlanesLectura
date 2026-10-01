import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ReaderScreen from '../../../app/(tabs)/reader';
import { BibleVerse, PlanReading } from '../../../src/domain/entities';

// Mock expo-router
const mockPush = jest.fn();
let mockParams: any = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => mockParams,
}));

describe('ReaderScreen', () => {
  const sampleReading = new PlanReading({
    id: 'reading-gen-1',
    dayId: 'day-1',
    orderIndex: 0,
    bookId: 'GEN',
    bookName: 'Génesis',
    startChapter: 1,
    startVerse: 1,
    endChapter: 1,
    endVerse: 3,
    citationLabel: 'Génesis 1:1-3',
  });

  const sampleVerses = [
    new BibleVerse({
      bookId: 'GEN',
      chapter: 1,
      verse: 1,
      text: 'En el principio creó Dios los cielos y la tierra.',
    }),
    new BibleVerse({
      bookId: 'GEN',
      chapter: 1,
      verse: 2,
      text: 'Y la tierra estaba desordenada y vacía, y las tinieblas estaban sobre la faz del abismo.',
    }),
    new BibleVerse({
      bookId: 'GEN',
      chapter: 1,
      verse: 3,
      text: 'Y dijo Dios: Sea la luz; y fue la luz.',
    }),
  ];

  let mockGetPassageVersesUseCase: any;
  let mockToggleReadingProgressUseCase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {
      readingId: sampleReading.id,
      subscriptionId: 'sub-1',
      citationLabel: sampleReading.citationLabel,
      bookId: sampleReading.bookId,
      bookName: sampleReading.bookName,
      startChapter: '1',
      startVerse: '1',
      endChapter: '1',
      endVerse: '3',
      isCompleted: 'false',
    };

    mockGetPassageVersesUseCase = {
      execute: jest.fn().mockResolvedValue(sampleVerses),
    };
    mockToggleReadingProgressUseCase = {
      execute: jest.fn().mockResolvedValue({
        subscriptionId: 'sub-1',
        completedReadingsCount: 1,
        totalReadingsCount: 1,
        percentage: 100,
        isCompleted: true,
      }),
    };
  });

  it('should render scripture verses and citation label', async () => {
    const { getByText } = await render(
      <ReaderScreen
        reading={sampleReading}
        subscriptionId="sub-1"
        isCompleted={false}
        getPassageVersesUseCase={mockGetPassageVersesUseCase}
        toggleReadingProgressUseCase={mockToggleReadingProgressUseCase}
      />
    );

    await waitFor(() => {
      expect(getByText('Génesis 1:1-3')).toBeTruthy();
      expect(getByText(/En el principio creó Dios/i)).toBeTruthy();
      expect(getByText(/Y dijo Dios: Sea la luz/i)).toBeTruthy();
    });
  });

  it('should adjust font scaling with A+ and A- buttons', async () => {
    const { getByText, getByTestId } = await render(
      <ReaderScreen
        reading={sampleReading}
        subscriptionId="sub-1"
        isCompleted={false}
        getPassageVersesUseCase={mockGetPassageVersesUseCase}
        toggleReadingProgressUseCase={mockToggleReadingProgressUseCase}
      />
    );

    await waitFor(() => {
      expect(getByText('Génesis 1:1-3')).toBeTruthy();
    });

    const zoomInBtn = getByTestId('font-increase-btn');
    const zoomOutBtn = getByTestId('font-decrease-btn');

    await fireEvent.press(zoomInBtn);
    await fireEvent.press(zoomOutBtn);
  });

  it('should toggle between dark and light themes', async () => {
    const { getByText, getByTestId } = await render(
      <ReaderScreen
        reading={sampleReading}
        subscriptionId="sub-1"
        isCompleted={false}
        getPassageVersesUseCase={mockGetPassageVersesUseCase}
        toggleReadingProgressUseCase={mockToggleReadingProgressUseCase}
      />
    );

    await waitFor(() => {
      expect(getByText('Génesis 1:1-3')).toBeTruthy();
    });

    const themeBtn = getByTestId('theme-toggle-btn');
    expect(themeBtn).toBeTruthy();

    await fireEvent.press(themeBtn);
  });

  it('should toggle completion status when mark-as-read button is pressed', async () => {
    const { getByText } = await render(
      <ReaderScreen
        reading={sampleReading}
        subscriptionId="sub-1"
        isCompleted={false}
        getPassageVersesUseCase={mockGetPassageVersesUseCase}
        toggleReadingProgressUseCase={mockToggleReadingProgressUseCase}
      />
    );

    await waitFor(() => {
      expect(getByText(/Marcar como leído/i)).toBeTruthy();
    });

    const markBtn = getByText(/Marcar como leído/i);
    await fireEvent.press(markBtn);

    expect(mockToggleReadingProgressUseCase.execute).toHaveBeenCalledWith(
      'sub-1',
      sampleReading.id
    );

    await waitFor(() => {
      expect(getByText(/✓ Leído/i)).toBeTruthy();
    });
  });

  it('should render empty state when no reading is provided or selected', async () => {
    mockParams = {};

    const { getByText } = await render(
      <ReaderScreen
        reading={null}
        getPassageVersesUseCase={mockGetPassageVersesUseCase}
        toggleReadingProgressUseCase={mockToggleReadingProgressUseCase}
      />
    );

    await waitFor(() => {
      expect(getByText(/Ninguna lectura seleccionada/i)).toBeTruthy();
    });
  });
});
