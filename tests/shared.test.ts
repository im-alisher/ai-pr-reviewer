import { describe, expect, it } from 'vitest';
import {
  clampRiskScore,
  isFindingSeverity,
  isValidPullRequestUrl,
  normalizeRiskAssessment,
  parsePullRequestUrl,
  resolveRiskLevel,
  sortBySeverity,
} from '@ai-pr-reviewer/shared';

describe('parsePullRequestUrl', () => {
  it('parses a canonical pull request URL', () => {
    const reference = parsePullRequestUrl(
      'https://github.com/facebook/react/pull/40000',
    );
    expect(reference).toEqual({
      owner: 'facebook',
      repo: 'react',
      number: 40000,
      url: 'https://github.com/facebook/react/pull/40000',
    });
  });

  it('accepts http, www, and trailing subpaths', () => {
    expect(
      parsePullRequestUrl('http://www.github.com/owner/repo/pull/7/files'),
    ).toMatchObject({ owner: 'owner', repo: 'repo', number: 7 });
    expect(
      parsePullRequestUrl('https://github.com/owner/repo/pull/7#discussion'),
    ).toMatchObject({ number: 7 });
    expect(
      parsePullRequestUrl('https://github.com/owner/repo/pull/7/'),
    ).toMatchObject({ number: 7 });
  });

  it('rejects malformed URLs', () => {
    expect(parsePullRequestUrl('not-a-url')).toBeNull();
    expect(parsePullRequestUrl('https://gitlab.com/owner/repo/pull/1')).toBeNull();
    expect(parsePullRequestUrl('git@github.com:owner/repo.git')).toBeNull();
    expect(parsePullRequestUrl('https://github.com/owner/repo/pull/0')).toBeNull();
    expect(
      parsePullRequestUrl('https://github.com/owner/repo/pull/abc'),
    ).toBeNull();
    expect(parsePullRequestUrl('')).toBeNull();
  });

  it('validates URLs through isValidPullRequestUrl', () => {
    expect(
      isValidPullRequestUrl('https://github.com/owner/repo/pull/123'),
    ).toBe(true);
    expect(isValidPullRequestUrl('https://example.com/pull/123')).toBe(false);
  });
});

describe('risk utilities', () => {
  it('clamps scores into the 0-100 range', () => {
    expect(clampRiskScore(150)).toBe(100);
    expect(clampRiskScore(-20)).toBe(0);
    expect(clampRiskScore(42.6)).toBe(43);
    expect(clampRiskScore(Number.NaN)).toBe(0);
    expect(clampRiskScore(Number.POSITIVE_INFINITY)).toBe(100);
  });

  it('resolves risk levels from score thresholds', () => {
    expect(resolveRiskLevel(0)).toBe('low');
    expect(resolveRiskLevel(24)).toBe('low');
    expect(resolveRiskLevel(25)).toBe('medium');
    expect(resolveRiskLevel(49)).toBe('medium');
    expect(resolveRiskLevel(50)).toBe('high');
    expect(resolveRiskLevel(74)).toBe('high');
    expect(resolveRiskLevel(75)).toBe('critical');
    expect(resolveRiskLevel(100)).toBe('critical');
  });

  it('normalizes risk assessments', () => {
    const risk = normalizeRiskAssessment(
      250,
      '  Dangerous change  ',
      ['  factor one  ', '', 'factor two'],
    );
    expect(risk).toEqual({
      score: 100,
      level: 'critical',
      rationale: 'Dangerous change',
      factors: ['factor one', 'factor two'],
    });
  });
});

describe('severity utilities', () => {
  it('recognizes valid severities', () => {
    expect(isFindingSeverity('critical')).toBe(true);
    expect(isFindingSeverity('nope')).toBe(false);
    expect(isFindingSeverity(3)).toBe(false);
  });

  it('sorts findings by severity, strongest first', () => {
    const sorted = sortBySeverity([
      { severity: 'low' as const },
      { severity: 'critical' as const },
      { severity: 'medium' as const },
      { severity: 'high' as const },
    ]);
    expect(sorted.map((entry) => entry.severity)).toEqual([
      'critical',
      'high',
      'medium',
      'low',
    ]);
  });
});
