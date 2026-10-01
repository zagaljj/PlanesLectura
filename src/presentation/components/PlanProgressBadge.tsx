import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { fontFamilies, fontSizes, fontWeights } from '../theme/typography';

export interface PlanProgressBadgeProps {
  percentage?: number;
  completedDays?: number;
  totalDays?: number;
  streak?: number;
  size?: 'small' | 'medium' | 'large';
  testID?: string;
}

export const PlanProgressBadge: React.FC<PlanProgressBadgeProps> = ({
  percentage,
  completedDays,
  totalDays,
  streak,
  size = 'medium',
  testID,
}) => {
  const calculatedPercentage =
    percentage !== undefined
      ? Math.round(percentage)
      : completedDays !== undefined && totalDays !== undefined && totalDays > 0
      ? Math.round((completedDays / totalDays) * 100)
      : undefined;

  const hasDaysFraction =
    completedDays !== undefined && totalDays !== undefined;

  const hasStreak = streak !== undefined && streak > 0;

  if (calculatedPercentage === undefined && !hasStreak) {
    return null;
  }

  return (
    <View style={[styles.container, sizeStyles[size].container]} testID={testID}>
      {calculatedPercentage !== undefined && (
        <View style={styles.badgeItem}>
          <Text style={[styles.percentageText, sizeStyles[size].percentageText]}>
            {calculatedPercentage}%
          </Text>
          {hasDaysFraction && (
            <Text style={[styles.fractionText, sizeStyles[size].fractionText]}>
              {completedDays}/{totalDays} días
            </Text>
          )}
        </View>
      )}

      {streak !== undefined && streak > 0 && (
        <View
          style={[
            styles.streakBadge,
            calculatedPercentage !== undefined && styles.streakMarginLeft,
          ]}
        >
          <Text style={[styles.streakText, sizeStyles[size].streakText]}>
            🔥 {streak} días
          </Text>
        </View>
      )}
    </View>
  );
};

const sizeStyles = {
  small: StyleSheet.create({
    container: {
      paddingVertical: 2,
      paddingHorizontal: 6,
    },
    percentageText: {
      fontSize: fontSizes.xs,
    },
    fractionText: {
      fontSize: 10,
    },
    streakText: {
      fontSize: 10,
    },
  }),
  medium: StyleSheet.create({
    container: {
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    percentageText: {
      fontSize: fontSizes.sm,
    },
    fractionText: {
      fontSize: fontSizes.xs,
    },
    streakText: {
      fontSize: fontSizes.xs,
    },
  }),
  large: StyleSheet.create({
    container: {
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    percentageText: {
      fontSize: fontSizes.lg,
    },
    fractionText: {
      fontSize: fontSizes.sm,
    },
    streakText: {
      fontSize: fontSizes.sm,
    },
  }),
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.borderSubtle,
    borderRadius: 8,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  percentageText: {
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  fractionText: {
    fontFamily: fontFamilies.sans,
    color: colors.textSecondary,
    fontWeight: fontWeights.regular,
  },
  streakBadge: {
    backgroundColor: colors.accentLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  streakMarginLeft: {
    marginLeft: 8,
  },
  streakText: {
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.semiBold,
    color: colors.accent,
  },
});
