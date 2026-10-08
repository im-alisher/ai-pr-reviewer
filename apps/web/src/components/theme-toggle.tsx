import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      }
      onClick={toggleTheme}
    >
      {theme === 'dark' ? (
        <Sun className="transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="transition-transform duration-300 hover:-rotate-12" />
      )}
    </Button>
  );
}
