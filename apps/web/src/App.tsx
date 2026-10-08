import { useState } from 'react';
import { AlertCircle, Sparkles, Wand2 } from 'lucide-react';
import type { AnalyzePullRequestResponse } from '@ai-pr-reviewer/shared';
import { analyzePullRequest, ApiClientError } from '@/lib/api';
import { AnalysisForm } from '@/components/analysis-form';
import { PatchModal } from '@/components/patch-modal';
import { PullRequestMeta } from '@/components/pull-request-meta';
import { ReviewReport } from '@/components/review-report';
import { ThemeToggle } from '@/components/theme-toggle';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

function AnalysisSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Analyzing pull request">
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
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
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-semibold sm:text-base">
              GitHub PR Reviewer
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6">
        <section className="mb-8 space-y-3 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Review any public pull request with AI
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Paste a public GitHub pull request URL to get a summary, potential
            bugs, security findings, refactoring suggestions, and a risk score.
            Nothing is ever modified automatically.
          </p>
        </section>

        <section className="mx-auto max-w-3xl">
          <AnalysisForm
            value={prUrl}
            onChange={setPrUrl}
            onSubmit={(url) => void handleSubmit(url)}
            isLoading={status === 'loading'}
          />
        </section>

        <section className="mt-8 space-y-4">
          {status === 'error' && errorMessage ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Analysis failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {status === 'loading' ? <AnalysisSkeleton /> : null}

          {status === 'success' && data ? (
            <div className="space-y-6">
              <PullRequestMeta data={data} />
              <ReviewReport report={data.report} />
              <div className="flex justify-center">
                <Button
                  size="lg"
                  className="h-11 px-6"
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
