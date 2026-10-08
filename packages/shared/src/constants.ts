export const GITHUB_API_BASE_URL = 'https://api.github.com';

export const GROQ_API_BASE_URL = 'https://api.groq.com/openai/v1';

export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';

export const PATCH_DISCLAIMER =
  'Suggested patches only. Nothing is applied, committed, or pushed automatically.';

export const LIMITS = {
  maxFiles: 50,
  maxCommits: 30,
  maxPatchCharsPerFile: 6_000,
  maxDiffCharsTotal: 60_000,
  maxFindingsPerCategory: 12,
  maxSummaryChars: 6_000,
  maxCommitMessageChars: 500,
  maxPatchSuggestions: 6,
  requestTimeoutMs: 20_000,
  aiTimeoutMs: 90_000,
} as const;

export const RISK_THRESHOLDS = {
  low: 25,
  medium: 50,
  high: 75,
} as const;
