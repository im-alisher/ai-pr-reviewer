import type { FindingSeverity } from '../models/review';

const SEVERITY_RANK: Record<FindingSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

export function isFindingSeverity(value: unknown): value is FindingSeverity {
  return typeof value === 'string' && value in SEVERITY_RANK;
}

export function compareSeverity(
  a: FindingSeverity,
  b: FindingSeverity,
): number {
  return SEVERITY_RANK[b] - SEVERITY_RANK[a];
}

export function sortBySeverity<
  T extends { severity: FindingSeverity },
>(findings: readonly T[]): T[] {
  return [...findings].sort((a, b) => compareSeverity(a.severity, b.severity));
}
