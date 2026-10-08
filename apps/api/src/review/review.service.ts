import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  ReviewerError,
  parsePullRequestUrl,
  type AnalyzePullRequestResponse,
} from '@ai-pr-reviewer/shared';
import {
  ProviderRegistry,
  ReviewEngine,
  createDefaultRegistry,
  resolveProviderName,
} from '@ai-pr-reviewer/ai-review-engine';
import { createGitHubClient, type GitHubClient } from '@ai-pr-reviewer/github-client';
import { readEnv } from '../env';

export const REVIEW_SERVICE_DEPS = Symbol('REVIEW_SERVICE_DEPS');

export interface ReviewServiceDeps {
  githubClient?: GitHubClient;
  registry?: ProviderRegistry;
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
    this.preferredProvider = env.aiProvider;
  }

  async analyze(prUrl: string): Promise<AnalyzePullRequestResponse> {
    const reference = parsePullRequestUrl(prUrl);
    if (!reference) {
      throw new ReviewerError(
        'invalid_pr_url',
        'prUrl must be a public GitHub pull request URL such as https://github.com/owner/repo/pull/123',
      );
    }

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
}
