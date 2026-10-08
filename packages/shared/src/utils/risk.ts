import { RISK_THRESHOLDS } from '../constants';
import type { RiskAssessment, RiskLevel } from '../models/review';

export function clampRiskScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function resolveRiskLevel(score: number): RiskLevel {
  const clamped = clampRiskScore(score);
  if (clamped < RISK_THRESHOLDS.low) {
    return 'low';
  }
  if (clamped < RISK_THRESHOLDS.medium) {
    return 'medium';
  }
  if (clamped < RISK_THRESHOLDS.high) {
    return 'high';
  }
  return 'critical';
}

export function normalizeRiskAssessment(
  score: number,
  rationale: string,
  factors: string[],
): RiskAssessment {
  const clamped = clampRiskScore(score);
  return {
    score: clamped,
    level: resolveRiskLevel(clamped),
    rationale: rationale.trim(),
    factors: factors.map((factor) => factor.trim()).filter(Boolean).slice(0, 8),
  };
}
