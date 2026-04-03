import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface ColorScheme {
  key: string;
  label: string;
  primary: string;      // e.g. #f59e0b
  primaryLight: string;  // e.g. #fbbf24
  primaryDark: string;   // e.g. #d97706
  primaryBg: string;     // e.g. rgba(245,158,11,0.08)
  primaryBg50: string;   // e.g. bg-amber-50 equivalent
  primaryRipple: string; // for ripple rgba
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    key: 'amber',
    label: 'ענבר',
    primary: '#f59e0b',
    primaryLight: '#fbbf24',
    primaryDark: '#d97706',
    primaryBg: 'rgba(245,158,11,0.08)',
    primaryBg50: '#fffbeb',
    primaryRipple: 'rgba(245,158,11,0.4)',
  },
  {
    key: 'blue',
    label: 'כחול',
    primary: '#3b82f6',
    primaryLight: '#60a5fa',
    primaryDark: '#2563eb',
    primaryBg: 'rgba(59,130,246,0.08)',
    primaryBg50: '#eff6ff',
    primaryRipple: 'rgba(59,130,246,0.4)',
  },
  {
    key: 'green',
    label: 'ירוק',
    primary: '#22c55e',
    primaryLight: '#4ade80',
    primaryDark: '#16a34a',
    primaryBg: 'rgba(34,197,94,0.08)',
    primaryBg50: '#f0fdf4',
    primaryRipple: 'rgba(34,197,94,0.4)',
  },
  {
    key: 'purple',
    label: 'סגול',
    primary: '#8b5cf6',
    primaryLight: '#a78bfa',
    primaryDark: '#7c3aed',
    primaryBg: 'rgba(139,92,246,0.08)',
    primaryBg50: '#f5f3ff',
    primaryRipple: 'rgba(139,92,246,0.4)',
  },
  {
    key: 'pink',
    label: 'ורוד',
    primary: '#ec4899',
    primaryLight: '#f472b6',
    primaryDark: '#db2777',
    primaryBg: 'rgba(236,72,153,0.08)',
    primaryBg50: '#fdf2f8',
    primaryRipple: 'rgba(236,72,153,0.4)',
  },
  {
    key: 'teal',
    label: 'טורקיז',
    primary: '#14b8a6',
    primaryLight: '#2dd4bf',
    primaryDark: '#0d9488',
    primaryBg: 'rgba(20,184,166,0.08)',
    primaryBg50: '#f0fdfa',
    primaryRipple: 'rgba(20,184,166,0.4)',
  },
];

const STORAGE_KEY = 'shopping-list-color-scheme';

function getStoredScheme(): ColorScheme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const found = COLOR_SCHEMES.find((s) => s.key === stored);
    if (found) return found;
  }
  return COLOR_SCHEMES[0]; // amber default
}

function applySchemeToDOM(scheme: ColorScheme) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', scheme.primary);
  root.style.setProperty('--color-primary-light', scheme.primaryLight);
  root.style.setProperty('--color-primary-dark', scheme.primaryDark);
  root.style.setProperty('--color-primary-bg', scheme.primaryBg);
  root.style.setProperty('--color-primary-bg50', scheme.primaryBg50);
  root.style.setProperty('--color-primary-ripple', scheme.primaryRipple);
}

interface ThemeContextValue {
  scheme: ColorScheme;
  setScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  scheme: COLOR_SCHEMES[0],
  setScheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [scheme, setSchemeState] = useState<ColorScheme>(getStoredScheme);

  useEffect(() => {
    applySchemeToDOM(scheme);
  }, [scheme]);

  function setScheme(s: ColorScheme) {
    localStorage.setItem(STORAGE_KEY, s.key);
    setSchemeState(s);
  }

  return (
    <ThemeContext.Provider value={{ scheme, setScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
