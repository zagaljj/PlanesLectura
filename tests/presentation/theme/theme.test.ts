import { colors, lightColors, darkColors, getThemeColors } from '../../../src/presentation/theme/colors';
import { typography, fontFamilies, fontSizes, fontWeights, textStyles } from '../../../src/presentation/theme/typography';

describe('Theme Design System', () => {
  describe('colors', () => {
    it('should export light and dark palettes with consistent keys', () => {
      expect(lightColors.primary).toBeDefined();
      expect(darkColors.primary).toBeDefined();
      expect(lightColors.background).toBeDefined();
      expect(darkColors.background).toBeDefined();
      expect(lightColors.card).toBeDefined();
      expect(darkColors.card).toBeDefined();
      expect(lightColors.accent).toBeDefined();
      expect(darkColors.accent).toBeDefined();
      expect(lightColors.text).toBeDefined();
      expect(darkColors.text).toBeDefined();
      expect(lightColors.success).toBeDefined();
      expect(darkColors.success).toBeDefined();
      expect(lightColors.border).toBeDefined();
      expect(darkColors.border).toBeDefined();
    });

    it('should return appropriate palette based on colorScheme', () => {
      expect(getThemeColors('dark')).toEqual(darkColors);
      expect(getThemeColors('light')).toEqual(lightColors);
      expect(getThemeColors(null)).toEqual(lightColors);
      expect(colors).toEqual(lightColors);
    });
  });

  describe('typography', () => {
    it('should export font families with serif for Bible reader and sans for UI', () => {
      expect(fontFamilies.sans).toBeDefined();
      expect(fontFamilies.serif).toBeDefined();
      expect(typeof fontFamilies.sans).toBe('string');
      expect(typeof fontFamilies.serif).toBe('string');
    });

    it('should export font scale sizes and weights', () => {
      expect(fontSizes.xs).toBeLessThan(fontSizes.sm);
      expect(fontSizes.sm).toBeLessThan(fontSizes.md);
      expect(fontSizes.md).toBeLessThan(fontSizes.lg);
      expect(fontSizes.lg).toBeLessThan(fontSizes.xl);
      expect(fontSizes.xl).toBeLessThan(fontSizes.xxl);

      expect(fontWeights.regular).toBe('400');
      expect(fontWeights.bold).toBe('700');
    });

    it('should export typography presets including reader styles', () => {
      expect(textStyles.body).toBeDefined();
      expect(textStyles.readerVerse).toBeDefined();
      expect(textStyles.readerVerse.fontFamily).toBe(fontFamilies.serif);
      expect(textStyles.body.fontFamily).toBe(fontFamilies.sans);
    });
  });
});
