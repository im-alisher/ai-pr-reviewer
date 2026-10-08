import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  ReviewerError,
  parsePullRequestUrl,
  type AnalyzePullRequestResponse,
  type GeneratePatchResponse,
  type ReviewReport,
} from '@ai-pr-reviewer/shared';
import {
  ProviderRegistry,
  ReviewEngine,
  createDefaultRegistry,
  normalizeReport,
  resolveProviderName,
} from '@ai-pr-reviewer/ai-review-engine';
import {
  PatchGenerator,
  type GeneratePatchOptions,
} from '@ai-pr-reviewer/patch-generator';
import { createGitHubClient, type GitHubClient } from '@ai-pr-reviewer/github-client';
import { readEnv } from '../env';

export const REVIEW_SERVICE_DEPS = Symbol('REVIEW_SERVICE_DEPS');

export interface ReviewServiceDeps {
  githubClient?: GitHubClient;
  registry?: ProviderRegistry;
  preferredProvider?: string;
}

@Injectable()
export class ReviewService {
  private readonly githubClient: GitHubClient;
  private readonly registry: ProviderRegistry;
  private readonly preferredProvider: string | undefined;

  constructor(
    @Optional() @Inject(REVIEW_SERVICE_DEPS) deps?: ReviewServiceDeps,
  ) {
    const env = readEnv();
    this.githubClient =
      deps?.githubClient ??
      createGitHubClient({
        token: env.githubToken,
      });
    this.registry =
      deps?.registry ?? createDefaultRegistry({
        apiKey: env.groqApiKey,
        model: env.groqModel,
      });
    this.preferredProvider = deps?.preferredProvider ?? env.aiProvider;
  }

  async analyze(prUrl: string): Promise<AnalyzePullRequestResponse> {
    const reference = this.parseReference(prUrl);

    const context = await this.githubClient.fetchPullRequestContext(reference);
    const provider = this.registry.get(resolveProviderName(this.preferredProvider));
    const engine = new ReviewEngine({ provider });
    const report = await engine.generateReview(context);

    return {
      pullRequest: context.metadata,
      files: context.files,
      commits: context.commits,
      report,
    };
  }

  async generatePatch(
    prUrl: string,
    rawReport: Record<string, unknown>,
    findingIds?: string[],
  ): Promise<GeneratePatchResponse> {
    const reference = this.parseReference(prUrl);
    const report = this.sanitizeReport(rawReport);

    const context = await this.githubClient.fetchPullRequestContext(reference);
    const provider = this.registry.get(resolveProviderName(this.preferredProvider));
    const generator = new PatchGenerator({ provider });
    const options: GeneratePatchOptions =
      findingIds && findingIds.length > 0 ? { findingIds } : {};

    const result = await generator.generatePatchSuggestions(
      context,
      report,
      options,
    );

    return { result };
  }

  private parseReference(prUrl: string) {
    const reference = parsePullRequestUrl(prUrl);
    if (!reference) {
      throw new ReviewerError(
        'invalid_pr_url',
        'prUrl must be a public GitHub pull request URL such as https://github.com/owner/repo/pull/123',
      );
    }
    return reference;
  }

  private sanitizeReport(rawReport: Record<string, unknown>): ReviewReport {
    return normalizeReport(rawReport, {
      provider:
        typeof rawReport.provider === 'string' && rawReport.provider.length > 0
          ? rawReport.provider
          : 'unknown',
      model:
        typeof rawReport.model === 'string' && rawReport.model.length > 0
          ? rawReport.model
          : 'unknown',
    });
  }
}
