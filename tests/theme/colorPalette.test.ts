import { describe, it, expect } from 'vitest';
import {
  getPalette,
  withProjectAccent,
  DARK_PALETTE,
  LIGHT_PALETTE,
  loadBundledThemeSync,
  detectTerminalTheme,
} from '../../src/theme/colorPalette.js';

describe('Color Palette', () => {
  describe('getPalette', () => {
    it('should return DARK_PALETTE when mode is "dark"', () => {
      const palette = getPalette('dark');
      expect(palette).toEqual(DARK_PALETTE);
    });

    it('should return LIGHT_PALETTE when mode is "light"', () => {
      const palette = getPalette('light');
      expect(palette).toEqual(LIGHT_PALETTE);
    });

    it('should default to DARK_PALETTE when no mode is provided', () => {
      const palette = getPalette();
      expect(palette).toEqual(DARK_PALETTE);
    });
  });

  describe('withProjectAccent', () => {
    it('should override accent colors while preserving other palette values', () => {
      const basePalette = getPalette('dark');
      const customStart = '#42b883';
      const customEnd = '#258b5f';

      const customPalette = withProjectAccent(basePalette, customStart, customEnd);

      expect(customPalette.accent.primary).toBe(customStart);
      expect(customPalette.accent.secondary).toBe(customEnd);
      expect(customPalette.text).toEqual(basePalette.text);
      expect(customPalette.git).toEqual(basePalette.git);
      expect(customPalette.chrome).toEqual(basePalette.chrome);
    });
  });

  describe('DARK_PALETTE structure', () => {
    it('should have all required color roles', () => {
      expect(DARK_PALETTE).toHaveProperty('text');
      expect(DARK_PALETTE).toHaveProperty('chrome');
      expect(DARK_PALETTE).toHaveProperty('selection');
      expect(DARK_PALETTE).toHaveProperty('accent');
      expect(DARK_PALETTE).toHaveProperty('git');
      expect(DARK_PALETTE).toHaveProperty('ai');
      expect(DARK_PALETTE).toHaveProperty('alert');
      expect(DARK_PALETTE).toHaveProperty('semantic');
    });

    it('should have text color roles', () => {
      expect(DARK_PALETTE.text).toHaveProperty('primary');
      expect(DARK_PALETTE.text).toHaveProperty('secondary');
      expect(DARK_PALETTE.text).toHaveProperty('tertiary');
    });

    it('should have chrome color roles', () => {
      expect(DARK_PALETTE.chrome).toHaveProperty('border');
      expect(DARK_PALETTE.chrome).toHaveProperty('guide');
      expect(DARK_PALETTE.chrome).toHaveProperty('separator');
    });

    it('should have git status colors', () => {
      expect(DARK_PALETTE.git).toHaveProperty('modified');
      expect(DARK_PALETTE.git).toHaveProperty('added');
      expect(DARK_PALETTE.git).toHaveProperty('deleted');
      expect(DARK_PALETTE.git).toHaveProperty('untracked');
      expect(DARK_PALETTE.git).toHaveProperty('ignored');
    });
  });

  describe('LIGHT_PALETTE structure', () => {
    it('should have all required color roles', () => {
      expect(LIGHT_PALETTE).toHaveProperty('text');
      expect(LIGHT_PALETTE).toHaveProperty('chrome');
      expect(LIGHT_PALETTE).toHaveProperty('selection');
      expect(LIGHT_PALETTE).toHaveProperty('accent');
      expect(LIGHT_PALETTE).toHaveProperty('git');
      expect(LIGHT_PALETTE).toHaveProperty('ai');
      expect(LIGHT_PALETTE).toHaveProperty('alert');
      expect(LIGHT_PALETTE).toHaveProperty('semantic');
    });
  });

  describe('Semantic color values', () => {
    it('should have distinct colors for git states in dark palette', () => {
      const gitColors = Object.values(DARK_PALETTE.git);
      const uniqueColors = new Set(gitColors);
      expect(uniqueColors.size).toBeGreaterThan(1); // At least some distinct colors
    });

    it('should have distinct colors for semantic folder types', () => {
      const { srcFolder, testFolder, buildFolder, configFile } = DARK_PALETTE.semantic;
      expect(srcFolder).not.toBe(testFolder);
      expect(srcFolder).not.toBe(buildFolder);
      expect(testFolder).not.toBe(buildFolder);
    });
  });

  describe('loadBundledThemeSync', () => {
    it('should load dark theme from JSON file', () => {
      const palette = loadBundledThemeSync('dark');
      expect(palette).toBeDefined();
      expect(palette.text).toBeDefined();
      expect(palette.git).toBeDefined();
      expect(palette.chrome).toBeDefined();
    });

    it('should load light theme from JSON file', () => {
      const palette = loadBundledThemeSync('light');
      expect(palette).toBeDefined();
      expect(palette.text).toBeDefined();
      expect(palette.git).toBeDefined();
      expect(palette.chrome).toBeDefined();
    });

    it('should load themes with all required color roles', () => {
      const darkPalette = loadBundledThemeSync('dark');
      expect(darkPalette).toHaveProperty('text');
      expect(darkPalette).toHaveProperty('chrome');
      expect(darkPalette).toHaveProperty('selection');
      expect(darkPalette).toHaveProperty('accent');
      expect(darkPalette).toHaveProperty('git');
      expect(darkPalette).toHaveProperty('ai');
      expect(darkPalette).toHaveProperty('alert');
      expect(darkPalette).toHaveProperty('semantic');
    });
  });

  describe('detectTerminalTheme', () => {
    it('should return dark or light based on detection', () => {
      const theme = detectTerminalTheme();
      expect(['dark', 'light']).toContain(theme);
    });

    it('should default to dark when no hints available', () => {
      // Save original env vars
      const originalColorfgbg = process.env.COLORFGBG;
      const originalTermProgram = process.env.TERM_PROGRAM;

      // Clear env vars
      delete process.env.COLORFGBG;
      delete process.env.TERM_PROGRAM;

      const theme = detectTerminalTheme();
      expect(theme).toBe('dark');

      // Restore env vars
      if (originalColorfgbg !== undefined) process.env.COLORFGBG = originalColorfgbg;
      if (originalTermProgram !== undefined) process.env.TERM_PROGRAM = originalTermProgram;
    });
  });
});
