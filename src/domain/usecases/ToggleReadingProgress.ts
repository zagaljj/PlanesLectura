import { SubscriptionRepository, SubscriptionProgress } from '../repositories';

export interface ToggleReadingProgressResult extends SubscriptionProgress {
  isCompleted: boolean;
}

export interface ToggleReadingProgressInput {
  subscriptionId: string;
  readingId: string;
}

export class ToggleReadingProgress {
  constructor(private readonly subscriptionRepo: SubscriptionRepository) {}

  async execute(
    subscriptionIdOrInput: string | ToggleReadingProgressInput,
    optionalReadingId?: string
  ): Promise<ToggleReadingProgressResult> {
    let subscriptionId: string;
    let readingId: string;

    if (typeof subscriptionIdOrInput === 'string') {
      subscriptionId = subscriptionIdOrInput;
      readingId = optionalReadingId!;
    } else {
      subscriptionId = subscriptionIdOrInput.subscriptionId;
      readingId = subscriptionIdOrInput.readingId;
    }

    if (!subscriptionId || subscriptionId.trim() === '') {
      throw new Error('subscriptionId cannot be empty');
    }
    if (!readingId || readingId.trim() === '') {
      throw new Error('readingId cannot be empty');
    }

    const isCurrentlyCompleted = await this.subscriptionRepo.isReadingCompleted(
      subscriptionId,
      readingId
    );

    if (isCurrentlyCompleted) {
      await this.subscriptionRepo.unmarkReading(subscriptionId, readingId);
    } else {
      await this.subscriptionRepo.markReadingComplete(subscriptionId, readingId);
    }

    const updatedProgress = await this.subscriptionRepo.getProgressForSubscription(subscriptionId);
    const isNowCompleted = !isCurrentlyCompleted;

    return {
      ...updatedProgress,
      isCompleted: isNowCompleted,
    };
  }
}
