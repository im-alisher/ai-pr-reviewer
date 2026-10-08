import { cn } from '@/lib/utils';

type DiffLineKind = 'add' | 'remove' | 'hunk' | 'meta' | 'context';

function classify(line: string): DiffLineKind {
  if (line.startsWith('@@')) {
    return 'hunk';
  }
  if (
    line.startsWith('---') ||
    line.startsWith('+++') ||
    line.startsWith('diff --git') ||
    line.startsWith('index ') ||
    line.startsWith('new file') ||
    line.startsWith('deleted file') ||
    line.startsWith('rename ') ||
    line.startsWith('similarity ')
  ) {
    return 'meta';
  }
  if (line.startsWith('+')) {
    return 'add';
  }
  if (line.startsWith('-')) {
    return 'remove';
  }
  return 'context';
}

const LINE_STYLES: Record<DiffLineKind, string> = {
  add: 'bg-success/15 text-success',
  remove: 'bg-destructive/10 text-destructive',
  hunk: 'bg-muted text-muted-foreground',
  meta: 'bg-muted text-muted-foreground',
  context: '',
};

const LINE_PREFIX: Record<DiffLineKind, string> = {
  add: '+',
  remove: '-',
  hunk: '',
  meta: '',
  context: '',
};

export function DiffViewer({ diff, className }: { diff: string; className?: string }) {
  const lines = diff.replace(/\r\n/g, '\n').split('\n');

  return (
    <div
      className={cn(
        'overflow-x-auto rounded-lg border bg-card font-mono text-xs',
        className,
      )}
    >
      <pre className="min-w-full p-3 leading-relaxed">
        <code>
          {lines.map((line, index) => {
            const kind = classify(line);
            return (
              <div
                key={`${index}-${line.slice(0, 16)}`}
                className={cn(
                  'whitespace-pre px-1',
                  LINE_STYLES[kind],
                  kind === 'hunk' && 'my-1 font-medium',
                )}
              >
                {LINE_PREFIX[kind] ? (
                  <span className="select-none opacity-60">
                    {LINE_PREFIX[kind]}
                  </span>
                ) : null}
                {LINE_PREFIX[kind] ? line.slice(1) : line}
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  );
}
