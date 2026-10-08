export interface PullRequestReference {
  owner: string;
  repo: string;
  number: number;
  url: string;
}

export interface PullRequestAuthor {
  login: string;
  avatarUrl: string | null;
  profileUrl: string | null;
}

export type PullRequestState = 'open' | 'closed';

export type ChangedFileStatus =
  | 'added'
  | 'modified'
  | 'removed'
  | 'renamed'
  | 'copied'
  | 'changed';

export interface PullRequestMetadata {
  reference: PullRequestReference;
  title: string;
  description: string;
  state: PullRequestState;
  draft: boolean;
  author: PullRequestAuthor;
  baseBranch: string;
  headBranch: string;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  mergeCommitSha: string | null;
  commentCount: number;
  reviewCommentCount: number;
  commitCount: number;
  changedFileCount: number;
  additions: number;
  deletions: number;
  labels: string[];
  htmlUrl: string;
}

export interface ChangedFile {
  path: string;
  previousPath: string | null;
  status: ChangedFileStatus;
  additions: number;
  deletions: number;
  changes: number;
  sha: string | null;
  patch: string | null;
}

export interface PullRequestCommit {
  sha: string;
  message: string;
  authorName: string | null;
  authorDate: string;
}

export interface PullRequestContext {
  reference: PullRequestReference;
  metadata: PullRequestMetadata;
  files: ChangedFile[];
  commits: PullRequestCommit[];
  fetchedAt: string;
}
