export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type FindingCategory = 'bug' | 'security' | 'refactoring';

export interface ReviewFinding {
  id: string;
  title: string;
  severity: FindingSeverity;
  description: string;
  file: string | null;
  line: number | null;
  recommendation: string;
  category: FindingCategory;
}

export type ComplexityImpact = 'low' | 'medium' | 'high';

export interface ComplexityNote {
  id: string;
  title: string;
  description: string;
  impact: ComplexityImpact;
  file: string | null;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  rationale: string;
  factors: string[];
}

export interface ReviewReport {
  summary: string;
  bugs: ReviewFinding[];
  security: ReviewFinding[];
  refactoring: ReviewFinding[];
  complexity: ComplexityNote[];
  risk: RiskAssessment;
  provider: string;
  model: string;
  generatedAt: string;
}
