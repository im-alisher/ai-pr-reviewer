import { useEffect, useState, type ReactNode } from 'react';
import {
  Bug,
  CheckCircle2,
  FileCode2,
  Gauge,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { ComplexityNote, ReviewReport } from '@ai-pr-reviewer/shared';
import { FindingsSection, type SectionAccent } from '@/components/findings-section';
import { RiskScoreCard } from '@/components/risk-score-card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const ACCENT_TEXT: Record<SectionAccent, string> = {
  rose: 'text-rose-600 dark:text-rose-400',
  amber: 'text-amber-600 dark:text-amber-400',
  sky: 'text-sky-600 dark:text-sky-400',
  fuchsia: 'text-fuchsia-600 dark:text-fuchsia-400',
};

const ACCENT_CHIP = {
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  fuchsia: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
} as const;

interface OverviewTile {
  label: string;
  count: number;
  icon: ReactNode;
  accent: SectionAccent;
}

function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function OverviewTile({ tile }: { tile: OverviewTile }) {
  const count = useCountUp(tile.count);
  const cleared = tile.count === 0;

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-400/40 hover:shadow-lg hover:shadow-violet-500/10">
      <span
        className={cn(
          'grid h-10 w-10 shrink-0 place-items-center rounded-lg',
          cleared ? ACCENT_CHIP.violet : ACCENT_CHIP[tile.accent],
        )}
      >
        {cleared ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          tile.icon
        )}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            'text-2xl font-bold leading-none tabular-nums',
            cleared ? 'text-emerald-600 dark:text-emerald-400' : ACCENT_TEXT[tile.accent],
          )}
        >
          {cleared ? '✓' : count}
        </p>
        <p className="mt-1.5 truncate text-xs text-muted-foreground">
          {tile.label}
        </p>
      </div>
    </div>
  );
}

function OverviewTiles({ tiles }: { tiles: OverviewTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((tile) => (
        <OverviewTile key={tile.label} tile={tile} />
      ))}
    </div>
  );
}

function ComplexitySection({ notes }: { notes: ComplexityNote[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
              ACCENT_CHIP.fuchsia,
            )}
          >
            <Gauge className="h-[18px] w-[18px]" />
          </span>
          <CardTitle>Complexity Notes</CardTitle>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-semibold',
              ACCENT_CHIP.fuchsia,
            )}
          >
            {notes.length}
          </span>
        </div>
        <CardDescription>
          Maintainability and readability observations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No notable complexity concerns detected.
          </p>
        ) : (
          notes.map((note) => (
            <article
              key={note.id}
              className="space-y-2 rounded-lg border border-l-2 border-l-fuchsia-500 p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="secondary" className="capitalize">
                  {note.impact} impact
                </Badge>
                {note.file ? (
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {note.file}
                  </span>
                ) : null}
              </div>
              <h4 className="font-medium leading-snug">{note.title}</h4>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {note.description}
              </p>
            </article>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function ReviewReport({ report }: { report: ReviewReport }) {
  return (
    <div className="space-y-6" data-testid="review-report">
      <OverviewTiles
        tiles={[
          {
            label: 'Potential bugs',
            count: report.bugs.length,
            icon: <Bug className="h-5 w-5" />,
            accent: 'rose',
          },
          {
            label: 'Security findings',
            count: report.security.length,
            icon: <ShieldAlert className="h-5 w-5" />,
            accent: 'amber',
          },
          {
            label: 'Refactoring',
            count: report.refactoring.length,
            icon: <RefreshCw className="h-5 w-5" />,
            accent: 'sky',
          },
          {
            label: 'Complexity notes',
            count: report.complexity.length,
            icon: <Gauge className="h-5 w-5" />,
            accent: 'fuchsia',
          },
        ]}
      />

      <div className="reveal grid gap-6 lg:grid-cols-3" style={{ animationDelay: '140ms' }}>
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
                  ACCENT_CHIP.violet,
                )}
              >
                <Sparkles className="h-[18px] w-[18px]" />
              </span>
              <div className="space-y-1">
                <CardTitle>Executive Summary</CardTitle>
                <CardDescription>
                  What this pull request does and how it reads overall
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {report.summary}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Generated by {report.provider} · {report.model} ·{' '}
              {new Date(report.generatedAt).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <RiskScoreCard risk={report.risk} />
      </div>

      <div className="reveal" style={{ animationDelay: '220ms' }}>
        <FindingsSection
          title="Potential Bugs"
          description="Logic errors, edge cases, and correctness risks"
          icon={<Bug className="h-[18px] w-[18px]" />}
          findings={report.bugs}
          emptyMessage="No potential bugs detected in the analyzed diff."
          accent="rose"
        />
      </div>

      <div className="reveal" style={{ animationDelay: '280ms' }}>
        <FindingsSection
          title="Security Findings"
          description="Vulnerabilities and unsafe practices introduced or touched by this PR"
          icon={<ShieldAlert className="h-[18px] w-[18px]" />}
          findings={report.security}
          emptyMessage="No security findings detected in the analyzed diff."
          accent="amber"
        />
      </div>

      <div className="reveal" style={{ animationDelay: '340ms' }}>
        <FindingsSection
          title="Refactoring Suggestions"
          description="Structure, duplication, and readability improvements"
          icon={<RefreshCw className="h-[18px] w-[18px]" />}
          findings={report.refactoring}
          emptyMessage="No refactoring suggestions for this pull request."
          accent="sky"
        />
      </div>

      <div className="reveal" style={{ animationDelay: '400ms' }}>
        <ComplexitySection notes={report.complexity} />
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <FileCode2 className="h-3.5 w-3.5" />
        Read-only analysis. No code, branches, or pull requests are modified.
      </p>
    </div>
  );
}
