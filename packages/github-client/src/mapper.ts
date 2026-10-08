import type {
  ChangedFile,
  ChangedFileStatus,
  PullRequestCommit,
  PullRequestMetadata,
  PullRequestReference,
} from '@ai-pr-reviewer/shared';

export interface RawLabel {
  name?: string;
}

export interface RawUser {
  login?: string;
  avatar_url?: string | null;
  html_url?: string | null;
}

export interface RawBranchRef {
  ref?: string;
}

export interface RawPullRequest {
  number?: number;
  title?: string;
  body?: string | null;
  state?: string;
  draft?: boolean;
  user?: RawUser;
  base?: RawBranchRef;
  head?: RawBranchRef;
  created_at?: string | null;
  updated_at?: string | null;
  merged_at?: string | null;
  merge_commit_sha?: string | null;
  comments?: number;
  review_comments?: number;
  commits?: number;
  changed_files?: number;
  additions?: number;
  deletions?: number;
  labels?: RawLabel[];
  html_url?: string;
}

export interface RawPullRequestFile {
  filename?: string;
  previous_filename?: string | null;
  status?: string;
  additions?: number;
  deletions?: number;
  changes?: number;
  sha?: string | null;
  patch?: string | null;
}

export interface RawCommitAuthor {
  name?: string | null;
  date?: string | null;
}

export interface RawCommit {
  sha?: string;
  commit?: {
    message?: string;
    author?: RawCommitAuthor | null;
  };
}

const KNOWN_FILE_STATUSES: ChangedFileStatus[] = [
  'added',
  'modified',
  'removed',
  'renamed',
  'copied',
  'changed',
];

export function mapPullRequestMetadata(
  raw: RawPullRequest,
  reference: PullRequestReference,
): PullRequestMetadata {
  return {
    reference,
    title: raw.title ?? '(untitled pull request)',
    description: raw.body ?? '',
    state: raw.state === 'closed' ? 'closed' : 'open',
    draft: Boolean(raw.draft),
    author: {
      login: raw.user?.login ?? 'unknown',
      avatarUrl: raw.user?.avatar_url ?? null,
      profileUrl: raw.user?.html_url ?? null,
    },
    baseBranch: raw.base?.ref ?? 'unknown',
    headBranch: raw.head?.ref ?? 'unknown',
    createdAt: raw.created_at ?? '',
    updatedAt: raw.updated_at ?? '',
    mergedAt: raw.merged_at ?? null,
    mergeCommitSha: raw.merge_commit_sha ?? null,
    commentCount: raw.comments ?? 0,
    reviewCommentCount: raw.review_comments ?? 0,
    commitCount: raw.commits ?? 0,
    changedFileCount: raw.changed_files ?? 0,
    additions: raw.additions ?? 0,
    deletions: raw.deletions ?? 0,
    labels: (raw.labels ?? [])
      .map((label) => label.name ?? '')
      .filter(Boolean),
    htmlUrl: raw.html_url ?? reference.url,
  };
}

export function mapChangedFile(raw: RawPullRequestFile): ChangedFile | null {
  if (!raw.filename) {
    return null;
  }

  const status: ChangedFileStatus = KNOWN_FILE_STATUSES.includes(
    raw.status as ChangedFileStatus,
  )
    ? (raw.status as ChangedFileStatus)
    : 'modified';

  return {
    path: raw.filename,
    previousPath: raw.previous_filename ?? null,
    status,
    additions: raw.additions ?? 0,
    deletions: raw.deletions ?? 0,
    changes: raw.changes ?? 0,
    sha: raw.sha ?? null,
    patch: raw.patch ?? null,
  };
}

export function mapCommit(raw: RawCommit): PullRequestCommit | null {
  if (!raw.sha) {
    return null;
  }

  return {
    sha: raw.sha,
    message: raw.commit?.message ?? '',
    authorName: raw.commit?.author?.name ?? null,
    authorDate: raw.commit?.author?.date ?? '',
  };
}
