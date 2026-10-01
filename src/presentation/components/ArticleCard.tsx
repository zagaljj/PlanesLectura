import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { fontFamilies, fontSizes, fontWeights } from '../theme/typography';
import { StudyArticle } from '../../domain/entities/StudyArticle';

export interface ArticleCardProps {
  title?: string;
  section?: string;
  article?: StudyArticle;
  url?: string;
  onPress: () => void;
  testID?: string;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  title,
  section,
  article,
  onPress,
  testID,
}) => {
  const displayTitle = article ? article.title : title ?? '';
  const displaySection = article ? article.section : section;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Artículo: ${displayTitle}`}
      testID={testID}
      activeOpacity={0.7}
    >
      {displaySection && (
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{displaySection}</Text>
        </View>
      )}

      <Text style={styles.titleText} numberOfLines={2}>
        {displayTitle}
      </Text>

      <View style={styles.footerRow}>
        <Text style={styles.actionText}>Leer artículo →</Text>
      </View>
    </TouchableOpacity>
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
  sectionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.infoBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  sectionBadgeText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semiBold,
    color: colors.info,
  },
  titleText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semiBold,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionText: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.secondary,
  },
});
