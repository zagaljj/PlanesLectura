import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ArticleCard } from '../../../src/presentation/components/ArticleCard';
import { StudyArticle } from '../../../src/domain/entities/StudyArticle';

describe('ArticleCard Component', () => {
  it('should render article title and section badge', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      <ArticleCard
        title="¿Quién fue el apóstol Pablo?"
        section="Biografías Bíblicas"
        onPress={onPress}
      />
    );

    expect(getByText('¿Quién fue el apóstol Pablo?')).toBeTruthy();
    expect(getByText('Biografías Bíblicas')).toBeTruthy();
  });

  it('should trigger onPress callback when tapped', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      <ArticleCard
        title="El significado de Pentecostés"
        section="Festivales"
        onPress={onPress}
      />
    );

    await fireEvent.press(getByText('El significado de Pentecostés'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should accept a StudyArticle domain entity directly', async () => {
    const article = new StudyArticle({
      id: 'art-1',
      title: 'Las bienaventuranzas explicadas',
      url: 'https://vidaesperanzayverdad.org/biblia/las-bienaventuranzas/',
      section: 'Vida Cristiana',
      lastSyncedAt: '2026-10-01T00:00:00Z',
    });

    const onPress = jest.fn();
    const { getByText } = await render(
      <ArticleCard article={article} onPress={onPress} />
    );

    expect(getByText('Las bienaventuranzas explicadas')).toBeTruthy();
    expect(getByText('Vida Cristiana')).toBeTruthy();
    await fireEvent.press(getByText('Las bienaventuranzas explicadas'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
