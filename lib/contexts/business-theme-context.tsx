'use client';

// =====================================================
// BUSINESS THEME CONTEXT
// Applies business-specific accent colors as CSS variables
// =====================================================

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { applyThemeToDocument, removeThemeFromDocument } from '@/lib/design/color-utils';

interface BusinessThemeContextValue {
  primaryColor: string;
  secondaryColor: string;
  isLoaded: boolean;
  updateColors: (primary: string, secondary?: string) => void;
}

const BusinessThemeContext = createContext<BusinessThemeContextValue | null>(null);

interface BusinessThemeProviderProps {
  children: ReactNode;
  primaryColor?: string;
  secondaryColor?: string;
}

/**
 * Provider that applies business accent colors as CSS variables
 * Colors are applied to :root via inline styles for immediate effect
 */
export function BusinessThemeProvider({
  children,
  primaryColor = '#1D4ED8',
  secondaryColor = '#0369A1',
}: BusinessThemeProviderProps) {
  const [colors, setColors] = useState({
    primary: primaryColor,
    secondary: secondaryColor,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Apply colors on mount and when they change
  useEffect(() => {
    applyThemeToDocument(colors.primary, colors.secondary);
    setIsLoaded(true);

    return () => {
      // Clean up CSS variables on unmount
      removeThemeFromDocument();
    };
  }, [colors.primary, colors.secondary]);

  // Update colors when props change
  useEffect(() => {
    if (primaryColor !== colors.primary || secondaryColor !== colors.secondary) {
      setColors({
        primary: primaryColor,
        secondary: secondaryColor,
      });
    }
  }, [primaryColor, secondaryColor, colors.primary, colors.secondary]);

  // Function to update colors dynamically (e.g., from settings page)
  const updateColors = useCallback((primary: string, secondary?: string) => {
    setColors({
      primary,
      secondary: secondary || primary,
    });
  }, []);

  return (
    <BusinessThemeContext.Provider
      value={{
        primaryColor: colors.primary,
        secondaryColor: colors.secondary,
        isLoaded,
        updateColors,
      }}
    >
      {children}
    </BusinessThemeContext.Provider>
  );
}

/**
 * Hook to access business theme colors
 */
export function useBusinessTheme(): BusinessThemeContextValue {
  const context = useContext(BusinessThemeContext);

  if (!context) {
    // Return defaults if used outside provider
    return {
      primaryColor: '#1D4ED8',
      secondaryColor: '#0369A1',
      isLoaded: false,
      updateColors: () => {},
    };
  }

  return context;
}
