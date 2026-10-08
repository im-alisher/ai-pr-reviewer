import { ArrowUpRight, GitBranch, GitMerge } from 'lucide-react';
import type { AnalyzePullRequestResponse } from '@ai-pr-reviewer/shared';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

interface PullRequestMetaProps {
  data: AnalyzePullRequestResponse;
}

export function PullRequestMeta({ data }: PullRequestMetaProps) {
  const { pullRequest, files, commits } = data;
  const merged = pullRequest.mergedAt !== null;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={pullRequest.state === 'open' ? 'success' : 'secondary'}>
            {pullRequest.state}
          </Badge>
          {pullRequest.draft ? <Badge variant="outline">draft</Badge> : null}
          {merged ? (
            <Badge variant="secondary">
              <GitMerge className="mr-1 h-3 w-3" />
              merged
            </Badge>
          ) : null}
          {pullRequest.labels.map((label) => (
            <Badge key={label} variant="outline">
              {label}
            </Badge>
          ))}
        </div>
        <CardTitle className="text-xl">
          <a
            href={pullRequest.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-start gap-1 hover:underline"
          >
            #{pullRequest.reference.number}: {pullRequest.title}
            <ArrowUpRight className="mt-1 h-4 w-4 shrink-0" />
          </a>
        </CardTitle>
        <CardDescription>
          {pullRequest.reference.owner}/{pullRequest.reference.repo} by{' '}
          {pullRequest.author.login}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <GitBranch className="h-4 w-4" />
            {pullRequest.headBranch} → {pullRequest.baseBranch}
          </span>
          <span>{files.length} files shown</span>
          <span>{commits.length} commits fetched</span>
          <span className="text-success">+{formatNumber(pullRequest.additions)}</span>
          <span className="text-destructive">−{formatNumber(pullRequest.deletions)}</span>
        </div>
        {pullRequest.description.trim().length > 0 ? (
          <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
            {pullRequest.description}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
