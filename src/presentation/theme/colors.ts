export interface ColorPalette {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  accentLight: string;
  background: string;
  surface: string;
  card: string;
  cardElevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  border: string;
  borderSubtle: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  error: string;
  errorBg: string;
  info: string;
  infoBg: string;
  checkboxChecked: string;
  checkboxUnchecked: string;
}

export const lightColors: ColorPalette = {
  primary: '#1B365D', // Vida, Esperanza y Verdad deep navy
  primaryDark: '#0F1F38',
  primaryLight: '#2C5282',
  secondary: '#3182CE',
  accent: '#D97706', // warm amber/gold
  accentLight: '#FEF3C7',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  success: '#16A34A',
  successBg: '#DCFCE7',
  warning: '#EAB308',
  warningBg: '#FEF9C3',
  error: '#DC2626',
  errorBg: '#FEE2E2',
  info: '#2563EB',
  infoBg: '#DBEAFE',
  checkboxChecked: '#16A34A',
  checkboxUnchecked: '#CBD5E1',
};

export const darkColors: ColorPalette = {
  primary: '#3B82F6',
  primaryDark: '#1D4ED8',
  primaryLight: '#60A5FA',
  secondary: '#60A5FA',
  accent: '#F59E0B',
  accentLight: '#78350F',
  background: '#0F172A',
  surface: '#1E293B',
  card: '#1E293B',
  cardElevated: '#334155',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
  textInverse: '#0F172A',
  border: '#334155',
  borderSubtle: '#1E293B',
  success: '#22C55E',
  successBg: '#064E3B',
  warning: '#FACC15',
  warningBg: '#713F12',
  error: '#EF4444',
  errorBg: '#7F1D1D',
  info: '#60A5FA',
  infoBg: '#1E3A8A',
  checkboxChecked: '#22C55E',
  checkboxUnchecked: '#64748B',
};

export function getThemeColors(colorScheme?: 'light' | 'dark' | null): ColorPalette {
  if (colorScheme === 'dark') {
    return darkColors;
  }
  return lightColors;
}

export const colors = lightColors;
