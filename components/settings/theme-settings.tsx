'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

const themes = [
  { id: 'light', label: 'Light', icon: Sun, description: 'Clean white background' },
  { id: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
  { id: 'system', label: 'System', icon: Monitor, description: 'Match your device' },
];

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div>
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Customize how the app looks on your device.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
              theme === t.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                theme === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}
            >
              <t.icon className="w-5 h-5" />
            </div>
            <span className="font-medium text-sm">{t.label}</span>
            <span className="text-xs text-muted-foreground text-center">{t.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
