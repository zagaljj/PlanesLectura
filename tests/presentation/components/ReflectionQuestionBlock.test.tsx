import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ReflectionQuestionBlock } from '../../../src/presentation/components/ReflectionQuestionBlock';

describe('ReflectionQuestionBlock Component', () => {
  const sampleQuestions = [
    '¿Qué significa este pasaje para tu vida diaria?',
    '¿Cómo podemos aplicar este principio hoy en día?',
  ];

  it('should render reflection questions by default', async () => {
    const { getByText } = await render(
      <ReflectionQuestionBlock questions={sampleQuestions} />
    );

    expect(getByText('Preguntas de reflexión')).toBeTruthy();
    expect(getByText(/¿Qué significa este pasaje/)).toBeTruthy();
    expect(getByText(/¿Cómo podemos aplicar/)).toBeTruthy();
  });

  it('should toggle collapse/expand when header is pressed', async () => {
    const { getByText, getByTestId, queryByText } = await render(
      <ReflectionQuestionBlock questions={sampleQuestions} defaultExpanded={true} />
    );

    expect(getByText(/¿Qué significa este pasaje/)).toBeTruthy();

    // Tap header to collapse
    await fireEvent.press(getByTestId('reflection-header'));
    expect(queryByText(/¿Qué significa este pasaje/)).toBeNull();

    // Tap header to expand again
    await fireEvent.press(getByTestId('reflection-header'));
    expect(getByText(/¿Qué significa este pasaje/)).toBeTruthy();
  });

  it('should render nothing if questions array is empty', async () => {
    const { toJSON } = await render(
      <ReflectionQuestionBlock questions={[]} />
    );
    expect(toJSON()).toBeNull();
  });

  it('should allow custom header title', async () => {
    const { getByText } = await render(
      <ReflectionQuestionBlock
        questions={sampleQuestions}
        title="Preguntas del Día"
      />
    );
    expect(getByText('Preguntas del Día')).toBeTruthy();
  });
});
