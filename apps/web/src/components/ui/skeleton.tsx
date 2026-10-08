import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'skeleton-shimmer animate-pulse rounded-md bg-muted',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
