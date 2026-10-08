import type { PullRequestContext, ReviewReport } from '@ai-pr-reviewer/shared';
import type { AIProvider } from './types';
import { buildReviewPrompt, REVIEW_SYSTEM_PROMPT } from './prompts/review-prompt';
import { extractJsonObject, normalizeReport } from './report-parser';

export interface ReviewEngineOptions {
  provider: AIProvider;
}

export class ReviewEngine {
  private readonly provider: AIProvider;

  constructor(options: ReviewEngineOptions) {
    this.provider = options.provider;
  }

  get providerName(): string {
    return this.provider.name;
  }

  async generateReview(context: PullRequestContext): Promise<ReviewReport> {
    const response = await this.provider.generate({
      systemPrompt: REVIEW_SYSTEM_PROMPT,
      prompt: buildReviewPrompt(context),
      temperature: 0.2,
      maxTokens: 4_096,
    });

    const payload = extractJsonObject(response.content);
    return normalizeReport(payload, {
      provider: this.provider.name,
      model: response.model,
    });
  }
}
