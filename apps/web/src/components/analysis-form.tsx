import { useState, type FormEvent } from 'react';
import { Github, Loader2, Search } from 'lucide-react';
import { isValidPullRequestUrl } from '@ai-pr-reviewer/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AnalysisFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (prUrl: string) => void;
  isLoading: boolean;
}

const EXAMPLES = [
  {
    label: 'facebook/react#1',
    url: 'https://github.com/facebook/react/pull/1',
  },
  {
    label: 'vercel/next.js#1',
    url: 'https://github.com/vercel/next.js/pull/1',
  },
];

export function AnalysisForm({
  value,
  onChange,
  onSubmit,
  isLoading,
}: AnalysisFormProps) {
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = value.trim();

    if (!isValidPullRequestUrl(trimmed)) {
      setValidationError(
        'Enter a public GitHub pull request URL, for example https://github.com/owner/repo/pull/123',
      );
      return;
    }

    setValidationError(null);
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div className="rounded-2xl border bg-card p-2 shadow-xl shadow-violet-500/10 transition focus-within:border-violet-400/60 focus-within:ring-4 focus-within:ring-violet-500/10 dark:shadow-black/40">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Github className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={value}
              onChange={(event) => {
                onChange(event.target.value);
                if (validationError) {
                  setValidationError(null);
                }
              }}
              placeholder="https://github.com/owner/repo/pull/123"
              aria-label="GitHub pull request URL"
              aria-invalid={validationError !== null}
              className="h-11 border-0 bg-transparent pl-9 text-base shadow-none focus-visible:ring-0"
              autoComplete="off"
              spellCheck={false}
              disabled={isLoading}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-11 shadow-lg shadow-violet-500/30 sm:w-44"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Search />
                Analyze PR
              </>
            )}
          </Button>
        </div>
      </div>

      {validationError ? (
        <p className="px-1 text-sm text-destructive" role="alert">
          {validationError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-muted-foreground">
        <span>Try an example:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example.url}
            type="button"
            disabled={isLoading}
            onClick={() => {
              onChange(example.url);
              setValidationError(null);
            }}
            className="rounded-full border bg-muted/60 px-2.5 py-1 font-mono text-[11px] transition hover:border-violet-400 hover:bg-violet-500/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {example.label}
          </button>
        ))}
      </div>
    </form>
  );
}
