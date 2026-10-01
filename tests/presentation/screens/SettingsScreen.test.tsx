import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';
import SettingsScreen from '../../../app/(tabs)/settings';

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn().mockResolvedValue({ type: 'opened' }),
}));

describe('SettingsScreen', () => {
  const mockDatabaseStats = {
    plansCount: 5,
    daysCount: 767,
    readingsCount: 1862,
    activeSubscriptionsCount: 2,
    articlesCount: 45,
    versesCount: 31102,
  };

  let mockSitemapSyncService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSitemapSyncService = {
      syncDelta: jest.fn().mockResolvedValue(12),
    };
  });

  it('should render offline database statistics', async () => {
    const { getByText } = await render(
      <SettingsScreen
        sitemapSyncService={mockSitemapSyncService}
        databaseStats={mockDatabaseStats}
      />
    );

    await waitFor(() => {
      expect(getByText('5')).toBeTruthy();
      expect(getByText('767')).toBeTruthy();
      expect(getByText('1862')).toBeTruthy();
      expect(getByText('2')).toBeTruthy();
      expect(getByText('45')).toBeTruthy();
      expect(getByText('31102')).toBeTruthy();
    });
  });

  it('should trigger manual sync and display result message', async () => {
    const { getByText } = await render(
      <SettingsScreen
        sitemapSyncService={mockSitemapSyncService}
        databaseStats={mockDatabaseStats}
      />
    );

    await waitFor(() => {
      expect(getByText('Sincronizar artículos ahora')).toBeTruthy();
    });

    const syncBtn = getByText('Sincronizar artículos ahora');
    await fireEvent.press(syncBtn);

    expect(mockSitemapSyncService.syncDelta).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(getByText(/Se añadieron 12 nuevos artículos/i)).toBeTruthy();
    });
  });

  it('should open website in WebBrowser when website link is pressed', async () => {
    const { getByText } = await render(
      <SettingsScreen
        sitemapSyncService={mockSitemapSyncService}
        databaseStats={mockDatabaseStats}
      />
    );

    await waitFor(() => {
      expect(getByText(/Visitar vidaesperanzayverdad\.org/i)).toBeTruthy();
    });

    const websiteBtn = getByText(/Visitar vidaesperanzayverdad\.org/i);
    await fireEvent.press(websiteBtn);

    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
      'https://vidaesperanzayverdad.org'
    );
  });
});
