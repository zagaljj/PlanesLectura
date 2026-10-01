import React from 'react';
import { Text, Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useAppTheme } from '../../src/presentation/context/AppContext';
import { fontFamilies, fontSizes, fontWeights } from '../../src/presentation/theme/typography';

export default function TabLayout() {
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamilies.sans,
          fontSize: fontSizes.xs,
          fontWeight: fontWeights.medium,
        },
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTitleStyle: {
          fontFamily: fontFamilies.sans,
          fontSize: fontSizes.lg,
          fontWeight: fontWeights.bold,
          color: colors.text,
        },
        headerTintColor: colors.primary,
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Hoy',
          headerTitle: 'Lecturas de Hoy',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>📅</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: 'Planes',
          headerTitle: 'Catálogo de Planes',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>📖</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="reader"
        options={{
          title: 'Lector',
          headerTitle: 'Lector Bíblico',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>📜</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          headerTitle: 'Ajustes y Datos',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>⚙️</Text>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 20,
    opacity: 0.7,
  },
  tabIconActive: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
});
