import {
  LIMITS,
  ReviewerError,
  isFindingSeverity,
  normalizeRiskAssessment,
  type ComplexityImpact,
  type ComplexityNote,
  type FindingCategory,
  type FindingSeverity,
  type ReviewFinding,
  type ReviewReport,
} from '@ai-pr-reviewer/shared';

const SEVERITY_ALIASES: Record<string, FindingSeverity> = {
  critical: 'critical',
  blocker: 'critical',
  high: 'high',
  major: 'high',
  medium: 'medium',
  moderate: 'medium',
  warning: 'medium',
  low: 'low',
  minor: 'low',
  info: 'info',
  informational: 'info',
  note: 'info',
};

const IMPACT_ALIASES: Record<string, ComplexityImpact> = {
  low: 'low',
  medium: 'medium',
  moderate: 'medium',
  high: 'high',
};

export function extractJsonObject(content: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(content);
  const candidate = fenced?.[1] ?? content;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');

  if (start === -1 || end <= start) {
    throw new ReviewerError(
      'ai_invalid_response',
      'The AI response did not contain a JSON object.',
    );
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ReviewerError(
      'ai_invalid_response',
      `The AI response contained malformed JSON: ${message}`,
    );
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asNullableString(value: unknown): string | null {
  const text = asString(value);
  return text.length > 0 ? text : null;
}

function asLine(value: unknown): number | null {
  const line =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;
  return Number.isInteger(line) && line > 0 ? line : null;
}

function asSeverity(value: unknown): FindingSeverity {
  if (isFindingSeverity(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const alias = SEVERITY_ALIASES[value.trim().toLowerCase()];
    if (alias) {
      return alias;
    }
  }
  return 'medium';
}

function asImpact(value: unknown): ComplexityImpact {
  if (typeof value === 'string') {
    const alias = IMPACT_ALIASES[value.trim().toLowerCase()];
    if (alias) {
      return alias;
    }
  }
  return 'medium';
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'finding';
}

function toFinding(
  raw: unknown,
  category: FindingCategory,
  index: number,
): ReviewFinding {
  const record = asRecord(raw);
  const title = asString(record.title, `Untitled ${category} finding`);

  return {
    id: `${category}-${index + 1}-${slugify(title)}`,
    title,
    severity: asSeverity(record.severity),
    description: asString(record.description),
    file: asNullableString(record.file),
    line: asLine(record.line),
    recommendation: asString(record.recommendation),
    category,
  };
}

function toFindings(
  raw: unknown,
  category: FindingCategory,
  maxItems: number,
): ReviewFinding[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((entry) => typeof entry === 'object' && entry !== null)
    .slice(0, maxItems)
    .map((entry, index) => toFinding(entry, category, index));
}

function toComplexityNotes(raw: unknown): ComplexityNote[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((entry) => typeof entry === 'object' && entry !== null)
    .slice(0, LIMITS.maxFindingsPerCategory)
    .map((entry, index) => {
      const record = asRecord(entry);
      const title = asString(record.title, 'Untitled complexity note');
      return {
        id: `complexity-${index + 1}-${slugify(title)}`,
        title,
        description: asString(record.description),
        impact: asImpact(record.impact),
        file: asNullableString(record.file),
      };
    });
}

export interface ReportOrigin {
  provider: string;
  model: string;
}

export function normalizeReport(
  payload: unknown,
  origin: ReportOrigin,
): ReviewReport {
  const record = asRecord(payload);
  const risk = asRecord(record.risk);
  const factors = Array.isArray(risk.factors)
    ? risk.factors.map((factor) => asString(factor)).filter(Boolean)
    : [];

  return {
    summary: asString(
      record.summary,
      'The review model did not produce a summary for this pull request.',
    ).slice(0, LIMITS.maxSummaryChars),
    bugs: toFindings(record.bugs, 'bug', LIMITS.maxFindingsPerCategory),
    security: toFindings(
      record.security,
      'security',
      LIMITS.maxFindingsPerCategory,
    ),
    refactoring: toFindings(
      record.refactoring,
      'refactoring',
      LIMITS.maxFindingsPerCategory,
    ),
    complexity: toComplexityNotes(record.complexity),
    risk: normalizeRiskAssessment(
      typeof risk.score === 'number' ? risk.score : Number(risk.score),
      asString(risk.rationale, 'No risk rationale was provided.'),
      factors,
    ),
    provider: origin.provider,
    model: origin.model,
    generatedAt: new Date().toISOString(),
  };
}
