import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { copyTextToClipboard } from '@/lib/clipboard';
import { downloadTextFile } from '@/lib/patch-export';
import { Button, type ButtonProps } from '@/components/ui/button';

type CopyState = 'idle' | 'copied' | 'failed';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}

export function CopyButton({
  text,
  label = 'Copy',
  className,
  variant = 'outline',
  size = 'sm',
}: CopyButtonProps) {
  const [state, setState] = useState<CopyState>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    },
    [],
  );

  async function handleCopy(): Promise<void> {
    const succeeded = await copyTextToClipboard(text);
    setState(succeeded ? 'copied' : 'failed');

    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
    }
    resetTimer.current = setTimeout(() => setState('idle'), 2_000);
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={() => void handleCopy()}
      aria-live="polite"
    >
      {state === 'copied' ? (
        <Check className="text-success" />
      ) : state === 'failed' ? (
        <X className="text-destructive" />
      ) : (
        <Copy />
      )}
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}
    </Button>
  );
}

interface DownloadButtonProps {
  filename: string;
  text: string;
  label?: string;
  className?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}

export function DownloadButton({
  filename,
  text,
  label = 'Download',
  className,
  variant = 'outline',
  size = 'sm',
}: DownloadButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={() => downloadTextFile(filename, text)}
    >
      <Download />
      {label}
    </Button>
  );
}
