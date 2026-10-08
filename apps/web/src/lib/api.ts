import type {
  AnalyzePullRequestResponse,
  ApiErrorBody,
} from '@ai-pr-reviewer/shared';

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

function toApiClientError(status: number, body: unknown): ApiClientError {
  if (typeof body === 'object' && body !== null) {
    const candidate = body as Partial<ApiErrorBody> & { message?: unknown };
    const rawMessage = candidate.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(' ')
      : typeof rawMessage === 'string' && rawMessage.length > 0
        ? rawMessage
        : 'The request could not be completed.';
    const code =
      typeof candidate.code === 'string' ? candidate.code : 'unknown_error';
    return new ApiClientError(status, code, message);
  }

  return new ApiClientError(
    status,
    'unknown_error',
    `The request failed with status ${status}.`,
  );
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    throw new ApiClientError(
      0,
      'network_error',
      'Could not reach the API. Make sure the backend is running.',
    );
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw toApiClientError(response.status, body);
  }

  return (await response.json()) as T;
}

export async function analyzePullRequest(
  prUrl: string,
): Promise<AnalyzePullRequestResponse> {
  return request<AnalyzePullRequestResponse>('/api/review/analyze', {
    method: 'POST',
    body: JSON.stringify({ prUrl }),
  });
}
