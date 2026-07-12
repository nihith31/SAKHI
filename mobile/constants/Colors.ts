export type ThemeColors = typeof LightColors;

export const LightColors = {
  // Main Canvas
  background: '#FAF5F2',      // Almond Cream (main background)
  backgroundDark: '#FAF0EB',  // Slightly darker cream for cards
  canvasGradient: ['#FAF5F2', '#F3EEF5'] as [string, string], // Warm Almond to Soft Lavender
  
  // Accents & Actions
  primary: '#E67E80',         // Soft Terracotta Rose
  primaryDark: '#D47275',     // Warm Rose Dust
  primaryLight: '#F2E6E1',    // Dusty Rose Tint
  
  // Secondary / Success / Wellness
  secondary: '#8FAB96',       // Muted Sage Green
  secondaryLight: '#EAF0EB',  // Very Light Sage Green
  
  // Typography
  textDark: '#422D30',        // Deep Cocoa Plum (Headings, primary text)
  textMedium: '#615053',      // Muted Cocoa (Subheadings, body)
  textLight: '#8E7D80',       // Light Cocoa (Placeholders, captions)
  
  // Utility Colors
  white: '#FFFFFF',
  border: 'rgba(228, 213, 208, 0.5)',
  shadow: '#422D30',
  error: '#E06C75',

  // Cards & Surfaces
  card: '#FFFFFF',
  cardBorder: 'rgba(228, 213, 208, 0.3)',
  inputBackground: '#FFFFFF',
  tabBar: '#FFFFFF',
  tabBarBorder: 'rgba(228, 213, 208, 0.4)',
};

export const DarkColors: ThemeColors = {
  // Main Canvas
  background: '#1A1218',         // Deep plum black
  backgroundDark: '#150F14',     // Deeper plum for cards
  canvasGradient: ['#1A1218', '#1E1520'] as [string, string], // Deep plum gradient
  
  // Accents & Actions (slightly more vibrant against dark)
  primary: '#E88E90',            // Warmer terracotta rose
  primaryDark: '#D47275',        // Same warm rose dust
  primaryLight: '#2D2025',       // Subtle rose tint on dark
  
  // Secondary / Success / Wellness
  secondary: '#9ABF9F',          // Slightly brighter sage for contrast
  secondaryLight: '#1E2620',     // Dark sage undertone
  
  // Typography (inverted)
  textDark: '#F0E8E5',           // Warm off-white
  textMedium: '#C4B5B0',         // Muted warm gray
  textLight: '#8E7D80',          // Stays same — muted captions
  
  // Utility Colors
  white: '#FFFFFF',
  border: 'rgba(100, 80, 75, 0.4)',
  shadow: '#000000',
  error: '#E06C75',

  // Cards & Surfaces
  card: '#241A20',                // Warm dark card
  cardBorder: 'rgba(100, 80, 75, 0.3)',
  inputBackground: '#2A1F26',    // Subtle warm dark input
  tabBar: '#1A1218',
  tabBarBorder: 'rgba(100, 80, 75, 0.3)',
};

// Backward-compatible export — existing code that imports `Colors` still works
export const Colors = LightColors;

/**
 * Returns the correct color palette based on dark mode state.
 */
export function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? DarkColors : LightColors;
}
