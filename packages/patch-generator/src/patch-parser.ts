import {
  PATCH_DISCLAIMER,
  ReviewerError,
  type PatchFile,
  type PatchResult,
  type PatchSuggestion,
  type ReviewReport,
} from '@ai-pr-reviewer/shared';
import { extractJsonObject } from '@ai-pr-reviewer/ai-review-engine';
import { validateUnifiedDiff } from './unified-diff';

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function isSafeRepositoryPath(path: string): boolean {
  if (path.length === 0 || path.length > 500) {
    return false;
  }
  if (path.startsWith('/') || path.includes('\\')) {
    return false;
  }
  if (path.split('/').some((segment) => segment === '..' || segment === '.')) {
    return false;
  }
  return true;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'patch'
  );
}

function toPatchFile(raw: unknown): PatchFile | null {
  const record = asRecord(raw);
  const path = asString(record.path);
  const unifiedDiff = asString(record.unifiedDiff);

  if (!isSafeRepositoryPath(path)) {
    return null;
  }

  const validation = validateUnifiedDiff(unifiedDiff);
  if (!validation.valid) {
    return null;
  }

  const previousPath = asString(record.previousPath);

  return {
    path,
    previousPath: previousPath.length > 0 ? previousPath : null,
    unifiedDiff: unifiedDiff.replace(/\r\n/g, '\n').trimEnd(),
    additions: validation.additions,
    deletions: validation.deletions,
  };
}

export function parsePatchPayload(
  content: string,
  report: ReviewReport,
  maxSuggestions: number,
): PatchResult {
  const payload = asRecord(extractJsonObject(content));
  const rawSuggestions = Array.isArray(payload.suggestions)
    ? payload.suggestions
    : [];

  const knownFindingIds = new Set(
    [...report.bugs, ...report.security, ...report.refactoring].map(
      (finding) => finding.id,
    ),
  );

  const suggestions: PatchSuggestion[] = [];

  for (const raw of rawSuggestions) {
    if (suggestions.length >= maxSuggestions) {
      break;
    }

    const record = asRecord(raw);
    const title = asString(record.title, 'Suggested patch');
    const files = Array.isArray(record.files)
      ? record.files
          .map(toPatchFile)
          .filter((file): file is PatchFile => file !== null)
      : [];

    if (files.length === 0) {
      continue;
    }

    const targetFindingIds = (
      Array.isArray(record.targetFindingIds) ? record.targetFindingIds : []
    )
      .map((id) => asString(id))
      .filter((id) => id.length > 0 && knownFindingIds.has(id));

    suggestions.push({
      id: `suggestion-${suggestions.length + 1}-${slugify(title)}`,
      title,
      description: asString(record.description),
      targetFindingIds: [...new Set(targetFindingIds)],
      files,
    });
  }

  if (suggestions.length === 0) {
    throw new ReviewerError(
      'patch_generation_failed',
      'The AI did not produce usable patch suggestions for this pull request. Try again, or narrow the findings to address.',
    );
  }

  return {
    suggestions,
    generatedAt: new Date().toISOString(),
    disclaimer: PATCH_DISCLAIMER,
  };
}
