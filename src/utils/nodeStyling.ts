import { TextProps } from 'ink';
import type { ColorPalette } from '../theme/colorPalette.js';

/**
 * Logic for highlighting specific "Agent" files (AI Context).
 */
export function getFileColor(fileName: string, palette: ColorPalette): string | undefined {
  const lower = fileName.toLowerCase();

  // High-priority Agent/Context files -> Magenta/Purple
  // This creates a distinct "AI Layer" in your file system
  if (
    lower === 'agents.md' ||
    lower === 'claude.md' ||
    lower === 'gemini.md' ||
    lower === 'copilot.md' ||
    lower.endsWith('.prompt.md')
  ) {
    return palette.ai.primary;
  }

  // Config files -> specific subtle color (optional, keep minimal for now)
  if (lower === 'package.json' || lower === 'tsconfig.json') {
    return palette.semantic.configFile;
  }

  // Default white/gray handled by component
  return undefined;
}

/**
 * Logic for highlighting key architecture folders.
 */
export function getFolderStyle(folderName: string, palette: ColorPalette): TextProps {
  const lower = folderName.toLowerCase();

  // Source Code -> The heart of the app
  if (lower === 'src') {
    return { color: palette.semantic.srcFolder, bold: true };
  }

  // Tests -> Critical infrastructure
  if (lower === 'tests' || lower === 'test' || lower === '__tests__') {
    return { color: palette.semantic.testFolder, bold: true };
  }

  // Dist/Build -> Dim these out as they are derivative
  if (lower === 'dist' || lower === 'build' || lower === '.git') {
    return { color: palette.semantic.buildFolder, dimColor: true };
  }

  // Default folders
  return { color: palette.text.secondary };
}
