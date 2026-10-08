export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export interface GitHubClientOptions {
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
  maxFiles?: number;
  maxCommits?: number;
}
