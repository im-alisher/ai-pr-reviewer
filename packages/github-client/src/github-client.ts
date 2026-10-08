import {
  GITHUB_API_BASE_URL,
  LIMITS,
  ReviewerError,
  type ChangedFile,
  type PullRequestCommit,
  type PullRequestContext,
  type PullRequestReference,
} from '@ai-pr-reviewer/shared';
import {
  mapChangedFile,
  mapCommit,
  mapPullRequestMetadata,
  type RawCommit,
  type RawPullRequest,
  type RawPullRequestFile,
} from './mapper';
import type { FetchLike, GitHubClientOptions } from './types';

const DEFAULT_TIMEOUT_MS = LIMITS.requestTimeoutMs;
const MAX_PAGES = 10;
const PER_PAGE = 100;

export class GitHubClient {
  private readonly baseUrl: string;
  private readonly token: string | undefined;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;
  private readonly maxFiles: number;
  private readonly maxCommits: number;

  constructor(options: GitHubClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? GITHUB_API_BASE_URL).replace(/\/+$/, '');
    this.token = options.token;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.maxFiles = options.maxFiles ?? LIMITS.maxFiles;
    this.maxCommits = options.maxCommits ?? LIMITS.maxCommits;
  }

  async fetchPullRequestContext(
    reference: PullRequestReference,
  ): Promise<PullRequestContext> {
    const [rawPull, rawFiles, rawCommits] = await Promise.all([
      this.request<RawPullRequest>(
        this.buildPath(
          `/repos/${reference.owner}/${reference.repo}/pulls/${reference.number}`,
        ),
      ),
      this.requestPaged<RawPullRequestFile>(
        this.buildPath(
          `/repos/${reference.owner}/${reference.repo}/pulls/${reference.number}/files`,
        ),
        this.maxFiles,
      ),
      this.requestPaged<RawCommit>(
        this.buildPath(
          `/repos/${reference.owner}/${reference.repo}/pulls/${reference.number}/commits`,
        ),
        this.maxCommits,
      ),
    ]);

    const metadata = mapPullRequestMetadata(rawPull, reference);
    const files = rawFiles
      .map(mapChangedFile)
      .filter((file): file is ChangedFile => file !== null)
      .map((file) => this.limitPatch(file));
    const commits = rawCommits
      .map(mapCommit)
      .filter((commit): commit is PullRequestCommit => commit !== null)
      .map((commit) => this.limitCommitMessage(commit));

    return {
      reference,
      metadata,
      files,
      commits,
      fetchedAt: new Date().toISOString(),
    };
  }

  private limitPatch(file: ChangedFile): ChangedFile {
    if (file.patch === null) {
      return file;
    }
    if (file.patch.length <= LIMITS.maxPatchCharsPerFile) {
      return file;
    }
    return {
      ...file,
      patch: `${file.patch.slice(0, LIMITS.maxPatchCharsPerFile)}\n... [diff truncated]`,
    };
  }

  private limitCommitMessage(commit: PullRequestCommit): PullRequestCommit {
    if (commit.message.length <= LIMITS.maxCommitMessageChars) {
      return commit;
    }
    return {
      ...commit,
      message: `${commit.message.slice(0, LIMITS.maxCommitMessageChars)}\n... [message truncated]`,
    };
  }

  private buildPath(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private async request<T>(url: string): Promise<T> {
    const response = await this.rawRequest(url);
    return (await response.json()) as T;
  }

  private async requestPaged<T>(url: string, maxItems: number): Promise<T[]> {
    const items: T[] = [];
    let nextUrl: string | null = url;
    let pages = 0;

    while (nextUrl && items.length < maxItems && pages < MAX_PAGES) {
      const pagedUrl = nextUrl.includes('?')
        ? nextUrl
        : `${nextUrl}?per_page=${PER_PAGE}`;
      const response = await this.rawRequest(pagedUrl);
      const page = (await response.json()) as T[];
      items.push(...page);
      nextUrl = this.extractNextLink(response.headers.get('link'));
      pages += 1;
    }

    return items.slice(0, maxItems);
  }

  private async rawRequest(url: string): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ai-pr-reviewer',
    };

    if (this.token && url.startsWith(this.baseUrl)) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        headers,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ReviewerError(
        'github_error',
        `GitHub API request failed: ${message}`,
      );
    }

    if (response.ok) {
      return response;
    }

    if (response.status === 404) {
      throw new ReviewerError(
        'pull_request_not_found',
        'Pull request not found. Check that the URL points to a public GitHub repository.',
      );
    }

    if (response.status === 403 || response.status === 429) {
      throw new ReviewerError(
        'github_rate_limited',
        'GitHub API rate limit reached or access denied. Try again later or configure a GitHub token.',
      );
    }

    throw new ReviewerError(
      'github_error',
      `GitHub API responded with status ${response.status}`,
    );
  }

  private extractNextLink(linkHeader: string | null): string | null {
    if (!linkHeader) {
      return null;
    }

    const match = /<([^>]+)>;\s*rel="next"/.exec(linkHeader);
    const nextUrl = match?.[1] ?? null;

    if (nextUrl && !nextUrl.startsWith(this.baseUrl)) {
      return null;
    }

    return nextUrl;
  }
}

export function createGitHubClient(
  options: GitHubClientOptions = {},
): GitHubClient {
  return new GitHubClient(options);
}
