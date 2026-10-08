import { useState } from 'react';
import {
  ArrowUpRight,
  FileCode2,
  GitBranch,
  GitMerge,
  History,
  Minus,
  Plus,
} from 'lucide-react';
import type { AnalyzePullRequestResponse } from '@ai-pr-reviewer/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
  const [avatarOk, setAvatarOk] = useState(true);
  const authorLogin = pullRequest.author.login;

  const stats = [
    {
      label: 'Files',
      value: formatNumber(files.length),
      textClass: '',
      chip: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
      icon: <FileCode2 className="h-[18px] w-[18px]" />,
    },
    {
      label: 'Commits',
      value: formatNumber(commits.length),
      textClass: '',
      chip: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
      icon: <History className="h-[18px] w-[18px]" />,
    },
    {
      label: 'Additions',
      value: `+${formatNumber(pullRequest.additions)}`,
      textClass: 'text-success',
      chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      icon: <Plus className="h-[18px] w-[18px]" />,
    },
    {
      label: 'Deletions',
      value: `−${formatNumber(pullRequest.deletions)}`,
      textClass: 'text-destructive',
      chip: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      icon: <Minus className="h-[18px] w-[18px]" />,
    },
  ];

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-start gap-3">
          {avatarOk ? (
            <img
              src={`https://github.com/${authorLogin}.png?size=64`}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-full ring-2 ring-border"
              onError={() => setAvatarOk(false)}
            />
          ) : (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold uppercase text-white">
              {authorLogin.charAt(0)}
            </span>
          )}
          <div className="min-w-0 flex-1 space-y-2">
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
            <CardTitle className="text-xl leading-snug">
              <a
                href={pullRequest.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-start gap-1 break-words hover:text-primary hover:underline"
              >
                #{pullRequest.reference.number}: {pullRequest.title}
                <ArrowUpRight className="mt-1 h-4 w-4 shrink-0" />
              </a>
            </CardTitle>
            <CardDescription className="break-words">
              {pullRequest.reference.owner}/{pullRequest.reference.repo} by{' '}
              {authorLogin}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-2.5 rounded-xl border bg-muted/40 p-3"
            >
              <span
                className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                  stat.chip,
                )}
              >
                {stat.icon}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-lg font-bold leading-none tabular-nums',
                    stat.textClass,
                  )}
                >
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <GitBranch className="h-4 w-4" />
            {pullRequest.headBranch} → {pullRequest.baseBranch}
          </span>
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
