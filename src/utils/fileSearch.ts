/**
 * File search utilities for fuzzy search functionality.
 * Collects files from worktrees respecting gitignore and config settings.
 */

import fs from 'fs-extra';
import path from 'path';
import type { CanopyConfig } from '../types/index.js';
import { loadGitignorePatterns, shouldIncludeFile } from './fileTree.js';

/**
 * Recursively collects all file paths from a directory.
 * Respects gitignore patterns and config settings.
 *
 * @param rootPath - Root directory to search
 * @param config - Canopy configuration
 * @returns Array of relative file paths
 */
export async function collectFilesFromWorktree(
  rootPath: string,
  config: CanopyConfig
): Promise<string[]> {
  const files: string[] = [];
  const respectGitignore = config.search?.respectGitignore ?? config.respectGitignore;

  // Load gitignore patterns if needed
  const gitignorePatterns = respectGitignore
    ? await loadGitignorePatterns(rootPath)
    : [];

  /**
   * Recursive helper to traverse directories
   */
  async function traverse(currentPath: string, depth: number = 0): Promise<void> {
    // Respect max depth if configured
    if (config.maxDepth !== null && depth > config.maxDepth) {
      return;
    }

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(rootPath, fullPath);

        // Check if file should be included based on config
        // shouldIncludeFile signature: (filePath, fileName, config, gitignorePatterns, rootPath)
        // Pass fullPath (absolute) so shouldIncludeFile can compute relative path correctly
        if (!shouldIncludeFile(fullPath, entry.name, config, gitignorePatterns, rootPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          // Recurse into subdirectory
          await traverse(fullPath, depth + 1);
        } else if (entry.isFile()) {
          // Add file to results (use forward slashes for consistency)
          files.push(relativePath.split(path.sep).join('/'));
        }
      }
    } catch (error) {
      // Skip directories we can't read (permissions, etc.)
      // Silent failure to avoid interrupting search
    }
  }

  await traverse(rootPath);
  return files;
}
