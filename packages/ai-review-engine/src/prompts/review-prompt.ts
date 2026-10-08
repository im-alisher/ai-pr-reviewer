import { LIMITS, type PullRequestContext } from '@ai-pr-reviewer/shared';

export const REVIEW_SYSTEM_PROMPT = `You are a senior staff engineer performing a rigorous code review of a GitHub pull request.

You must respond with a single JSON object only. No markdown, no code fences, no commentary before or after the JSON.

JSON schema:
{
  "summary": "3-6 sentence executive summary of what the PR does and overall quality",
  "bugs": [finding],
  "security": [finding],
  "refactoring": [finding],
  "complexity": [{ "title": "string", "description": "string", "impact": "low|medium|high", "file": "string or null" }],
  "risk": { "score": 0-100, "rationale": "string", "factors": ["string"] }
}

finding:
{
  "title": "short title",
  "severity": "critical|high|medium|low|info",
  "description": "what the issue is and why it matters, referencing exact code",
  "file": "repository path or null",
  "line": line number or null,
  "recommendation": "concrete, actionable fix guidance"
}

Rules:
- Only report issues that are visible in or directly implied by the provided diff and metadata.
- Be specific: cite file paths and line numbers whenever possible.
- severity reflects real-world impact: critical = data loss/exposure or crash on common path; high = correctness or security bug; medium = likely bug or significant smell; low = minor improvement; info = observation.
- bugs: logic errors, edge cases, race conditions, error handling gaps, regressions.
- security: injection, authn/authz gaps, secrets, unsafe deserialization, path traversal, SSRF, crypto misuse, dependency risk.
- refactoring: duplication, dead code, unclear naming, missing tests, structure issues.
- risk.score: 0 (routine, low risk) to 100 (dangerous, likely to break production). Consider blast radius, test coverage signals, and finding severities.
- Keep each array concise: strongest findings first, at most ${LIMITS.maxFindingsPerCategory} entries per category.
- Never propose applying changes automatically; recommendations are advisory only.`;

export interface ReviewPromptOptions {
  maxFindingsPerCategory?: number;
}

export function buildReviewPrompt(
  context: PullRequestContext,
  options: ReviewPromptOptions = {},
): string {
  const maxFindings = Math.min(
    options.maxFindingsPerCategory ?? LIMITS.maxFindingsPerCategory,
    LIMITS.maxFindingsPerCategory,
  );
  const { metadata, files, commits, reference } = context;

  const sections: string[] = [];

  sections.push('## Pull request');
  sections.push(`- Repository: ${reference.owner}/${reference.repo}`);
  sections.push(`- URL: ${reference.url}`);
  sections.push(`- Title: ${metadata.title}`);
  sections.push(
    `- Author: ${metadata.author.login} | state: ${metadata.state}${metadata.draft ? ' (draft)' : ''} | labels: ${metadata.labels.join(', ') || 'none'}`,
  );
  sections.push(
    `- Branches: ${metadata.headBranch} -> ${metadata.baseBranch} | commits: ${metadata.commitCount} | files: ${metadata.changedFileCount} | +${metadata.additions} -${metadata.deletions}`,
  );
  sections.push(
    `- Created: ${metadata.createdAt} | updated: ${metadata.updatedAt}`,
  );

  if (metadata.description.trim().length > 0) {
    sections.push('', '## Description', metadata.description.trim());
  }

  sections.push('', '## Commit messages');
  if (commits.length === 0) {
    sections.push('(no commits provided)');
  } else {
    for (const commit of commits) {
      const subject = commit.message.split('\n')[0] ?? '';
      sections.push(`- ${commit.sha.slice(0, 7)} ${subject}`);
    }
  }

  sections.push('', '## Changed files');
  let diffBudget = LIMITS.maxDiffCharsTotal;
  let omitted = 0;

  for (const file of files) {
    const header = `### ${file.path} (${file.status}, +${file.additions} -${file.deletions})`;
    if (file.patch === null) {
      sections.push(`${header}\n(diff unavailable)`);
      continue;
    }
    if (diffBudget <= 0) {
      omitted += 1;
      continue;
    }
    const patch =
      file.patch.length > diffBudget
        ? file.patch.slice(0, diffBudget)
        : file.patch;
    diffBudget -= patch.length;
    sections.push(`${header}\n\`\`\`diff\n${patch}\n\`\`\``);
  }

  if (omitted > 0) {
    sections.push(`(diff for ${omitted} additional file(s) omitted to stay within the analysis budget)`);
  }

  sections.push(
    '',
    `## Output requirements`,
    `Respond with the JSON object only, with up to ${maxFindings} findings per category, strongest first.`,
  );

  return sections.join('\n');
}
