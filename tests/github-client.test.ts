import { describe, expect, it } from 'vitest';
import { GitHubClient, createGitHubClient } from '@ai-pr-reviewer/github-client';
import type { PullRequestReference } from '@ai-pr-reviewer/shared';

const reference: PullRequestReference = {
  owner: 'acme',
  repo: 'widgets',
  number: 42,
  url: 'https://github.com/acme/widgets/pull/42',
};

const pullJson = {
  number: 42,
  title: 'Fix the widget',
  body: 'Fixes a widget bug.',
  state: 'open',
  draft: false,
  user: { login: 'octo', avatar_url: 'https://a', html_url: 'https://b' },
  base: { ref: 'main' },
  head: { ref: 'fix/widget' },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  merged_at: null,
  merge_commit_sha: null,
  comments: 1,
  review_comments: 2,
  commits: 3,
  changed_files: 2,
  additions: 12,
  deletions: 4,
  labels: [{ name: 'bug' }, { name: 'priority' }],
  html_url: 'https://github.com/acme/widgets/pull/42',
};

const filesJson = [
  {
    filename: 'src/widget.ts',
    status: 'modified',
    additions: 10,
    deletions: 3,
    changes: 13,
    sha: 'aaa111',
    patch: '@@ -1,2 +1,2 @@\n-old\n+new',
  },
  {
    filename: 'docs/readme.md',
    previous_filename: 'docs/README.md',
    status: 'renamed',
    additions: 2,
    deletions: 1,
    changes: 3,
    sha: 'bbb222',
  },
];

const commitsJson = [
  {
    sha: 'abcdef1234567890',
    commit: {
      message: 'fix: repair widget\n\nDetails here.',
      author: { name: 'Dev', date: '2026-01-01T00:00:00Z' },
    },
  },
];

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

describe('GitHubClient', () => {
  it('fetches and maps a full pull request context', async () => {
    const client = new GitHubClient({
      fetchImpl: async (url) => {
        if (url.includes('/pulls/42/files')) {
          return jsonResponse(filesJson);
        }
        if (url.includes('/pulls/42/commits')) {
          return jsonResponse(commitsJson);
        }
        if (url.includes('/pulls/42')) {
          return jsonResponse(pullJson);
        }
        throw new Error(`unexpected url: ${url}`);
      },
    });

    const context = await client.fetchPullRequestContext(reference);

    expect(context.reference).toEqual(reference);
    expect(context.metadata.title).toBe('Fix the widget');
    expect(context.metadata.author.login).toBe('octo');
    expect(context.metadata.labels).toEqual(['bug', 'priority']);
    expect(context.metadata.baseBranch).toBe('main');
    expect(context.metadata.headBranch).toBe('fix/widget');
    expect(context.files).toHaveLength(2);
    expect(context.files[0]).toMatchObject({
      path: 'src/widget.ts',
      status: 'modified',
      patch: '@@ -1,2 +1,2 @@\n-old\n+new',
    });
    expect(context.files[1]).toMatchObject({
      previousPath: 'docs/README.md',
      status: 'renamed',
      patch: null,
    });
    expect(context.commits[0]).toMatchObject({
      sha: 'abcdef1234567890',
      authorName: 'Dev',
    });
    expect(context.commits[0].message).toContain('fix: repair widget');
    expect(context.fetchedAt).toBeTruthy();
  });

  it('follows pagination link headers up to the item limit', async () => {
    const firstFile = {
      filename: 'a.ts',
      status: 'modified',
      additions: 1,
      deletions: 0,
      changes: 1,
      sha: 's1',
      patch: '@@ -1 +1 @@\n-a\n+b',
    };
    const secondFile = {
      filename: 'b.ts',
      status: 'added',
      additions: 1,
      deletions: 0,
      changes: 1,
      sha: 's2',
      patch: '@@ -0,0 +1 @@\n+c',
    };

    const client = new GitHubClient({
      fetchImpl: async (url) => {
        if (url.includes('/pulls/42/commits')) {
          return jsonResponse([]);
        }
        if (url.includes('/pulls/42/files')) {
          if (url.includes('page=2')) {
            return jsonResponse([secondFile]);
          }
          return jsonResponse([firstFile], {
            headers: {
              link: '<https://api.github.com/repos/acme/widgets/pulls/42/files?page=2>; rel="next"',
            },
          });
        }
        return jsonResponse(pullJson);
      },
    });

    const context = await client.fetchPullRequestContext(reference);
    expect(context.files.map((file) => file.path)).toEqual(['a.ts', 'b.ts']);
  });

  it('does not follow next links that leave the GitHub API host', async () => {
    const client = new GitHubClient({
      baseUrl: 'https://api.github.com',
      fetchImpl: async (url) => {
        if (url.includes('/pulls/42/commits')) {
          return jsonResponse([]);
        }
        if (url.includes('/pulls/42/files')) {
          if (url.includes('evil.example')) {
            throw new Error('must not request external hosts');
          }
          return jsonResponse([], {
            headers: {
              link: '<https://evil.example/steal?page=2>; rel="next"',
            },
          });
        }
        return jsonResponse(pullJson);
      },
    });

    const context = await client.fetchPullRequestContext(reference);
    expect(context.files).toHaveLength(0);
  });

  it('attaches the bearer token only for configured base URLs', async () => {
    const seenAuthorizations: Array<string | undefined> = [];
    const client = createGitHubClient({
      token: 'test-token',
      fetchImpl: async (url, init) => {
        const headers = init?.headers as Record<string, string> | undefined;
        seenAuthorizations.push(headers?.Authorization);
        if (url.includes('/pulls/42/files')) {
          return jsonResponse([]);
        }
        if (url.includes('/pulls/42/commits')) {
          return jsonResponse([]);
        }
        return jsonResponse(pullJson);
      },
    });

    await client.fetchPullRequestContext(reference);
    expect(seenAuthorizations).toHaveLength(3);
    expect(seenAuthorizations.every((value) => value === 'Bearer test-token')).toBe(
      true,
    );
  });

  it('omits authorization when no token is configured', async () => {
    let authorization: string | undefined;
    const client = new GitHubClient({
      fetchImpl: async (url, init) => {
        const headers = init?.headers as Record<string, string> | undefined;
        authorization = headers?.Authorization;
        if (url.includes('/pulls/42/files')) {
          return jsonResponse([]);
        }
        if (url.includes('/pulls/42/commits')) {
          return jsonResponse([]);
        }
        return jsonResponse(pullJson);
      },
    });

    await client.fetchPullRequestContext(reference);
    expect(authorization).toBeUndefined();
  });

  it('maps 404 responses to pull_request_not_found', async () => {
    const client = new GitHubClient({
      fetchImpl: async () => jsonResponse({ message: 'Not Found' }, { status: 404 }),
    });

    await expect(
      client.fetchPullRequestContext(reference),
    ).rejects.toMatchObject({
      code: 'pull_request_not_found',
      status: 404,
    });
  });

  it('maps 403 responses to github_rate_limited', async () => {
    const client = new GitHubClient({
      fetchImpl: async () => jsonResponse({ message: 'rate limited' }, { status: 403 }),
    });

    await expect(
      client.fetchPullRequestContext(reference),
    ).rejects.toMatchObject({ code: 'github_rate_limited', status: 429 });
  });

  it('maps network failures to github_error', async () => {
    const client = new GitHubClient({
      fetchImpl: async () => {
        throw new Error('connection reset');
      },
    });

    await expect(
      client.fetchPullRequestContext(reference),
    ).rejects.toMatchObject({ code: 'github_error', status: 502 });
  });

  it('truncates oversized patches and commit messages', async () => {
    const hugePatch = `+${'x'.repeat(7_000)}`;
    const hugeMessage = 'y'.repeat(700);

    const client = new GitHubClient({
      fetchImpl: async (url) => {
        if (url.includes('/pulls/42/files')) {
          return jsonResponse([
            {
              filename: 'big.ts',
              status: 'modified',
              additions: 1,
              deletions: 0,
              changes: 1,
              sha: 's',
              patch: hugePatch,
            },
          ]);
        }
        if (url.includes('/pulls/42/commits')) {
          return jsonResponse([
            {
              sha: 'abcdef1234567890',
              commit: {
                message: hugeMessage,
                author: { name: 'Dev', date: '2026-01-01T00:00:00Z' },
              },
            },
          ]);
        }
        return jsonResponse(pullJson);
      },
    });

    const context = await client.fetchPullRequestContext(reference);
    expect(context.files[0].patch).toContain('[diff truncated]');
    expect(context.commits[0].message).toContain('[message truncated]');
  });
});
