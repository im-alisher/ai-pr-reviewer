import { useState } from 'react';
import { AlertCircle, Bug, Gauge, RefreshCw, ShieldAlert, Sparkles, Wand2 } from 'lucide-react';
import type { AnalyzePullRequestResponse } from '@ai-pr-reviewer/shared';
import { analyzePullRequest, ApiClientError } from '@/lib/api';
import { AnalysisForm } from '@/components/analysis-form';
import { PatchModal } from '@/components/patch-modal';
import { PullRequestMeta } from '@/components/pull-request-meta';
import { ReviewReport } from '@/components/review-report';
import { ThemeToggle } from '@/components/theme-toggle';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

const HIGHLIGHTS = [
  { icon: Bug, label: 'Potential bugs', chip: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  { icon: ShieldAlert, label: 'Security findings', chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { icon: RefreshCw, label: 'Refactoring ideas', chip: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  { icon: Gauge, label: 'Risk score', chip: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400' },
] as const;

function AnalysisSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Analyzing pull request">
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-44 rounded-xl lg:col-span-2" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-56 rounded-xl" />
    </div>
  );
}

export default function App() {
  const [prUrl, setPrUrl] = useState('');
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [data, setData] = useState<AnalyzePullRequestResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [patchOpen, setPatchOpen] = useState(false);

  async function handleSubmit(url: string): Promise<void> {
    setStatus('loading');
    setErrorMessage(null);
    setData(null);

    try {
      const result = await analyzePullRequest(url);
      setData(result);
      setStatus('success');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Something went wrong while analyzing the pull request.';
      setErrorMessage(message);
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-violet-500/30">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold sm:text-base">
              GitHub PR Reviewer
            </span>
            <Badge
              variant="secondary"
              className="hidden gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:inline-flex"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              read-only
            </Badge>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-12 sm:px-6">
        <section className="relative mb-10 space-y-5 text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-28 left-1/2 -z-10 h-[380px] w-[760px] -translate-x-1/2"
          >
            <div className="animate-blob absolute left-4 top-0 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />
            <div
              className="animate-blob absolute right-6 top-12 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl"
              style={{ animationDelay: '-5s' }}
            />
            <div
              className="animate-blob absolute left-1/3 top-28 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl"
              style={{ animationDelay: '-9s' }}
            />
          </div>

          <h1 className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text pb-1 text-4xl font-bold leading-[1.15] tracking-tight text-transparent sm:text-5xl">
            Review any public pull request with AI
          </h1>
          <p className="mx-auto max-w-2xl text-balance text-muted-foreground">
            Paste a GitHub pull request URL to get a summary, potential bugs,
            security findings, refactoring suggestions, and a risk score.
            Nothing is ever modified automatically.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {HIGHLIGHTS.map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur"
              >
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full ${item.chip}`}
                >
                  <item.icon className="h-3 w-3" />
                </span>
                {item.label}
              </span>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl">
          <AnalysisForm
            value={prUrl}
            onChange={setPrUrl}
            onSubmit={(url) => void handleSubmit(url)}
            isLoading={status === 'loading'}
          />
        </section>

        <section className="mt-10 space-y-4">
          {status === 'error' && errorMessage ? (
            <Alert variant="destructive" className="reveal">
              <AlertCircle />
              <AlertTitle>Analysis failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {status === 'loading' ? <AnalysisSkeleton /> : null}

          {status === 'success' && data ? (
            <div className="space-y-6">
              <div className="reveal">
                <PullRequestMeta data={data} />
              </div>
              <div className="reveal" style={{ animationDelay: '80ms' }}>
                <ReviewReport report={data.report} />
              </div>
              <div className="reveal flex justify-center" style={{ animationDelay: '160ms' }}>
                <Button
                  size="lg"
                  className="h-11 px-6 shadow-lg shadow-violet-500/30"
                  onClick={() => setPatchOpen(true)}
                >
                  <Wand2 />
                  Generate Patch
                </Button>
              </div>
              <PatchModal
                key={data.report.generatedAt}
                open={patchOpen}
                onOpenChange={setPatchOpen}
                prUrl={prUrl}
                report={data.report}
              />
            </div>
          ) : null}
        </section>
      </main>

      <footer className="border-t py-6">
        <p className="mx-auto max-w-5xl px-4 text-center text-xs text-muted-foreground sm:px-6">
          Read-only analysis. The reviewer never edits code, branches, or pull
          requests.
        </p>
      </footer>
    </div>
  );
}
