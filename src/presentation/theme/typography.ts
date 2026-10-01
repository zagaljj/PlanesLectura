import { Platform, TextStyle } from 'react-native';

export const fontFamilies = {
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'sans-serif',
  }),
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'serif',
  }),
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  title: 28,
  header: 32,
};

export const lineHeights = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 28,
  xxl: 32,
  title: 36,
  header: 40,
  readerVerse: 28,
};

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
};

export const textStyles: Record<string, TextStyle> = {
  header: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.header,
    lineHeight: lineHeights.header,
    fontWeight: fontWeights.bold,
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.title,
    lineHeight: lineHeights.title,
    fontWeight: fontWeights.bold,
  },
  h2: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xxl,
    lineHeight: lineHeights.xxl,
    fontWeight: fontWeights.bold,
  },
  h3: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    fontWeight: fontWeights.semiBold,
  },
  body: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.regular,
  },
  bodyBold: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.bold,
  },
  bodyMedium: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.medium,
  },
  caption: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.regular,
  },
  badge: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.semiBold,
  },
  readerChapterHeader: {
    fontFamily: fontFamilies.serif,
    fontSize: fontSizes.xxl,
    lineHeight: lineHeights.xxl,
    fontWeight: fontWeights.bold,
  },
  readerVerse: {
    fontFamily: fontFamilies.serif,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.readerVerse,
    fontWeight: fontWeights.regular,
  },
};

export const typography = {
  families: fontFamilies,
  sizes: fontSizes,
  lineHeights,
  weights: fontWeights,
  styles: textStyles,
};
