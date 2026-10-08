export interface DiffValidationResult {
  valid: boolean;
  reason: string | null;
  additions: number;
  deletions: number;
}

const HUNK_HEADER_REGEX = /^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/;

const ALLOWED_LINE_REGEX =
  /^(diff --git |index [0-9a-f]{7,}\.\.[0-9a-f]{7,} |new file mode |deleted file mode |old mode |new mode |similarity index |dissimilarity index |rename from |rename to |copy from |copy to |--- |\+\+\+ |\\ No newline at end of file)/;

export function stripCodeFences(text: string): string {
  const fenced = /```(?:diff|patch)?\s*([\s\S]*?)```/.exec(text);
  if (fenced) {
    return fenced[1].trim();
  }
  return text
    .replace(/^```(?:diff|patch)?\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
}

export function validateUnifiedDiff(rawDiff: string): DiffValidationResult {
  const diff = stripCodeFences(rawDiff).replace(/\r\n/g, '\n').trimEnd();

  if (diff.trim().length === 0) {
    return {
      valid: false,
      reason: 'diff is empty',
      additions: 0,
      deletions: 0,
    };
  }

  const lines = diff.split('\n');
  let hasHunk = false;
  let additions = 0;
  let deletions = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.length === 0) {
      continue;
    }

    if (
      line.startsWith('<<<<<<<') ||
      line.startsWith('>>>>>>>') ||
      line.startsWith('=======')
    ) {
      return {
        valid: false,
        reason: `line ${index + 1} contains conflict markers`,
        additions: 0,
        deletions: 0,
      };
    }

    if (HUNK_HEADER_REGEX.test(line)) {
      hasHunk = true;
      continue;
    }

    if (ALLOWED_LINE_REGEX.test(line)) {
      continue;
    }

    if (line.startsWith('+')) {
      additions += 1;
      continue;
    }

    if (line.startsWith('-')) {
      deletions += 1;
      continue;
    }

    if (line.startsWith(' ') || line.startsWith('\\')) {
      continue;
    }

    return {
      valid: false,
      reason: `line ${index + 1} is not valid unified diff content`,
      additions: 0,
      deletions: 0,
    };
  }

  if (!hasHunk) {
    return {
      valid: false,
      reason: 'diff has no @@ hunk headers',
      additions: 0,
      deletions: 0,
    };
  }

  return { valid: true, reason: null, additions, deletions };
}
