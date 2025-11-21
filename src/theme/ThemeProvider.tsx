import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { loadBundledThemeSync, withProjectAccent, type ColorPalette } from './colorPalette.js';

/**
 * Theme context value
 */
export interface ThemeContextValue {
	palette: ColorPalette;
	mode: 'dark' | 'light';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Hook to access the theme palette in any component
 */
export function useTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
}

/**
 * Theme provider props
 */
export interface ThemeProviderProps {
	children: ReactNode;
	mode: 'dark' | 'light';
	projectAccent?: {
		primary: string;
		secondary: string;
	};
}

/**
 * Theme provider component
 * Provides the color palette to all child components via React Context
 */
export function ThemeProvider({ children, mode, projectAccent }: ThemeProviderProps) {
	const palette = useMemo(() => {
		// Load theme from bundled JSON files
		const basePalette = loadBundledThemeSync(mode);

		if (projectAccent) {
			return withProjectAccent(basePalette, projectAccent.primary, projectAccent.secondary);
		}
		return basePalette;
	}, [mode, projectAccent]);

	const value = useMemo(
		() => ({
			palette,
			mode,
		}),
		[palette, mode],
	);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
