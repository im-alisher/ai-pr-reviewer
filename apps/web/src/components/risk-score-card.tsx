import type { RiskAssessment, RiskLevel } from '@ai-pr-reviewer/shared';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const LEVEL_LABEL: Record<RiskLevel, string> = {
  low: 'Low risk',
  medium: 'Medium risk',
  high: 'High risk',
  critical: 'Critical risk',
};

const LEVEL_BADGE: Record<RiskLevel, string> = {
  low: 'border-transparent bg-success text-success-foreground',
  medium: 'border-transparent bg-warning text-warning-foreground',
  high: 'border-destructive/50 bg-destructive/10 text-destructive',
  critical: 'border-transparent bg-destructive text-destructive-foreground',
};

const LEVEL_BAR: Record<RiskLevel, string> = {
  low: 'bg-success',
  medium: 'bg-warning',
  high: 'bg-destructive/70',
  critical: 'bg-destructive',
};

export function RiskScoreCard({ risk }: { risk: RiskAssessment }) {
  const levelClass = LEVEL_BADGE[risk.level];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Risk Score</CardTitle>
          <span
            className={cn(
              'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
              levelClass,
            )}
          >
            {LEVEL_LABEL[risk.level]}
          </span>
        </div>
        <CardDescription>Overall assessment of this pull request</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <span className="text-5xl font-bold tabular-nums tracking-tight">
            {risk.score}
          </span>
          <span className="pb-1.5 text-sm text-muted-foreground">/ 100</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={risk.score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Risk score"
        >
          <div
            className={cn('h-full rounded-full transition-all', LEVEL_BAR[risk.level])}
            style={{ width: `${risk.score}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">{risk.rationale}</p>
        {risk.factors.length > 0 ? (
          <ul className="space-y-1.5 text-sm">
            {risk.factors.map((factor) => (
              <li key={factor} className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 shrink-0">
                  factor
                </Badge>
                <span className="text-muted-foreground">{factor}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
