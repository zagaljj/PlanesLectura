import React from 'react';
import { render } from '@testing-library/react-native';
import { PlanProgressBadge } from '../../../src/presentation/components/PlanProgressBadge';

describe('PlanProgressBadge Component', () => {
  it('should render percentage label', async () => {
    const { getByText } = await render(
      <PlanProgressBadge percentage={75} />
    );
    expect(getByText('75%')).toBeTruthy();
  });

  it('should compute percentage from completedDays and totalDays', async () => {
    const { getByText } = await render(
      <PlanProgressBadge completedDays={15} totalDays={30} />
    );
    expect(getByText('50%')).toBeTruthy();
    expect(getByText('15/30 días')).toBeTruthy();
  });

  it('should render streak badge when streak is provided', async () => {
    const { getByText } = await render(
      <PlanProgressBadge streak={7} />
    );
    expect(getByText(/7 días/)).toBeTruthy();
  });

  it('should render both progress and streak when both provided', async () => {
    const { getByText } = await render(
      <PlanProgressBadge percentage={80} streak={12} />
    );
    expect(getByText('80%')).toBeTruthy();
    expect(getByText(/12 días/)).toBeTruthy();
  });
});
