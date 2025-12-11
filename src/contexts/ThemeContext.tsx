import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Theme, ThemeColors, themes, DEFAULT_THEME_ID } from '@/types/theme';

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
  customThemes: Theme[];
  addCustomTheme: (theme: Theme) => void;
  removeCustomTheme: (themeId: string) => void;
  allThemes: Theme[];
  glassOpacity: number;
  setGlassOpacity: (opacity: number) => void;
  glowIntensity: number;
  setGlowIntensity: (intensity: number) => void;
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
  borderRadius: number;
  setBorderRadius: (radius: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'veer.theme';
const CUSTOM_THEMES_KEY = 'veer.customThemes';
const GLASS_OPACITY_KEY = 'veer.glassOpacity';
const GLOW_INTENSITY_KEY = 'veer.glowIntensity';
const ANIMATIONS_KEY = 'veer.animations';
const BORDER_RADIUS_KEY = 'veer.borderRadius';

// Apply theme colors to CSS variables
const applyThemeColors = (colors: ThemeColors) => {
  const root = document.documentElement;
  
  root.style.setProperty('--background', colors.background);
  root.style.setProperty('--foreground', colors.foreground);
  root.style.setProperty('--glass-bg', colors.glassBg);
  root.style.setProperty('--glass-border', colors.glassBorder);
  root.style.setProperty('--card', colors.card);
  root.style.setProperty('--card-foreground', colors.cardForeground);
  root.style.setProperty('--popover', colors.popover);
  root.style.setProperty('--popover-foreground', colors.popoverForeground);
  root.style.setProperty('--primary', colors.primary);
  root.style.setProperty('--primary-foreground', colors.primaryForeground);
  root.style.setProperty('--primary-glow', colors.primaryGlow);
  root.style.setProperty('--secondary', colors.secondary);
  root.style.setProperty('--secondary-foreground', colors.secondaryForeground);
  root.style.setProperty('--secondary-glow', colors.secondaryGlow);
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--accent-foreground', colors.accentForeground);
  root.style.setProperty('--accent-glow', colors.accentGlow);
  root.style.setProperty('--muted', colors.muted);
  root.style.setProperty('--muted-foreground', colors.mutedForeground);
  root.style.setProperty('--destructive', colors.destructive);
  root.style.setProperty('--destructive-foreground', colors.destructiveForeground);
  root.style.setProperty('--border', colors.border);
  root.style.setProperty('--input', colors.input);
  root.style.setProperty('--ring', colors.ring);
  root.style.setProperty('--sidebar-background', colors.sidebarBackground);
  root.style.setProperty('--sidebar-foreground', colors.sidebarForeground);
  root.style.setProperty('--sidebar-primary', colors.sidebarPrimary);
  root.style.setProperty('--sidebar-primary-foreground', colors.sidebarPrimaryForeground);
  root.style.setProperty('--sidebar-accent', colors.sidebarAccent);
  root.style.setProperty('--sidebar-accent-foreground', colors.sidebarAccentForeground);
  root.style.setProperty('--sidebar-border', colors.sidebarBorder);
  root.style.setProperty('--sidebar-ring', colors.sidebarRing);

  // Update gradient CSS variables based on theme colors
  root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${colors.primary}) 0%, hsl(${colors.secondary}) 100%)`);
  root.style.setProperty('--gradient-accent', `linear-gradient(135deg, hsl(${colors.accent}) 0%, hsl(${colors.primary}) 100%)`);
  root.style.setProperty('--gradient-glow', `radial-gradient(ellipse at 50% 0%, hsl(${colors.primary} / 0.2) 0%, hsl(${colors.accent} / 0.05) 40%, transparent 70%)`);
  
  // Update shadow/glow CSS variables
  root.style.setProperty('--shadow-glow', `0 0 20px hsl(${colors.primary} / 0.25), 0 0 40px hsl(${colors.primary} / 0.1)`);
  root.style.setProperty('--shadow-glow-accent', `0 0 20px hsl(${colors.accent} / 0.25), 0 0 40px hsl(${colors.accent} / 0.1)`);
};

const applyGlassOpacity = (opacity: number) => {
  const root = document.documentElement;
  root.style.setProperty('--glass-opacity', (opacity / 100).toString());
};

const applyGlowIntensity = (intensity: number) => {
  const root = document.documentElement;
  root.style.setProperty('--glow-intensity', (intensity / 100).toString());
};

const applyAnimationsEnabled = (enabled: boolean) => {
  const root = document.documentElement;
  if (enabled) {
    root.classList.remove('reduce-motion');
  } else {
    root.classList.add('reduce-motion');
  }
};

const applyBorderRadius = (radius: number) => {
  const root = document.documentElement;
  root.style.setProperty('--radius', `${radius / 100}rem`);
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load saved theme ID or default
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME_ID;
    } catch {
      return DEFAULT_THEME_ID;
    }
  });

  // Load custom themes
  const [customThemes, setCustomThemes] = useState<Theme[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_THEMES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load glass opacity (0-100)
  const [glassOpacity, setGlassOpacityState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(GLASS_OPACITY_KEY);
      return saved ? parseInt(saved, 10) : 70;
    } catch {
      return 70;
    }
  });

  // Load glow intensity (0-100)
  const [glowIntensity, setGlowIntensityState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(GLOW_INTENSITY_KEY);
      return saved ? parseInt(saved, 10) : 100;
    } catch {
      return 100;
    }
  });

  // Load animations enabled
  const [animationsEnabled, setAnimationsEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(ANIMATIONS_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  // Load border radius (50-150, as percentage of base 0.75rem)
  const [borderRadius, setBorderRadiusState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(BORDER_RADIUS_KEY);
      return saved ? parseInt(saved, 10) : 75;
    } catch {
      return 75;
    }
  });

  // Combine built-in and custom themes
  const allThemes = [...themes, ...customThemes];

  // Get current theme object
  const currentTheme = allThemes.find(t => t.id === currentThemeId) || themes[0];

  // Apply theme on mount and when changed
  useEffect(() => {
    applyThemeColors(currentTheme.colors);
    localStorage.setItem(STORAGE_KEY, currentTheme.id);
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('veer-theme-change', { detail: currentTheme }));
  }, [currentTheme]);

  // Apply glass opacity
  useEffect(() => {
    applyGlassOpacity(glassOpacity);
    localStorage.setItem(GLASS_OPACITY_KEY, glassOpacity.toString());
  }, [glassOpacity]);

  // Apply glow intensity
  useEffect(() => {
    applyGlowIntensity(glowIntensity);
    localStorage.setItem(GLOW_INTENSITY_KEY, glowIntensity.toString());
  }, [glowIntensity]);

  // Apply animations toggle
  useEffect(() => {
    applyAnimationsEnabled(animationsEnabled);
    localStorage.setItem(ANIMATIONS_KEY, animationsEnabled.toString());
  }, [animationsEnabled]);

  // Apply border radius
  useEffect(() => {
    applyBorderRadius(borderRadius);
    localStorage.setItem(BORDER_RADIUS_KEY, borderRadius.toString());
  }, [borderRadius]);

  // Save custom themes
  useEffect(() => {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customThemes));
  }, [customThemes]);

  const setTheme = useCallback((themeId: string) => {
    setCurrentThemeId(themeId);
  }, []);

  const addCustomTheme = useCallback((theme: Theme) => {
    setCustomThemes(prev => [...prev, theme]);
  }, []);

  const removeCustomTheme = useCallback((themeId: string) => {
    setCustomThemes(prev => prev.filter(t => t.id !== themeId));
    if (currentThemeId === themeId) {
      setCurrentThemeId(DEFAULT_THEME_ID);
    }
  }, [currentThemeId]);

  const setGlassOpacity = useCallback((opacity: number) => {
    setGlassOpacityState(Math.max(0, Math.min(100, opacity)));
  }, []);

  const setGlowIntensity = useCallback((intensity: number) => {
    setGlowIntensityState(Math.max(0, Math.min(100, intensity)));
  }, []);

  const setAnimationsEnabled = useCallback((enabled: boolean) => {
    setAnimationsEnabledState(enabled);
  }, []);

  const setBorderRadius = useCallback((radius: number) => {
    setBorderRadiusState(Math.max(0, Math.min(200, radius)));
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        setTheme,
        customThemes,
        addCustomTheme,
        removeCustomTheme,
        allThemes,
        glassOpacity,
        setGlassOpacity,
        glowIntensity,
        setGlowIntensity,
        animationsEnabled,
        setAnimationsEnabled,
        borderRadius,
        setBorderRadius,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
