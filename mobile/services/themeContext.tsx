import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getThemeColors, ThemeColors, LightColors } from '../constants/Colors';

const THEME_STORAGE_KEY = '@sakhi_dark_mode';

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: LightColors,
  isDark: false,
  toggleTheme: () => {},
});

/**
 * ThemeProvider wraps the app and provides dark/light mode state.
 * Persists the user's preference to AsyncStorage.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'true') {
          setIsDark(true);
        }
      } catch (e) {
        console.warn('[theme] Failed to load theme preference:', e);
      }
    })();
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, String(next));
    } catch (e) {
      console.warn('[theme] Failed to save theme preference:', e);
    }
  };

  const colors = getThemeColors(isDark);

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access the current theme colors and toggle function.
 *
 * Usage:
 *   const { colors, isDark, toggleTheme } = useTheme();
 *   <View style={{ backgroundColor: colors.background }}>
 */
export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}
