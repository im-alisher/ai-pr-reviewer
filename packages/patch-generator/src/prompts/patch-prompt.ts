import {
  LIMITS,
  type PullRequestContext,
  type ReviewReport,
} from '@ai-pr-reviewer/shared';
import { buildChangedFilesSection } from '@ai-pr-reviewer/ai-review-engine';

export const PATCH_SYSTEM_PROMPT = `You are a senior engineer producing suggested patches for a GitHub pull request review.

You must respond with a single JSON object only. No markdown, no code fences, no commentary before or after the JSON.

JSON schema:
{
  "suggestions": [
    {
      "title": "short title",
      "description": "what the patch changes and why",
      "targetFindingIds": ["finding ids this patch addresses"],
      "files": [
        {
          "path": "repository relative path",
          "unifiedDiff": "unified diff text including --- and +++ headers and @@ hunks"
        }
      ]
    }
  ]
}

Rules:
- Patches are SUGGESTIONS ONLY. They are never applied automatically. Do not include instructions to run commands.
- Each suggestion must directly address one or more of the findings provided in the context.
- Diffs must be valid unified diff format: "--- a/path" and "+++ b/path" headers plus at least one "@@ -l,s +l,s @@" hunk with correct line numbers and matching context from the provided file diffs.
- Keep patches minimal and focused. No unrelated refactors, no formatting-only churn, no new dependencies.
- If no suggestion would clearly improve the pull request, return {"suggestions": []}.
- File paths must be repository-relative with no leading "/" and no "..".
- Maximum ${LIMITS.maxPatchSuggestions} suggestions, ordered by importance.`;

export interface PatchPromptOptions {
  findingIds?: string[];
}

function formatFindings(
  report: ReviewReport,
  findingIds: string[] | undefined,
): string {
  const allFindings = [...report.bugs, ...report.security, ...report.refactoring];
  const selected =
    findingIds && findingIds.length > 0
      ? allFindings.filter((finding) => findingIds.includes(finding.id))
      : allFindings;

  const lines = selected.map(
    (finding) =>
      `- [${finding.id}] (${finding.category}, ${finding.severity}) ${finding.title}${
        finding.file ? ` @ ${finding.file}${finding.line !== null ? `:${finding.line}` : ''}` : ''
      }\n  ${finding.recommendation || finding.description}`,
  );

  if (lines.length === 0) {
    return '(no findings provided; return {"suggestions": []})';
  }

  return lines.join('\n');
}

export function buildPatchPrompt(
  context: PullRequestContext,
  report: ReviewReport,
  options: PatchPromptOptions = {},
): string {
  const { metadata, reference } = context;
  const sections: string[] = [];

  sections.push('## Pull request');
  sections.push(`- Repository: ${reference.owner}/${reference.repo}`);
  sections.push(`- URL: ${reference.url}`);
  sections.push(`- Title: ${metadata.title}`);
  sections.push(
    `- Branches: ${metadata.headBranch} -> ${metadata.baseBranch} | +${metadata.additions} -${metadata.deletions}`,
  );

  sections.push('', '## Review summary', report.summary);

  sections.push('', '## Findings to address', formatFindings(report, options.findingIds));

  sections.push('', buildChangedFilesSection(context));

  sections.push(
    '',
    '## Output requirements',
    'Respond with the JSON object only. Every suggestion must reference real finding ids from the findings list.',
  );

  return sections.join('\n');
}
