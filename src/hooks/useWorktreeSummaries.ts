import { useState, useEffect, useRef, useCallback } from 'react';
import type { Worktree, WorktreeChanges } from '../types/index.js';
import { enrichWorktreesWithSummaries } from '../services/ai/worktree.js';
import { categorizeWorktree } from '../utils/worktreeMood.js';

/**
 * Hook to manage AI-generated summaries for worktrees.
 * Enriches worktrees with summaries in the background without blocking UI.
 *
 * @param worktrees - Array of worktrees to enrich
 * @param mainBranch - Main branch to compare against (default: 'main')
 * @param refreshIntervalMs - Optional auto-refresh interval (0 = disabled)
 * @returns Enriched worktrees with summaries, loading states, and counts
 */
export function useWorktreeSummaries(
  worktrees: Worktree[],
  mainBranch: string = 'main',
  refreshIntervalMs: number = 0,
  worktreeChanges?: Map<string, WorktreeChanges>
): Worktree[] {
  const [enrichedWorktrees, setEnrichedWorktrees] = useState<Worktree[]>(worktrees);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isEnrichingRef = useRef(false);

  // Update enriched worktrees when input worktrees change
  useEffect(() => {
    setEnrichedWorktrees(worktrees);
  }, [worktrees]);

  // Enrich worktrees with AI summaries
  const enrichWorktrees = useCallback(async () => {
    // Skip if already enriching or no worktrees
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    if (isEnrichingRef.current || worktrees.length === 0) {
      return;
    }

    isEnrichingRef.current = true;

    try {
      // Create a mutable copy of worktrees and prioritize those with changes
      const mutableWorktreesById = new Map<string, Worktree>();
      for (const wt of worktrees) {
        mutableWorktreesById.set(wt.id, { ...wt });
      }

      const getChangedCount = (id: string) =>
        worktreeChanges?.get(id)?.changedFileCount ?? 0;

      const prioritizedWorktrees = Array.from(mutableWorktreesById.values()).sort(
        (a, b) => getChangedCount(b.id) - getChangedCount(a.id)
      );

      // Helper to apply updates to state in original order
      const applyUpdate = (updated: Worktree) => {
        setEnrichedWorktrees(prev =>
          prev.map(wt => (wt.id === updated.id ? { ...wt, ...updated } : wt))
        );
      };

      if (hasApiKey) {
        await enrichWorktreesWithSummaries(
          prioritizedWorktrees,
          mainBranch,
          (updatedWorktree) => {
            // Async mood update; fire-and-forget to avoid blocking summary flow
            void (async () => {
              const mood = await categorizeWorktree(
                updatedWorktree,
                worktreeChanges?.get(updatedWorktree.id),
                mainBranch
              );
              applyUpdate({ ...updatedWorktree, mood });
            })();
          }
        );
      } else {
        // No API key: still categorize mood so UI can reflect state
        for (const wt of prioritizedWorktrees) {
          const mood = await categorizeWorktree(
            wt,
            worktreeChanges?.get(wt.id),
            mainBranch
          );
          wt.mood = mood;
          wt.summaryLoading = false;
          applyUpdate(wt);
        }
      }
    } catch (error) {
      console.error('[canopy] useWorktreeSummaries: enrichment failed', error);
    } finally {
      isEnrichingRef.current = false;
    }
  }, [mainBranch, worktreeChanges, worktrees]);

  // Initial enrichment when worktrees change
  useEffect(() => {
    enrichWorktrees();
  }, [enrichWorktrees]);

  // Set up refresh interval if enabled
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Set up new interval if refreshIntervalMs > 0
    if (refreshIntervalMs > 0) {
      intervalRef.current = setInterval(() => {
        enrichWorktrees();
      }, refreshIntervalMs);
    }

    // Cleanup on unmount or when interval changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refreshIntervalMs, enrichWorktrees]);

  return enrichedWorktrees;
}
