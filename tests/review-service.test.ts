import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import {
  MockAIProvider,
  ProviderRegistry,
} from '@ai-pr-reviewer/ai-review-engine';
import { createGitHubClient } from '@ai-pr-reviewer/github-client';
import { ReviewService } from '../apps/api/src/review/review.service';
import type { ReviewReport } from '@ai-pr-reviewer/shared';

const pullJson = {
  number: 42,
  title: 'Fix the widget',
  body: '',
  state: 'open',
  draft: false,
  user: { login: 'octo' },
  base: { ref: 'main' },
  head: { ref: 'fix/widget' },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  merged_at: null,
  merge_commit_sha: null,
  comments: 0,
  review_comments: 0,
  commits: 1,
  changed_files: 1,
  additions: 3,
  deletions: 1,
  labels: [],
  html_url: 'https://github.com/acme/widgets/pull/42',
};

const filesJson = [
  {
    filename: 'src/widget.ts',
    status: 'modified',
    additions: 3,
    deletions: 1,
    changes: 4,
    sha: 'aaa',
    patch: '@@ -1,2 +1,2 @@\n-old\n+new',
  },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createFetchMock(): (url: string) => Promise<Response> {
  return async (url) => {
    if (url.includes('/pulls/42/files')) {
      return jsonResponse(filesJson);
    }
    if (url.includes('/pulls/42/commits')) {
      return jsonResponse([]);
    }
    if (url.includes('/pulls/42')) {
      return jsonResponse(pullJson);
    }
    throw new Error(`unexpected url: ${url}`);
  };
}

function createService(provider: MockAIProvider): ReviewService {
  return new ReviewService({
    githubClient: createGitHubClient({ fetchImpl: createFetchMock() }),
    registry: new ProviderRegistry().register(provider),
    preferredProvider: provider.name,
  });
}

const sampleReport: ReviewReport = {
  summary: 'Sample summary from the client.',
  bugs: [
    {
      id: 'bug-1-missing-null-check',
      title: 'Missing null check',
      severity: 'high',
      description: 'value may be null',
      file: 'src/widget.ts',
      line: 1,
      recommendation: 'Add a null guard',
      category: 'bug',
    },
  ],
  security: [],
  refactoring: [],
  complexity: [],
  risk: { score: 40, level: 'medium', rationale: 'ok', factors: [] },
  provider: 'mock',
  model: 'mock-model',
  generatedAt: '2026-01-03T00:00:00Z',
};

describe('ReviewService', () => {
  it('rejects invalid pull request URLs before any network calls', async () => {
    const provider = new MockAIProvider();
    const service = createService(provider);

    await expect(service.analyze('https://example.com/not-a-pr')).rejects.toMatchObject(
      { code: 'invalid_pr_url', status: 400 },
    );
    expect(provider.requests).toHaveLength(0);
  });

  it('rejects non-string prUrls with invalid_pr_url', async () => {
    const provider = new MockAIProvider();
    const service = createService(provider);

    await expect(
      service.analyze(123 as unknown as string),
    ).rejects.toMatchObject({ code: 'invalid_pr_url', status: 400 });
    expect(provider.requests).toHaveLength(0);
  });

  it('rejects missing or malformed reports with invalid_report', async () => {
    const provider = new MockAIProvider();
    const service = createService(provider);
    const prUrl = 'https://github.com/acme/widgets/pull/42';

    for (const bad of [null, undefined, 42, ['x']]) {
      await expect(
        service.generatePatch(prUrl, bad as unknown as Record<string, unknown>),
      ).rejects.toMatchObject({ code: 'invalid_report', status: 400 });
    }
    expect(provider.requests).toHaveLength(0);
  });

  it('analyzes a pull request through injected dependencies', async () => {
    const provider = new MockAIProvider();
    const service = createService(provider);

    const response = await service.analyze(
      'https://github.com/acme/widgets/pull/42',
    );

    expect(response.pullRequest.title).toBe('Fix the widget');
    expect(response.files).toHaveLength(1);
    expect(response.report.provider).toBe('mock');
    expect(response.report.summary.length).toBeGreaterThan(0);
    expect(provider.requests).toHaveLength(1);
  });

  it('sanitizes client-supplied reports before generating patches', async () => {
    const provider = new MockAIProvider(
      () =>
        JSON.stringify({
          suggestions: [
            {
              title: 'Add a null guard',
              description: 'Prevents the crash.',
              targetFindingIds: ['bug-1-null-check'],
              files: [
                {
                  path: 'src/widget.ts',
                  unifiedDiff: [
                    '--- a/src/widget.ts',
                    '+++ b/src/widget.ts',
                    '@@ -1,2 +1,2 @@',
                    '-old',
                    '+new',
                  ].join('\n'),
                },
              ],
            },
          ],
        }),
    );
    const service = createService(provider);

    const response = await service.generatePatch(
      'https://github.com/acme/widgets/pull/42',
      // intentionally imperfect client payload: corrupted security array and
      // an out-of-range risk score must be sanitized by the service
      {
        summary: 'x',
        bugs: [
          {
            title: 'Missing null check',
            severity: 'high',
            description: 'value may be null',
            file: 'src/widget.ts',
            line: 1,
            recommendation: 'Add a null guard',
          },
        ],
        security: 'corrupted',
        risk: { score: 9999, rationale: 'risky', factors: [] },
      } as unknown as Record<string, unknown>,
      ['bug-1-missing-null-check'],
    );

    expect(response.result.suggestions).toHaveLength(1);
    expect(response.result.suggestions[0].files[0].path).toBe('src/widget.ts');
    const prompt = provider.requests[0].prompt;
    expect(prompt).toContain('bug-1-missing-null-check');
    expect(prompt).toContain('src/widget.ts');
  });

  it('returns patch_generation_failed when no usable suggestion is produced', async () => {
    const provider = new MockAIProvider(
      () => JSON.stringify({ suggestions: [] }),
    );
    const service = createService(provider);

    await expect(
      service.generatePatch(
        'https://github.com/acme/widgets/pull/42',
        sampleReport as unknown as Record<string, unknown>,
      ),
    ).rejects.toMatchObject({ code: 'patch_generation_failed' });
  });

  it('maps missing providers to ai_provider_error', async () => {
    const service = new ReviewService({
      githubClient: createGitHubClient({ fetchImpl: createFetchMock() }),
      registry: new ProviderRegistry(),
      preferredProvider: 'mock',
    });

    await expect(
      service.analyze('https://github.com/acme/widgets/pull/42'),
    ).rejects.toMatchObject({ code: 'ai_provider_error' });
  });
});
