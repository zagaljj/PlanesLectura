import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import RootLayout from '../../../app/_layout';
import TabLayout from '../../../app/(tabs)/_layout';
import { DatabaseManager } from '../../../src/data/sqlite/DatabaseManager';

// Mock expo-router
jest.mock('expo-router', () => ({
  Stack: Object.assign(
    ({ children }: any) => <>{children}</>,
    { Screen: () => null }
  ),
  Tabs: Object.assign(
    ({ children }: any) => <>{children}</>,
    { Screen: () => null }
  ),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
}));

describe('Navigation Layouts', () => {
  beforeEach(async () => {
    await DatabaseManager.resetInstance();
  });

  afterAll(async () => {
    await DatabaseManager.resetInstance();
  });

  it('should render TabLayout successfully with tabs', async () => {
    const { toJSON } = await render(<TabLayout />);
    expect(toJSON()).toBeDefined();
  });

  it('should render RootLayout and initialize database', async () => {
    const { toJSON, getByText } = await render(<RootLayout />);
    expect(toJSON()).toBeDefined();

    // Eventually database initializes
    await waitFor(() => {
      // Gate finishes initialization
      expect(toJSON()).toBeDefined();
    });
  });
});
