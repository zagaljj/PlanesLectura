import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ReadingCard } from '../../../src/presentation/components/ReadingCard';

describe('ReadingCard Component', () => {
  it('should render citation label and toggle completion callback', async () => {
    const onToggle = jest.fn();
    const { getByText, getByTestId } = await render(
      <ReadingCard
        citationLabel="Génesis 1-3"
        isCompleted={false}
        onToggle={onToggle}
        onReadPress={jest.fn()}
      />
    );
    expect(getByText('Génesis 1-3')).toBeTruthy();
    await fireEvent.press(getByTestId('checkbox'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('should trigger onReadPress when "Leer pasaje" is pressed', async () => {
    const onReadPress = jest.fn();
    const { getByText } = await render(
      <ReadingCard
        citationLabel="Mateo 5-7"
        isCompleted={false}
        onToggle={jest.fn()}
        onReadPress={onReadPress}
      />
    );
    const readButton = getByText('Leer pasaje');
    expect(readButton).toBeTruthy();
    await fireEvent.press(readButton);
    expect(onReadPress).toHaveBeenCalledTimes(1);
  });

  it('should reflect completed state with checked accessibility state and indicator', async () => {
    const { getByTestId } = await render(
      <ReadingCard
        citationLabel="Salmos 23"
        isCompleted={true}
        onToggle={jest.fn()}
        onReadPress={jest.fn()}
      />
    );
    const checkbox = getByTestId('checkbox');
    expect(checkbox.props.accessibilityState).toEqual({ checked: true });
    expect(checkbox.props.hitSlop).toEqual({ top: 10, bottom: 10, left: 10, right: 10 });
  });

  it('should render optional reading order number or title if provided', async () => {
    const { getByText } = await render(
      <ReadingCard
        citationLabel="Romanos 8"
        orderIndex={2}
        isCompleted={false}
        onToggle={jest.fn()}
        onReadPress={jest.fn()}
      />
    );
    expect(getByText('Lectura 3')).toBeTruthy();
  });
});
