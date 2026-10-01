import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { fontFamilies, fontSizes, fontWeights } from '../theme/typography';

export interface ReadingCardProps {
  citationLabel: string;
  isCompleted: boolean;
  onToggle: () => void;
  onReadPress: () => void;
  orderIndex?: number;
  bookName?: string;
  testID?: string;
}

export const ReadingCard: React.FC<ReadingCardProps> = ({
  citationLabel,
  isCompleted,
  onToggle,
  onReadPress,
  orderIndex,
  testID,
}) => {
  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.headerRow}>
        {orderIndex !== undefined && (
          <View style={styles.orderBadge}>
            <Text style={styles.orderBadgeText}>Lectura {orderIndex + 1}</Text>
          </View>
        )}
        <TouchableOpacity
          testID="checkbox"
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityLabel={`Marcar ${citationLabel} como leído`}
          accessibilityState={{ checked: isCompleted }}
          style={[
            styles.checkbox,
            isCompleted ? styles.checkboxCompleted : styles.checkboxIncomplete,
          ]}
        >
          <Text
            style={[
              styles.checkboxCheckmark,
              isCompleted ? styles.checkmarkVisible : styles.checkmarkHidden,
            ]}
          >
            ✓
          </Text>
        </TouchableOpacity>
      </View>

      <Text
        style={[
          styles.citationText,
          isCompleted && styles.citationTextCompleted,
        ]}
      >
        {citationLabel}
      </Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          onPress={onReadPress}
          accessibilityRole="button"
          accessibilityLabel={`Leer pasaje ${citationLabel}`}
          style={styles.readButton}
        >
          <Text style={styles.readButtonText}>Leer pasaje</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderBadge: {
    backgroundColor: colors.borderSubtle,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  orderBadgeText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  checkboxIncomplete: {
    borderColor: colors.checkboxUnchecked,
    backgroundColor: colors.surface,
  },
  checkboxCompleted: {
    borderColor: colors.checkboxChecked,
    backgroundColor: colors.checkboxChecked,
  },
  checkboxCheckmark: {
    fontSize: 14,
    fontWeight: fontWeights.bold,
    color: colors.textInverse,
  },
  checkmarkVisible: {
    opacity: 1,
  },
  checkmarkHidden: {
    opacity: 0,
  },
  citationText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semiBold,
    color: colors.text,
    marginBottom: 12,
  },
  citationTextCompleted: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  readButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  readButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textInverse,
  },
});
