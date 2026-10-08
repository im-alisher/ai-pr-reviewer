import {
  LIMITS,
  type PatchResult,
  type PullRequestContext,
  type ReviewReport,
} from '@ai-pr-reviewer/shared';
import type { AIProvider } from '@ai-pr-reviewer/ai-review-engine';
import { buildPatchPrompt, PATCH_SYSTEM_PROMPT } from './prompts/patch-prompt';
import { parsePatchPayload } from './patch-parser';

export interface PatchGeneratorOptions {
  provider: AIProvider;
}

export interface GeneratePatchOptions {
  findingIds?: string[];
}

export class PatchGenerator {
  private readonly provider: AIProvider;

  constructor(options: PatchGeneratorOptions) {
    this.provider = options.provider;
  }

  get providerName(): string {
    return this.provider.name;
  }

  async generatePatchSuggestions(
    context: PullRequestContext,
    report: ReviewReport,
    options: GeneratePatchOptions = {},
  ): Promise<PatchResult> {
    const response = await this.provider.generate({
      systemPrompt: PATCH_SYSTEM_PROMPT,
      prompt: buildPatchPrompt(context, report, options),
      temperature: 0.1,
      maxTokens: 6_000,
    });

    return parsePatchPayload(
      response.content,
      report,
      LIMITS.maxPatchSuggestions,
    );
  }
}
