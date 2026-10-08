import { describe, expect, it } from 'vitest';
import {
  MockAIProvider,
  ReviewEngine,
  buildReviewPrompt,
  extractJsonObject,
  normalizeReport,
} from '@ai-pr-reviewer/ai-review-engine';
import {
  LIMITS,
  type PullRequestContext,
  type ReviewReport,
} from '@ai-pr-reviewer/shared';

function makeContext(
  overrides: Partial<PullRequestContext> = {},
): PullRequestContext {
  return {
    reference: {
      owner: 'acme',
      repo: 'widgets',
      number: 42,
      url: 'https://github.com/acme/widgets/pull/42',
    },
    metadata: {
      reference: {
        owner: 'acme',
        repo: 'widgets',
        number: 42,
        url: 'https://github.com/acme/widgets/pull/42',
      },
      title: 'Improve widget rendering',
      description: 'Speeds up widget rendering.',
      state: 'open',
      draft: false,
      author: { login: 'octo', avatarUrl: null, profileUrl: null },
      baseBranch: 'main',
      headBranch: 'perf/widgets',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      mergedAt: null,
      mergeCommitSha: null,
      commentCount: 0,
      reviewCommentCount: 0,
      commitCount: 1,
      changedFileCount: 1,
      additions: 5,
      deletions: 2,
      labels: ['performance'],
      htmlUrl: 'https://github.com/acme/widgets/pull/42',
    },
    files: [
      {
        path: 'src/render.ts',
        previousPath: null,
        status: 'modified',
        additions: 5,
        deletions: 2,
        changes: 7,
        sha: 'abc123',
        patch: '@@ -1,3 +1,3 @@\n-context\n-old\n+new',
      },
    ],
    commits: [
      {
        sha: 'abcdef1234567890',
        message: 'perf: speed up rendering',
        authorName: 'Dev',
        authorDate: '2026-01-01T00:00:00Z',
      },
    ],
    fetchedAt: '2026-01-03T00:00:00Z',
    ...overrides,
  };
}

describe('extractJsonObject', () => {
  it('parses a bare JSON object', () => {
    expect(extractJsonObject('{"summary":"ok"}')).toEqual({ summary: 'ok' });
  });

  it('parses JSON wrapped in markdown fences', () => {
    const content = 'Here you go:\n```json\n{"summary":"ok"}\n```\nThanks!';
    expect(extractJsonObject(content)).toEqual({ summary: 'ok' });
  });

  it('extracts JSON embedded in surrounding prose', () => {
    const content = 'Sure! {"summary":"ok"} hope that helps';
    expect(extractJsonObject(content)).toEqual({ summary: 'ok' });
  });

  it('throws ai_invalid_response for malformed JSON', () => {
    expect(() => extractJsonObject('{"summary": broken}')).toThrowError(
      /malformed JSON/,
    );
  });

  it('throws ai_invalid_response when no object exists', () => {
    expect(() => extractJsonObject('no json here')).toThrowError(
      /did not contain a JSON object/,
    );
  });
});

describe('normalizeReport', () => {
  const origin = { provider: 'mock', model: 'mock-model' };

  it('produces a complete report with defaults for missing fields', () => {
    const report = normalizeReport({}, origin);
    expect(report.summary).toContain('did not produce a summary');
    expect(report.bugs).toEqual([]);
    expect(report.security).toEqual([]);
    expect(report.refactoring).toEqual([]);
    expect(report.complexity).toEqual([]);
    expect(report.risk.score).toBe(0);
    expect(report.risk.level).toBe('low');
    expect(report.provider).toBe('mock');
    expect(report.generatedAt).toBeTruthy();
  });

  it('normalizes severities, aliases, and finding fields', () => {
    const report = normalizeReport(
      {
        summary: '  A solid summary.  ',
        bugs: [
          {
            title: 'Crash on empty input',
            severity: 'major',
            description: 'Dies when input is empty.',
            file: 'src/x.ts',
            line: '42',
            recommendation: 'Guard against empty input.',
          },
          {
            title: 'Weird severity',
            severity: 'banana',
            description: 'desc',
          },
        ],
        security: 'not-an-array',
      },
      origin,
    );

    expect(report.summary).toBe('A solid summary.');
    expect(report.bugs).toHaveLength(2);
    expect(report.bugs[0]).toMatchObject({
      severity: 'high',
      file: 'src/x.ts',
      line: 42,
      category: 'bug',
    });
    expect(report.bugs[1].severity).toBe('medium');
    expect(report.bugs[1].file).toBeNull();
    expect(report.bugs[1].line).toBeNull();
    expect(report.security).toEqual([]);
    expect(new Set(report.bugs.map((bug) => bug.id)).size).toBe(2);
  });

  it('caps findings per category', () => {
    const tooMany = Array.from({ length: 20 }, (_, index) => ({
      title: `Finding ${index}`,
      severity: 'low',
      description: 'd',
    }));
    const report = normalizeReport({ bugs: tooMany }, origin);
    expect(report.bugs).toHaveLength(LIMITS.maxFindingsPerCategory);
  });

  it('clamps risk scores and resolves matching levels', () => {
    const high = normalizeReport(
      { risk: { score: 900, rationale: 'very risky', factors: ['a'] } },
      origin,
    );
    expect(high.risk.score).toBe(100);
    expect(high.risk.level).toBe('critical');

    const low = normalizeReport(
      { risk: { score: -50, rationale: 'fine', factors: [] } },
      origin,
    );
    expect(low.risk.score).toBe(0);
    expect(low.risk.level).toBe('low');

    const nan = normalizeReport({ risk: { score: 'not-a-number' } }, origin);
    expect(nan.risk.score).toBe(0);
    expect(nan.risk.level).toBe('low');
  });

  it('normalizes complexity notes with defaults', () => {
    const report = normalizeReport(
      {
        complexity: [
          { title: 'Nested logic', description: 'deep', impact: 'extreme' },
          { title: 'ok', description: '', impact: 'high', file: 'src/y.ts' },
        ],
      },
      origin,
    );
    expect(report.complexity[0].impact).toBe('medium');
    expect(report.complexity[1].impact).toBe('high');
    expect(report.complexity[1].file).toBe('src/y.ts');
  });
});

describe('buildReviewPrompt', () => {
  it('includes pull request metadata, commits, and diffs', () => {
    const prompt = buildReviewPrompt(makeContext());
    expect(prompt).toContain('Improve widget rendering');
    expect(prompt).toContain('perf: speed up rendering');
    expect(prompt).toContain('src/render.ts');
    expect(prompt).toContain('-old');
    expect(prompt).toContain('+new');
    expect(prompt).toContain('JSON object only');
  });

  it('omits diffs once the analysis budget is exhausted', () => {
    const bigPatch = 'x'.repeat(40_000);
    const context = makeContext({
      files: ['first.ts', 'second.ts', 'third.ts'].map((path) => ({
        path,
        previousPath: null,
        status: 'modified' as const,
        additions: 1,
        deletions: 1,
        changes: 2,
        sha: 's',
        patch: bigPatch,
      })),
    });

    const prompt = buildReviewPrompt(context);
    expect(prompt).toContain('omitted to stay within the analysis budget');
  });
});

describe('ReviewEngine', () => {
  it('generates a normalized report through the provider abstraction', async () => {
    const provider = new MockAIProvider();
    const engine = new ReviewEngine({ provider });

    const report = await engine.generateReview(makeContext());

    expect(report.provider).toBe('mock');
    expect(report.model).toBe('mock-model');
    expect(report.summary.length).toBeGreaterThan(0);
    expect(report.bugs.length).toBeGreaterThan(0);
    expect(report.risk.level).toBeDefined();
    expect(provider.requests).toHaveLength(1);
    expect(provider.requests[0].systemPrompt).toContain('JSON object only');
    expect(provider.requests[0].prompt).toContain('src/render.ts');
  });

  it('handles fenced JSON responses from the provider', async () => {
    const provider = new MockAIProvider(
      () =>
        '```json\n' +
        JSON.stringify({
          summary: 'Fenced summary',
          bugs: [],
          security: [],
          refactoring: [],
          complexity: [],
          risk: { score: 10, rationale: 'low', factors: [] },
        }) +
        '\n```',
    );
    const engine = new ReviewEngine({ provider });

    const report: ReviewReport = await engine.generateReview(makeContext());
    expect(report.summary).toBe('Fenced summary');
    expect(report.risk.score).toBe(10);
  });

  it('throws ai_invalid_response for empty completions', async () => {
    const provider = new MockAIProvider(() => '');
    const engine = new ReviewEngine({ provider });

    await expect(engine.generateReview(makeContext())).rejects.toMatchObject({
      code: 'ai_invalid_response',
    });
  });
});
