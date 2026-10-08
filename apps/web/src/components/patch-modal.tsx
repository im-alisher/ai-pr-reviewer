import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, Wand2 } from 'lucide-react';
import {
  PATCH_DISCLAIMER,
  type PatchResult,
  type ReviewReport,
} from '@ai-pr-reviewer/shared';
import { ApiClientError } from '@/lib/api';
import { generatePatch } from '@/lib/patch-api';
import {
  resultToDiff,
  suggestionToDiff,
  toDiffFilename,
} from '@/lib/patch-export';
import { DiffViewer } from '@/components/diff-viewer';
import { CopyButton, DownloadButton } from '@/components/export-buttons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

type PatchStatus = 'idle' | 'loading' | 'success' | 'error';

interface PatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prUrl: string;
  report: ReviewReport;
}

function PatchModalBody({
  status,
  result,
  errorMessage,
  onRetry,
  findingTitles,
}: {
  status: PatchStatus;
  result: PatchResult | null;
  errorMessage: string | null;
  onRetry: () => void;
  findingTitles: Map<string, string>;
}) {
  if (status === 'loading' || status === 'idle') {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating patch suggestions from the review findings…
        </div>
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Patch generation failed</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{errorMessage}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw />
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="space-y-5" data-testid="patch-result">
      {result.suggestions.map((suggestion) => (
        <section
          key={suggestion.id}
          className="space-y-3 rounded-xl border p-4 transition-shadow hover:shadow-md"
        >
          <header className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-violet-500/30">
                  <Wand2 className="h-4 w-4" />
                </span>
                <h3 className="font-semibold leading-none">
                  {suggestion.title}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyButton
                  text={suggestionToDiff(suggestion)}
                  label="Copy patch"
                />
                <DownloadButton
                  filename={toDiffFilename(suggestion.id)}
                  text={suggestionToDiff(suggestion)}
                />
              </div>
            </div>
            {suggestion.targetFindingIds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {suggestion.targetFindingIds.map((id) => (
                  <Badge key={id} variant="outline" className="max-w-64">
                    <span className="truncate">
                      {findingTitles.get(id) ?? id}
                    </span>
                  </Badge>
                ))}
              </div>
            ) : null}
            {suggestion.description ? (
              <p className="text-sm text-muted-foreground">
                {suggestion.description}
              </p>
            ) : null}
          </header>

          {suggestion.files.map((file) => (
            <div key={file.path} className="space-y-2">
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/50 px-3 py-2">
                <span className="truncate font-mono text-xs font-medium">
                  {file.path}
                </span>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-xs">
                    <span className="text-success">+{file.additions}</span>{' '}
                    <span className="text-destructive">−{file.deletions}</span>
                  </span>
                  <CopyButton text={file.unifiedDiff} label="Copy" />
                </div>
              </div>
              <DiffViewer diff={file.unifiedDiff} />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

export function PatchModal({
  open,
  onOpenChange,
  prUrl,
  report,
}: PatchModalProps) {
  const [status, setStatus] = useState<PatchStatus>('idle');
  const [result, setResult] = useState<PatchResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const findingTitles = useMemo(() => {
    const map = new Map<string, string>();
    for (const finding of [
      ...report.bugs,
      ...report.security,
      ...report.refactoring,
    ]) {
      map.set(finding.id, finding.title);
    }
    return map;
  }, [report]);

  const handleGenerate = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);
    try {
      const response = await generatePatch(prUrl, report);
      setResult(response.result);
      setStatus('success');
    } catch (error) {
      setErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : 'Something went wrong while generating patch suggestions.',
      );
      setStatus('error');
    }
  }, [prUrl, report]);

  useEffect(() => {
    if (open && status === 'idle') {
      void handleGenerate();
    }
  }, [open, status, handleGenerate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suggested Patches</DialogTitle>
          <DialogDescription>
            {PATCH_DISCLAIMER} Copy the unified diff and apply it manually if
            you agree with the suggestion.
          </DialogDescription>
        </DialogHeader>

        <PatchModalBody
          status={status}
          result={result}
          errorMessage={errorMessage}
          onRetry={() => void handleGenerate()}
          findingTitles={findingTitles}
        />

        <DialogFooter>
          {status === 'success' && result ? (
            <>
              <CopyButton
                text={resultToDiff(result)}
                label="Copy all patches"
              />
              <DownloadButton
                filename="ai-pr-reviewer-suggestions.diff"
                text={resultToDiff(result)}
                label="Download all"
              />
            </>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
