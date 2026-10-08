import { describe, expect, it } from 'vitest';
import {
  MockAIProvider,
  type AIProviderRequest,
} from '@ai-pr-reviewer/ai-review-engine';
import {
  PatchGenerator,
  buildPatchPrompt,
  parsePatchPayload,
  stripCodeFences,
  validateUnifiedDiff,
} from '@ai-pr-reviewer/patch-generator';
import {
  PATCH_DISCLAIMER,
  type PullRequestContext,
  type ReviewReport,
} from '@ai-pr-reviewer/shared';

const VALID_DIFF = [
  '--- a/src/widget.ts',
  '+++ b/src/widget.ts',
  '@@ -1,3 +1,3 @@',
  ' const widget = 1;',
  '-const broken = true;',
  '+const fixed = false;',
  ' export { widget };',
].join('\n');

function makeReport(): ReviewReport {
  return {
    summary: 'The PR is mostly fine but has a null check bug.',
    bugs: [
      {
        id: 'bug-1-null-check',
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
    risk: {
      score: 40,
      level: 'medium',
      rationale: 'isolated change',
      factors: [],
    },
    provider: 'mock',
    model: 'mock-model',
    generatedAt: '2026-01-03T00:00:00Z',
  };
}

function makeContext(): PullRequestContext {
  const reference = {
    owner: 'acme',
    repo: 'widgets',
    number: 42,
    url: 'https://github.com/acme/widgets/pull/42',
  };
  return {
    reference,
    metadata: {
      reference,
      title: 'Improve widget rendering',
      description: '',
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
      labels: [],
      htmlUrl: 'https://github.com/acme/widgets/pull/42',
    },
    files: [
      {
        path: 'src/widget.ts',
        previousPath: null,
        status: 'modified',
        additions: 5,
        deletions: 2,
        changes: 7,
        sha: 'abc123',
        patch: '@@ -1,3 +1,3 @@\n const widget = 1;\n-const broken = true;\n+const fixed = false;',
      },
    ],
    commits: [
      {
        sha: 'abcdef1234567890',
        message: 'fix: widget',
        authorName: 'Dev',
        authorDate: '2026-01-01T00:00:00Z',
      },
    ],
    fetchedAt: '2026-01-03T00:00:00Z',
  };
}

describe('validateUnifiedDiff', () => {
  it('accepts a valid unified diff and counts changes', () => {
    const result = validateUnifiedDiff(VALID_DIFF);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeNull();
    expect(result.additions).toBe(1);
    expect(result.deletions).toBe(1);
  });

  it('strips code fences before validation', () => {
    const fenced = `\`\`\`diff\n${VALID_DIFF}\n\`\`\``;
    const result = validateUnifiedDiff(fenced);
    expect(result.valid).toBe(true);
    expect(stripCodeFences(fenced)).toContain('--- a/src/widget.ts');
  });

  it('normalizes CRLF line endings', () => {
    const result = validateUnifiedDiff(VALID_DIFF.replace(/\n/g, '\r\n'));
    expect(result.valid).toBe(true);
    expect(result.additions).toBe(1);
  });

  it('rejects empty input', () => {
    expect(validateUnifiedDiff('').valid).toBe(false);
    expect(validateUnifiedDiff('   ').valid).toBe(false);
  });

  it('rejects diffs without hunk headers', () => {
    const result = validateUnifiedDiff('--- a/x.ts\n+++ b/x.ts\n+just a line');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('no @@ hunk headers');
  });

  it('rejects conflict markers', () => {
    const result = validateUnifiedDiff(
      `${VALID_DIFF}\n<<<<<<< HEAD\nstuff\n>>>>>>> other`,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('conflict markers');
  });

  it('rejects prose that is not diff content', () => {
    const result = validateUnifiedDiff('Here is the patch you asked for.');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not valid unified diff content');
  });
});

describe('parsePatchPayload', () => {
  it('parses suggestions with valid diffs', () => {
    const payload = JSON.stringify({
      suggestions: [
        {
          title: 'Guard the null value',
          description: 'Adds a guard clause.',
          targetFindingIds: ['bug-1-null-check', 'unknown-id'],
          files: [{ path: 'src/widget.ts', unifiedDiff: VALID_DIFF }],
        },
      ],
    });

    const result = parsePatchPayload(payload, makeReport(), 6);

    expect(result.disclaimer).toBe(PATCH_DISCLAIMER);
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toMatchObject({
      title: 'Guard the null value',
      targetFindingIds: ['bug-1-null-check'],
    });
    expect(result.suggestions[0].files[0]).toMatchObject({
      path: 'src/widget.ts',
      additions: 1,
      deletions: 1,
    });
  });

  it('drops files with unsafe or absolute paths', () => {
    const payload = JSON.stringify({
      suggestions: [
        {
          title: 'Bad paths',
          description: '',
          targetFindingIds: [],
          files: [
            { path: '/etc/passwd', unifiedDiff: VALID_DIFF },
            { path: '../../escape.ts', unifiedDiff: VALID_DIFF },
            { path: 'src/ok.ts', unifiedDiff: VALID_DIFF },
          ],
        },
      ],
    });

    const result = parsePatchPayload(payload, makeReport(), 6);
    expect(result.suggestions[0].files.map((file) => file.path)).toEqual([
      'src/ok.ts',
    ]);
  });

  it('drops suggestions that contain no valid diffs', () => {
    const payload = JSON.stringify({
      suggestions: [
        {
          title: 'Invalid only',
          description: '',
          targetFindingIds: [],
          files: [{ path: 'src/widget.ts', unifiedDiff: 'not a diff' }],
        },
      ],
    });

    expect(() => parsePatchPayload(payload, makeReport(), 6)).toThrowError(
      /usable patch suggestions/,
    );
  });

  it('caps the number of suggestions', () => {
    const payload = JSON.stringify({
      suggestions: Array.from({ length: 3 }, (_, index) => ({
        title: `Suggestion ${index}`,
        description: '',
        targetFindingIds: [],
        files: [{ path: `src/file${index}.ts`, unifiedDiff: VALID_DIFF }],
      })),
    });

    const result = parsePatchPayload(payload, makeReport(), 1);
    expect(result.suggestions).toHaveLength(1);
  });

  it('throws patch_generation_failed when payload has no suggestions', () => {
    expect(() =>
      parsePatchPayload(JSON.stringify({ suggestions: [] }), makeReport(), 6),
    ).toThrowError(/usable patch suggestions/);
  });
});

describe('buildPatchPrompt', () => {
  it('includes findings, review summary, and file diffs', () => {
    const prompt = buildPatchPrompt(makeContext(), makeReport(), {
      findingIds: ['bug-1-null-check'],
    });

    expect(prompt).toContain('Findings to address');
    expect(prompt).toContain('bug-1-null-check');
    expect(prompt).toContain('Missing null check');
    expect(prompt).toContain('src/widget.ts');
    expect(prompt).toContain('Output requirements');
  });
});

describe('PatchGenerator', () => {
  it('generates a patch result through the provider abstraction', async () => {
    const payload = JSON.stringify({
      suggestions: [
        {
          title: 'Add a null guard',
          description: 'Prevents the crash.',
          targetFindingIds: ['bug-1-null-check'],
          files: [{ path: 'src/widget.ts', unifiedDiff: VALID_DIFF }],
        },
      ],
    });

    const provider = new MockAIProvider(() => payload);
    const generator = new PatchGenerator({ provider });

    const result = await generator.generatePatchSuggestions(
      makeContext(),
      makeReport(),
    );

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].files[0].unifiedDiff).toContain('@@ -1,3');
    expect(result.disclaimer).toBe(PATCH_DISCLAIMER);
    expect(provider.requests).toHaveLength(1);
    expect(provider.requests[0].temperature).toBe(0.1);
  });

  it('passes finding selections through to the prompt', async () => {
    const requests: AIProviderRequest[] = [];
    const provider = new MockAIProvider((request) => {
      requests.push(request);
      return JSON.stringify({
        suggestions: [
          {
            title: 'Fix',
            description: '',
            targetFindingIds: [],
            files: [{ path: 'src/widget.ts', unifiedDiff: VALID_DIFF }],
          },
        ],
      });
    });
    const generator = new PatchGenerator({ provider });

    await generator.generatePatchSuggestions(makeContext(), makeReport(), {
      findingIds: ['bug-1-null-check'],
    });

    expect(requests[0].prompt).toContain('bug-1-null-check');
  });

  it('surfaces a clear error when the model returns unusable diffs', async () => {
    const provider = new MockAIProvider(() =>
      JSON.stringify({
        suggestions: [
          {
            title: 'Garbage',
            description: '',
            targetFindingIds: [],
            files: [{ path: 'src/widget.ts', unifiedDiff: 'lorem ipsum' }],
          },
        ],
      }),
    );
    const generator = new PatchGenerator({ provider });

    await expect(
      generator.generatePatchSuggestions(makeContext(), makeReport()),
    ).rejects.toMatchObject({ code: 'patch_generation_failed' });
  });
});
