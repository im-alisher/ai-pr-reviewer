import { useEffect, useState } from 'react';
import type { RiskAssessment, RiskLevel } from '@ai-pr-reviewer/shared';
import { cn } from '@/lib/utils';
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

const LEVEL_GRADIENT: Record<RiskLevel, [string, string]> = {
  low: ['#34d399', '#059669'],
  medium: ['#fbbf24', '#d97706'],
  high: ['#fb923c', '#e11d48'],
  critical: ['#f87171', '#b91c1c'],
};

const GAUGE_SIZE = 136;
const GAUGE_STROKE = 12;
const GAUGE_RADIUS = (GAUGE_SIZE - GAUGE_STROKE) / 2;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

export function RiskScoreCard({ risk }: { risk: RiskAssessment }) {
  const [offset, setOffset] = useState(GAUGE_CIRCUMFERENCE);
  const [fromColor, toColor] = LEVEL_GRADIENT[risk.level];

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setOffset(
        GAUGE_CIRCUMFERENCE * (1 - Math.min(Math.max(risk.score, 0), 100) / 100),
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [risk.score]);

  return (
    <Card className="relative overflow-hidden">
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-1 bg-gradient-to-r',
          LEVEL_BAR[risk.level],
        )}
      />
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Risk Score</CardTitle>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
              LEVEL_BADGE[risk.level],
            )}
          >
            {LEVEL_LABEL[risk.level]}
          </span>
        </div>
        <CardDescription>Overall assessment of this pull request</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-5">
          <div className="relative h-[136px] w-[136px] shrink-0">
            <span
              aria-hidden="true"
              className="absolute inset-5 rounded-full opacity-30 blur-2xl"
              style={{ background: `linear-gradient(135deg, ${fromColor}, ${toColor})` }}
            />
            <svg
              viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}
              className="h-full w-full -rotate-90"
              role="img"
              aria-label={`Risk score ${risk.score} out of 100`}
            >
              <defs>
                <linearGradient id="risk-gauge-gradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={fromColor} />
                  <stop offset="100%" stopColor={toColor} />
                </linearGradient>
              </defs>
              <circle
                cx={GAUGE_SIZE / 2}
                cy={GAUGE_SIZE / 2}
                r={GAUGE_RADIUS}
                fill="none"
                strokeWidth={GAUGE_STROKE}
                className="stroke-muted"
              />
              <circle
                cx={GAUGE_SIZE / 2}
                cy={GAUGE_SIZE / 2}
                r={GAUGE_RADIUS}
                fill="none"
                stroke="url(#risk-gauge-gradient)"
                strokeWidth={GAUGE_STROKE}
                strokeLinecap="round"
                strokeDasharray={GAUGE_CIRCUMFERENCE}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold tabular-nums tracking-tight">
                {risk.score}
              </span>
              <span className="text-[11px] text-muted-foreground">/ 100</span>
            </div>
          </div>
          <p className="min-w-0 text-sm leading-relaxed text-muted-foreground">
            {risk.rationale}
          </p>
        </div>
        {risk.factors.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {risk.factors.map((factor) => (
              <li key={factor} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600" />
                <span className="text-muted-foreground">{factor}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
