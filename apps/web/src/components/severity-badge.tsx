import type { FindingSeverity } from '@ai-pr-reviewer/shared';
import { cn } from '@/lib/utils';

const SEVERITY_STYLES: Record<FindingSeverity, string> = {
  critical: 'border-transparent bg-destructive text-destructive-foreground',
  high: 'border-destructive/50 bg-destructive/10 text-destructive',
  medium: 'border-transparent bg-warning text-warning-foreground',
  low: 'border-transparent bg-secondary text-secondary-foreground',
  info: 'border-transparent bg-muted text-muted-foreground',
};

export function SeverityBadge({
  severity,
  className,
}: {
  severity: FindingSeverity;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
        SEVERITY_STYLES[severity],
        className,
      )}
    >
      {severity}
    </span>
  );
}
