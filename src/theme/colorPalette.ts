import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Semantic color roles for Canopy's UI
 * Roles define purpose, not just color values
 */

export interface ColorPalette {
	// Base text and backgrounds
	text: {
		primary: string; // Main content (white)
		secondary: string; // Less important content (light gray)
		tertiary: string; // Least important (dim gray)
	};

	// Chrome (borders, guides, separators)
	chrome: {
		border: string; // Component borders (dim gray)
		guide: string; // Tree guides (dim gray)
		separator: string; // Dividers (dim gray)
	};

	// Selection and focus
	selection: {
		background: string; // Selection background (blue)
		text: string; // Selected text (cyan)
	};

	// Primary accent (from project identity or defaults)
	accent: {
		primary: string; // Gradient start (from AI-generated identity or default)
		secondary: string; // Gradient end (from AI-generated identity or default)
	};

	// Git status indicators
	git: {
		modified: string; // Yellow
		added: string; // Green
		deleted: string; // Red
		untracked: string; // Light gray
		ignored: string; // Dim gray
	};

	// AI/CopyTree activity
	ai: {
		primary: string; // Magenta (AI layer files, AI status)
		secondary: string; // Purple variant
	};

	// Warnings and errors
	alert: {
		error: string; // Red (errors, destructive actions)
		warning: string; // Yellow (cautions, notices)
		info: string; // Cyan (informational)
	};

	// Special semantics
	semantic: {
		srcFolder: string; // Green (source code folder)
		testFolder: string; // Yellow (test folder)
		buildFolder: string; // Dim gray (dist/build folders)
		configFile: string; // Red (package.json, tsconfig.json)
	};
}

/**
 * Default dark theme palette
 */
export const DARK_PALETTE: ColorPalette = {
	text: {
		primary: 'white',
		secondary: '#CCCCCC',
		tertiary: '#808080',
	},
	chrome: {
		border: '#4A4A4A',
		guide: '#3A3A3A',
		separator: '#333333',
	},
	selection: {
		background: 'blue',
		text: 'cyan',
	},
	accent: {
		primary: '#42b883', // Default (teal), overridden by ProjectIdentity
		secondary: '#258b5f', // Default (dark green), overridden by ProjectIdentity
	},
	git: {
		modified: '#FFD700', // Gold
		added: '#00FA9A', // Medium Spring Green
		deleted: '#FF6347', // Tomato
		untracked: '#A9A9A9', // Dark Gray
		ignored: '#696969', // Dim Gray
	},
	ai: {
		primary: 'magenta',
		secondary: '#DA70D6', // Orchid
	},
	alert: {
		error: '#FF4444',
		warning: '#FFD700',
		info: 'cyan',
	},
	semantic: {
		srcFolder: '#00FA9A', // Spring Green
		testFolder: '#FFD700', // Gold
		buildFolder: '#696969', // Dim Gray
		configFile: '#FF6347', // Tomato
	},
};

/**
 * Light theme palette
 */
export const LIGHT_PALETTE: ColorPalette = {
	text: {
		primary: 'black',
		secondary: '#333333',
		tertiary: '#666666',
	},
	chrome: {
		border: '#CCCCCC',
		guide: '#DDDDDD',
		separator: '#E5E5E5',
	},
	selection: {
		background: '#0066CC',
		text: '#00AAFF',
	},
	accent: {
		primary: '#42b883',
		secondary: '#258b5f',
	},
	git: {
		modified: '#CC8800', // Dark Gold
		added: '#008855', // Dark Green
		deleted: '#CC3333', // Dark Red
		untracked: '#666666', // Gray
		ignored: '#999999', // Light Gray
	},
	ai: {
		primary: '#AA00AA', // Dark Magenta
		secondary: '#8B008B', // Dark Magenta variant
	},
	alert: {
		error: '#CC0000',
		warning: '#CC8800',
		info: '#0088AA',
	},
	semantic: {
		srcFolder: '#008855',
		testFolder: '#CC8800',
		buildFolder: '#999999',
		configFile: '#CC3333',
	},
};

/**
 * Get active palette based on theme mode
 */
export function getPalette(mode: 'dark' | 'light' = 'dark'): ColorPalette {
	return mode === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
}

/**
 * Apply project identity accent to palette
 */
export function withProjectAccent(
	palette: ColorPalette,
	gradientStart: string,
	gradientEnd: string,
): ColorPalette {
	return {
		...palette,
		accent: {
			primary: gradientStart,
			secondary: gradientEnd,
		},
	};
}

/**
 * Validate that a palette object has all required fields
 */
function validatePalette(palette: unknown): asserts palette is ColorPalette {
	const p = palette as any;

	// Check all required top-level keys
	const requiredKeys = ['text', 'chrome', 'selection', 'accent', 'git', 'ai', 'alert', 'semantic'];
	for (const key of requiredKeys) {
		if (!p[key] || typeof p[key] !== 'object') {
			throw new Error(`Invalid palette: missing or invalid '${key}' section`);
		}
	}

	// Validate all nested keys with proper error messages
	const requiredFields: Record<string, string[]> = {
		text: ['primary', 'secondary', 'tertiary'],
		chrome: ['border', 'guide', 'separator'],
		selection: ['background', 'text'],
		accent: ['primary', 'secondary'],
		git: ['modified', 'added', 'deleted', 'untracked', 'ignored'],
		ai: ['primary', 'secondary'],
		alert: ['error', 'warning', 'info'],
		semantic: ['srcFolder', 'testFolder', 'buildFolder', 'configFile'],
	};

	for (const [section, fields] of Object.entries(requiredFields)) {
		for (const field of fields) {
			if (!p[section][field] || typeof p[section][field] !== 'string') {
				throw new Error(`Invalid palette: missing or invalid '${section}.${field}' (expected string color value)`);
			}
		}
	}
}

/**
 * Load a palette from a JSON file
 */
export async function loadPaletteFromFile(filePath: string): Promise<ColorPalette> {
	try {
		const content = await fs.readFile(filePath, 'utf-8');
		const palette = JSON.parse(content);
		validatePalette(palette);
		return palette;
	} catch (error) {
		throw new Error(`Failed to load palette from ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

/**
 * Load bundled theme by name ('dark' or 'light')
 */
export async function loadBundledTheme(name: 'dark' | 'light'): Promise<ColorPalette> {
	const themePath = path.join(__dirname, 'bundled', `${name}.json`);
	try {
		return await loadPaletteFromFile(themePath);
	} catch (error) {
		// Fallback to hardcoded palettes if file loading fails
		console.warn(`Failed to load bundled theme ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
		return name === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
	}
}

/**
 * Synchronously load bundled theme (for initial app load)
 */
export function loadBundledThemeSync(name: 'dark' | 'light'): ColorPalette {
	const themePath = path.join(__dirname, 'bundled', `${name}.json`);
	try {
		const content = fs.readFileSync(themePath, 'utf-8');
		const palette = JSON.parse(content);
		validatePalette(palette);
		return palette;
	} catch (error) {
		// Fallback to hardcoded palettes if file loading fails
		console.warn(`Failed to load bundled theme ${name}: ${error instanceof Error ? error.message : 'Unknown error'}. Using fallback palette.`);
		return name === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
	}
}

/**
 * Detect terminal theme based on environment
 */
export function detectTerminalTheme(): 'dark' | 'light' {
	// Check COLORFGBG environment variable (most reliable cross-platform)
	// Format is usually "foreground;background"
	// Light backgrounds are typically 7, 15, or high numbers
	const colorScheme = process.env.COLORFGBG;
	if (colorScheme) {
		const parts = colorScheme.split(';');
		if (parts.length >= 2) {
			const bg = parseInt(parts[1], 10);
			if (!isNaN(bg)) {
				return bg >= 7 ? 'light' : 'dark';
			}
		}
	}

	// Check other terminal-specific environment variables
	// Alacritty, Kitty, and others may set these
	const terminalEmulator = process.env.TERMINAL_EMULATOR;
	const colorTerm = process.env.COLORTERM;

	// Some terminals provide hints but not reliable theme info
	// Check for Apple Terminal or iTerm (macOS)
	if (process.env.TERM_PROGRAM === 'Apple_Terminal' || process.env.TERM_PROGRAM === 'iTerm.app') {
		// These typically default to dark, but we can't detect reliably
		return 'dark';
	}

	// Fallback: default to dark (most common for developer terminals)
	// Users can override by setting theme: 'dark' or 'light' explicitly in config
	return 'dark';
}
