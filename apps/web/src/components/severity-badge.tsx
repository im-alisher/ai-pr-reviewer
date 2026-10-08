import type { FindingSeverity } from '@ai-pr-reviewer/shared';
import { cn } from '@/lib/utils';

const SEVERITY_STYLES: Record<FindingSeverity, string> = {
  critical: 'border-transparent bg-destructive text-destructive-foreground',
  high: 'border-destructive/50 bg-destructive/10 text-destructive',
  medium: 'border-transparent bg-warning text-warning-foreground',
  low: 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  info: 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400',
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
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize',
        SEVERITY_STYLES[severity],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {severity}
    </span>
  );
}
