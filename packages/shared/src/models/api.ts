import type {
  ChangedFile,
  PullRequestCommit,
  PullRequestMetadata,
} from './pull-request';
import type { PatchResult } from './patch';
import type { ReviewReport } from './review';

export interface AnalyzePullRequestRequest {
  prUrl: string;
}

export interface AnalyzePullRequestResponse {
  pullRequest: PullRequestMetadata;
  files: ChangedFile[];
  commits: PullRequestCommit[];
  report: ReviewReport;
}

export interface GeneratePatchRequest {
  prUrl: string;
  report: ReviewReport;
  findingIds?: string[];
}

export interface GeneratePatchResponse {
  result: PatchResult;
}

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
}

export interface HealthResponse {
  status: 'ok';
  service: string;
  time: string;
}
