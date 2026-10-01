import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { AppProvider, useAppContext, useAppTheme } from '../src/presentation/context/AppContext';
import { fontFamilies, fontSizes, fontWeights } from '../src/presentation/theme/typography';

function RootNavigationGate() {
  const { isInitialized, initError } = useAppContext();
  const { colors, isDarkMode } = useAppTheme();

  if (!isInitialized) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <Text style={styles.splashIcon}>📖</Text>
        <Text style={[styles.splashTitle, { color: colors.primary }]}>
          Planes de Lectura Bíblica
        </Text>
        <Text style={[styles.splashSubtitle, { color: colors.textSecondary }]}>
          Vida, Esperanza y Verdad
        </Text>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Iniciando base de datos local y lecturas...
        </Text>
      </View>
    );
  }

  if (initError) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <Text style={styles.splashIcon}>⚠️</Text>
        <Text style={[styles.splashTitle, { color: colors.error }]}>Error de Inicialización</Text>
        <Text style={[styles.splashSubtitle, { color: colors.textSecondary }]}>
          {initError.message || 'No se pudo cargar la base de datos local.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootNavigationGate />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  splashIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: fontSizes.xxl,
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.bold,
    textAlign: 'center',
    marginBottom: 6,
  },
  splashSubtitle: {
    fontSize: fontSizes.md,
    fontFamily: fontFamilies.sans,
    textAlign: 'center',
    marginBottom: 28,
  },
  loader: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.sans,
    textAlign: 'center',
  },
});
