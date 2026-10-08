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
      <div className="flex flex-col gap-3 sm:flex-row">
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
            className="h-11 pl-9"
            autoComplete="off"
            spellCheck={false}
            disabled={isLoading}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="h-11 sm:w-40"
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
      {validationError ? (
        <p className="text-sm text-destructive" role="alert">
          {validationError}
        </p>
      ) : null}
    </form>
  );
}
