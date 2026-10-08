import type { ReactNode } from 'react';
import { CheckCircle2, FileText } from 'lucide-react';
import type { ReviewFinding } from '@ai-pr-reviewer/shared';
import { SeverityBadge } from '@/components/severity-badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface FindingsSectionProps {
  title: string;
  description: string;
  icon: ReactNode;
  findings: ReviewFinding[];
  emptyMessage: string;
}

export function FindingsSection({
  title,
  description,
  icon,
  findings,
  emptyMessage,
}: FindingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle>{title}</CardTitle>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
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
              className="space-y-2.5 rounded-lg border p-4"
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
