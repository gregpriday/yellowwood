import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../theme/ThemeProvider.js';
import type { Worktree, CanopyConfig } from '../types/index.js';
import { fuzzyMatchMultiple, type FuzzyMatchResult } from '../utils/fuzzyMatch.js';
import { collectFilesFromWorktree } from '../utils/fileSearch.js';

interface FuzzySearchModalProps {
  visible: boolean;
  searchQuery: string;
  worktrees: Worktree[];
  focusedWorktreeId: string | null;
  config: CanopyConfig;
  onSelectResult: (path: string, action: 'copy' | 'open') => void;
  onClose: () => void;
  onQueryChange: (query: string) => void;
}

export function FuzzySearchModal({
  visible,
  searchQuery,
  worktrees,
  focusedWorktreeId,
  config,
  onSelectResult,
  onClose,
  onQueryChange,
}: FuzzySearchModalProps): React.JSX.Element | null {
  const { palette } = useTheme();
  const [results, setResults] = useState<FuzzyMatchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Determine which worktrees to search
  const searchableWorktrees = focusedWorktreeId
    ? worktrees.filter(w => w.id === focusedWorktreeId)
    : worktrees;

  // Perform search when query changes
  useEffect(() => {
    if (!visible) return;

    // Don't search with empty query - avoid heavy filesystem traversal on mount
    if (!searchQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false; // Guard against stale async results

    const performSearch = async () => {
      setIsSearching(true);
      try {
        // Collect all files from searchable worktrees
        const allFiles: string[] = [];
        for (const worktree of searchableWorktrees) {
          if (cancelled) return; // Bail if this search is stale
          const files = await collectFilesFromWorktree(worktree.path, config);
          allFiles.push(...files);
        }

        if (cancelled) return; // Bail before setting state if cancelled

        // Perform fuzzy matching
        const limit = config.search?.limit || 20;
        const matchResults = fuzzyMatchMultiple(searchQuery, allFiles, limit);
        setResults(matchResults);
        setSelectedIndex(0); // Reset selection to first result
      } catch (error) {
        if (!cancelled) {
          console.error('Search error:', error);
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    };

    performSearch();

    // Cleanup: cancel this search if query changes or modal closes
    return () => {
      cancelled = true;
    };
  }, [searchQuery, visible, focusedWorktreeId, worktrees]);

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!visible) return;

      // Close modal on Escape
      if (key.escape) {
        onClose();
        return;
      }

      // Navigate results with up/down arrows
      if (key.upArrow) {
        setSelectedIndex(prev => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIndex(prev => Math.min(results.length - 1, prev + 1));
        return;
      }

      // Enter: perform default action (open or copy based on config)
      if (key.return && results.length > 0) {
        const defaultAction = config.search?.defaultAction || 'open';
        onSelectResult(results[selectedIndex].path, defaultAction);
        return;
      }

      // 'c' key: copy path
      if (input === 'c' && results.length > 0) {
        onSelectResult(results[selectedIndex].path, 'copy');
        return;
      }

      // 'o' key: open file
      if (input === 'o' && results.length > 0) {
        onSelectResult(results[selectedIndex].path, 'open');
        return;
      }

      // Backspace: remove last character from query
      if (key.backspace || key.delete) {
        onQueryChange(searchQuery.slice(0, -1));
        return;
      }

      // Regular character input: add to query
      if (input && !key.ctrl && !key.meta && input.length === 1) {
        onQueryChange(searchQuery + input);
      }
    },
    { isActive: visible }
  );

  // Don't render if not visible
  if (!visible) return null;

  // Determine scope text
  const scopeText = focusedWorktreeId
    ? `(${searchableWorktrees[0]?.name || 'focused worktree'})`
    : worktrees.length > 1
    ? `(all ${worktrees.length} worktrees)`
    : '';

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={palette.chrome.border}
      padding={1}
      width={80}
      marginX={2}
    >
      {/* Header with search input */}
      <Box marginBottom={1}>
        <Text bold color={palette.accent.primary}>
          Search:
        </Text>
        <Text color={palette.text.primary}> {searchQuery}</Text>
        {scopeText && (
          <Text color={palette.text.secondary}> {scopeText}</Text>
        )}
        {isSearching && (
          <Text color={palette.text.secondary}> [searching...]</Text>
        )}
      </Box>

      {/* Results list */}
      <Box flexDirection="column" marginBottom={1}>
        {results.length === 0 && !isSearching && searchQuery && (
          <Text color={palette.text.secondary}>No matches found</Text>
        )}
        {results.length === 0 && !searchQuery && (
          <Text color={palette.text.secondary}>Type to search files...</Text>
        )}
        {results.map((result, index) => (
          <Box key={result.path}>
            <Text color={index === selectedIndex ? palette.accent.primary : palette.text.primary}>
              {index === selectedIndex ? '→ ' : '  '}
              {result.path}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Footer with keyboard hints */}
      <Box borderStyle="single" borderColor={palette.chrome.border} paddingX={1}>
        <Text color={palette.text.secondary}>
          [↑↓] Navigate  [Enter] {config.search?.defaultAction || 'Open'}  [c] Copy  [o] Open  [Esc] Close
        </Text>
      </Box>
    </Box>
  );
}
