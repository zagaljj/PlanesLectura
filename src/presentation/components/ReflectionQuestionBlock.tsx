import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { fontFamilies, fontSizes, fontWeights } from '../theme/typography';

export interface ReflectionQuestionBlockProps {
  questions: string[];
  title?: string;
  defaultExpanded?: boolean;
  collapsible?: boolean;
  testID?: string;
}

export const ReflectionQuestionBlock: React.FC<ReflectionQuestionBlockProps> = ({
  questions,
  title = 'Preguntas de reflexión',
  defaultExpanded = true,
  collapsible = true,
  testID,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  if (!questions || questions.length === 0) {
    return null;
  }

  const toggleExpand = () => {
    if (collapsible) {
      setIsExpanded((prev) => !prev);
    }
  };

  return (
    <View style={styles.card} testID={testID}>
      <TouchableOpacity
        testID="reflection-header"
        onPress={toggleExpand}
        activeOpacity={collapsible ? 0.7 : 1}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${isExpanded ? 'expandido' : 'colapsado'}`}
        accessibilityState={{ expanded: isExpanded }}
        style={styles.headerRow}
      >
        <Text style={styles.titleText}>{title}</Text>
        {collapsible && (
          <Text style={styles.toggleIcon}>{isExpanded ? '▲' : '▼'}</Text>
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.questionsList}>
          {questions.map((question, index) => (
            <View key={index} style={styles.questionItem}>
              <View style={styles.indexBadge}>
                <Text style={styles.indexBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.questionText}>{question}</Text>
            </View>
          ))}
        </View>
      )}
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
  },
  titleText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  toggleIcon: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  questionsList: {
    marginTop: 12,
    gap: 10,
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  indexBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  indexBadgeText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  questionText: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: colors.text,
  },
});
