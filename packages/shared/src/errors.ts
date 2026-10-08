export type ReviewerErrorCode =
  | 'invalid_pr_url'
  | 'invalid_report'
  | 'pull_request_not_found'
  | 'github_rate_limited'
  | 'github_error'
  | 'ai_missing_api_key'
  | 'ai_provider_error'
  | 'ai_invalid_response'
  | 'patch_generation_failed'
  | 'internal_error';

const DEFAULT_STATUS_BY_CODE: Record<ReviewerErrorCode, number> = {
  invalid_pr_url: 400,
  invalid_report: 400,
  pull_request_not_found: 404,
  github_rate_limited: 429,
  github_error: 502,
  ai_missing_api_key: 503,
  ai_provider_error: 502,
  ai_invalid_response: 502,
  patch_generation_failed: 502,
  internal_error: 500,
};

export class ReviewerError extends Error {
  readonly code: ReviewerErrorCode;
  readonly status: number;

  constructor(code: ReviewerErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'ReviewerError';
    this.code = code;
    this.status = status ?? DEFAULT_STATUS_BY_CODE[code];
  }
}

export function isReviewerError(error: unknown): error is ReviewerError {
  return error instanceof ReviewerError;
}
