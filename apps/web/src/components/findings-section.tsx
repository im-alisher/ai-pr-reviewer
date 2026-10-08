import type { ReactNode } from 'react';
import { CheckCircle2, FileText } from 'lucide-react';
import type { FindingSeverity, ReviewFinding } from '@ai-pr-reviewer/shared';
import { SeverityBadge } from '@/components/severity-badge';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export type SectionAccent = 'rose' | 'amber' | 'sky' | 'fuchsia';

const ACCENT_CHIP: Record<SectionAccent, string> = {
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  fuchsia: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400',
};

const SEVERITY_BORDER: Record<FindingSeverity, string> = {
  critical: 'border-l-destructive',
  high: 'border-l-destructive/70',
  medium: 'border-l-warning',
  low: 'border-l-sky-500',
  info: 'border-l-violet-500',
};

interface FindingsSectionProps {
  title: string;
  description: string;
  icon: ReactNode;
  findings: ReviewFinding[];
  emptyMessage: string;
  accent: SectionAccent;
}

export function FindingsSection({
  title,
  description,
  icon,
  findings,
  emptyMessage,
  accent,
}: FindingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
              ACCENT_CHIP[accent],
            )}
          >
            {icon}
          </span>
          <CardTitle>{title}</CardTitle>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-semibold',
              ACCENT_CHIP[accent],
            )}
          >
            {findings.length}
          </span>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {findings.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2.5 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            {emptyMessage}
          </div>
        ) : (
          findings.map((finding) => (
            <article
              key={finding.id}
              className={cn(
                'space-y-2.5 rounded-lg border border-l-2 p-4 transition-shadow hover:shadow-md',
                SEVERITY_BORDER[finding.severity],
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SeverityBadge severity={finding.severity} />
                {finding.file ? (
                  <span className="inline-flex min-w-0 items-center gap-1.5 font-mono text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {finding.file}
                      {finding.line !== null ? `:${finding.line}` : ''}
                    </span>
                  </span>
                ) : null}
              </div>
              <h4 className="font-medium leading-snug">{finding.title}</h4>
              {finding.description ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {finding.description}
                </p>
              ) : null}
              {finding.recommendation ? (
                <div className="rounded-md bg-muted px-3 py-2 text-sm">
                  <span className="font-medium">Recommendation: </span>
                  <span className="text-muted-foreground">
                    {finding.recommendation}
                  </span>
                </div>
              ) : null}
            </article>
          ))
        )}
      </CardContent>
    </Card>
  );
}
