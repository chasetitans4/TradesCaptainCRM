import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ========================================
        // TRADESCAPTAIN / BLUEHQ BRAND COLORS
        // ========================================

        // Primary Blue (from "Captain" gradient - deep end)
        primary: {
          DEFAULT: '#3B82F6',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          foreground: '#FFFFFF',
        },

        // Secondary Cyan (from "Captain" gradient - light end)
        secondary: {
          DEFAULT: '#0EA5E9',
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
          foreground: '#FFFFFF',
        },

        // Dark Charcoal (from "TRADES" text)
        dark: {
          DEFAULT: '#1E293B',
          foreground: '#FFFFFF',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },

        // Accent Green (for success states)
        accent: {
          DEFAULT: '#22C55E',
          foreground: '#FFFFFF',
        },

        // Semantic colors
        success: {
          DEFAULT: '#22C55E',
          foreground: '#FFFFFF',
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
        },
        warning: {
          DEFAULT: '#F59E0B',
          foreground: '#FFFFFF',
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
        info: {
          DEFAULT: '#3B82F6',
          foreground: '#FFFFFF',
        },

        // Legacy brand colors (for backwards compatibility)
        brand: {
          DEFAULT: '#3B82F6',
          light: '#60A5FA',
          dark: '#2563EB',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          950: '#172554',
        },

        // ========================================
        // TRADES CAPTAIN SEMANTIC DESIGN TOKENS
        // UI Constraints v2.0 - These reference CSS variables in globals.css
        // ========================================
        // All semantic tokens use 'tc-' prefix to distinguish from:
        // - Raw Tailwind colors (bg-blue-500, text-gray-600)
        // - shadcn/ui tokens (bg-destructive, text-muted-foreground)
        // Pattern: bg-tc-accent, text-tc-success, border-tc-danger
        // Exception: surface-* and text-* use unique names (no prefix needed)
        // ========================================

        // Surface tokens (backgrounds)
        surface: {
          DEFAULT: 'var(--color-surface)',
          muted: 'var(--color-surface-muted)',
          elevated: 'var(--color-surface-elevated)',
          // Legacy aliases for backwards compatibility
          secondary: 'hsl(var(--muted))',
          tertiary: 'hsl(var(--accent))',
        },

        // Text tokens
        text: {
          DEFAULT: 'var(--color-text-primary)',
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          // Legacy alias
          light: 'hsl(var(--muted-foreground))',
        },

        // Semantic accent (Trades Captain Blue)
        'tc-accent': {
          DEFAULT: 'var(--color-accent)',
          muted: 'var(--color-accent-muted)',
        },

        // Semantic status colors
        'tc-success': {
          DEFAULT: 'var(--color-success)',
          muted: 'var(--color-success-muted)',
        },
        'tc-warning': {
          DEFAULT: 'var(--color-warning)',
          muted: 'var(--color-warning-muted)',
        },
        'tc-danger': {
          DEFAULT: 'var(--color-danger)',
          muted: 'var(--color-danger-muted)',
        },
        'tc-info': {
          DEFAULT: 'var(--color-info)',
          muted: 'var(--color-info-muted)',
        },

        // Semantic border colors
        'tc-border': {
          DEFAULT: 'var(--color-border)',
          muted: 'var(--color-border-muted)',
        },

        // UI colors (shadcn/ui compatibility)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      fontFamily: {
        sans: ['Inter', 'var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        // UI Constraints v2.0 - Section 10.2 Typography Scale
        'micro': ['12px', { lineHeight: '1.4' }],
        'caption': ['13px', { lineHeight: '1.5' }],
        'body': ['15px', { lineHeight: '1.5' }],
        'h3': ['16px', { lineHeight: '1.5', fontWeight: '500' }],
        'h2': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        'h1': ['22px', { lineHeight: '1.4', fontWeight: '600' }],
      },
      spacing: {
        // Mobile-friendly tap targets
        'tap': '48px',
        'tap-sm': '44px',
        // UI Constraints v2.0 - Section 1.3 Spacing Scale (Only these values allowed)
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '12': '48px',
        '16': '64px',
      },
      transitionDuration: {
        // UI Constraints v2.0 - Animation timing
        'fast': '150ms',
        'normal': '200ms',
        'slow': '220ms',
      },
      minHeight: {
        'tap': '48px',
        'tap-sm': '44px',
      },
      minWidth: {
        'tap': '48px',
        'tap-sm': '44px',
      },
      borderRadius: {
        // Existing (keep for backwards compatibility with shadcn/ui)
        'lg': '0.625rem',
        'xl': '0.875rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // UI Constraints v2.0 spec values (use for new Trades Captain components)
        'tc-sm': '4px',
        'tc-md': '8px',
        'tc-lg': '12px',
        'tc-xl': '16px',
      },
      boxShadow: {
        // UI Constraints v2.0 - Standard shadows (3 levels only)
        'sm': '0 1px 2px rgba(0,0,0,0.04)',
        'md': '0 6px 16px rgba(0,0,0,0.08)',
        'none': 'none',
        // Legacy shadows (for backwards compatibility)
        'soft': '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 4px 16px -4px rgba(0, 0, 0, 0.1)',
        'medium': '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 8px 24px -4px rgba(0, 0, 0, 0.12)',
        'strong': '0 8px 24px -4px rgba(0, 0, 0, 0.12), 0 16px 48px -8px rgba(0, 0, 0, 0.16)',
        'inner-soft': 'inset 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'fab': '0 4px 12px 0 rgb(0 0 0 / 0.15)',
        'glow-primary': '0 0 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.1)',
        'glow-secondary': '0 0 20px rgba(56, 189, 248, 0.3), 0 0 40px rgba(56, 189, 248, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'spin-slow': 'spin 2s linear infinite',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      // Safe area insets for mobile
      padding: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
