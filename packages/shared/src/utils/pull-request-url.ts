import type { PullRequestReference } from '../models/pull-request';

const PULL_REQUEST_URL_REGEX =
  /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)\/pull\/(\d+)(?:[/?#][^\s]*)?$/;

export function parsePullRequestUrl(rawUrl: string): PullRequestReference | null {
  const match = PULL_REQUEST_URL_REGEX.exec(rawUrl.trim());
  if (!match) {
    return null;
  }

  const [, owner, repo, numberPart] = match;
  const number = Number(numberPart);

  if (!Number.isInteger(number) || number <= 0) {
    return null;
  }

  return {
    owner,
    repo,
    number,
    url: `https://github.com/${owner}/${repo}/pull/${number}`,
  };
}

export function isValidPullRequestUrl(rawUrl: string): boolean {
  return parsePullRequestUrl(rawUrl) !== null;
}
