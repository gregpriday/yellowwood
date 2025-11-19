import { useState, useEffect, useRef, useCallback } from 'react';
import { loadConfig } from '../utils/config.js';
import { getWorktrees, getCurrentWorktree } from '../utils/worktree.js';
import type { YellowwoodConfig, Worktree, Notification } from '../types/index.js';
import { DEFAULT_CONFIG } from '../types/index.js';

export type LifecycleStatus = 'idle' | 'initializing' | 'ready' | 'error';

export interface LifecycleState {
  status: LifecycleStatus;
  config: YellowwoodConfig;
  worktrees: Worktree[];
  activeWorktreeId: string | null;
  activeRootPath: string;
  error: Error | null;
}

export interface UseAppLifecycleOptions {
  cwd: string;
  initialConfig?: YellowwoodConfig;
  noWatch?: boolean;
  noGit?: boolean;
}

export interface UseAppLifecycleReturn extends LifecycleState {
  notification: Notification | null;
  setNotification: (notification: Notification | null) => void;
  reinitialize: () => Promise<void>;
}

/**
 * Centralized application lifecycle management hook.
 * Orchestrates:
 * - Configuration loading (if not provided)
 * - Worktree discovery
 * - Initial path determination
 * - Error handling and recovery
 *
 * Note: File watching and git status are handled separately by their
 * respective hooks (useFileTree, useGitStatus) which react to activeRootPath changes.
 */
export function useAppLifecycle({
  cwd,
  initialConfig,
  noWatch,
  noGit,
}: UseAppLifecycleOptions): UseAppLifecycleReturn {
  const [state, setState] = useState<LifecycleState>({
    status: 'initializing',
    config: initialConfig || DEFAULT_CONFIG,
    worktrees: [],
    activeWorktreeId: null,
    activeRootPath: cwd,
    error: null,
  });

  const [notification, setNotification] = useState<Notification | null>(null);
  const isMountedRef = useRef(true);
  const initializingRef = useRef(false);

  const initialize = useCallback(async () => {
    // Prevent concurrent initializations
    if (initializingRef.current) {
      return;
    }

    initializingRef.current = true;

    try {
      // Set status to initializing
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, status: 'initializing', error: null }));
      }

      // Step 1: Load configuration if not provided
      let config = initialConfig;
      if (!initialConfig) {
        try {
          config = await loadConfig(cwd);
          if (!isMountedRef.current) return;
        } catch (error) {
          console.warn('Failed to load config, using defaults:', error);
          if (isMountedRef.current) {
            setNotification({
              type: 'warning',
              message: `Config error: ${(error as Error).message}. Using defaults.`,
            });
          }
          config = DEFAULT_CONFIG;
        }
      }

      // Step 2: Discover worktrees
      let worktrees: Worktree[] = [];
      let activeWorktreeId: string | null = null;
      let activeRootPath = cwd;

      try {
        worktrees = await getWorktrees(cwd);
        if (!isMountedRef.current) return;

        if (worktrees.length > 0) {
          const current = getCurrentWorktree(cwd, worktrees);
          if (current) {
            activeWorktreeId = current.id;
            activeRootPath = current.path;
          } else {
            // Default to first worktree
            activeWorktreeId = worktrees[0].id;
            activeRootPath = worktrees[0].path;
          }
        }
      } catch (error) {
        // Check if this is a truly catastrophic error (not just "not a git repo")
        const errorMessage = (error as Error).message;
        if (errorMessage && errorMessage.includes('Catastrophic')) {
          // Re-throw catastrophic errors - they should fail initialization
          throw error;
        }
        // Worktree discovery is optional - not being in a git repo is OK
        console.debug('Could not load worktrees:', error);
        if (!isMountedRef.current) return;
      }

      // Step 3: Update state to ready
      if (isMountedRef.current) {
        setState({
          status: 'ready',
          config: config!,
          worktrees,
          activeWorktreeId,
          activeRootPath,
          error: null,
        });
      }
    } catch (error) {
      // Catch any unexpected errors
      console.error('Lifecycle initialization failed:', error);
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: error as Error,
        }));
        setNotification({
          type: 'error',
          message: `Initialization failed: ${(error as Error).message}`,
        });
      }
    } finally {
      initializingRef.current = false;
    }
  }, [cwd, initialConfig]);

  // Initialize on mount
  useEffect(() => {
    isMountedRef.current = true;
    initialize();

    return () => {
      isMountedRef.current = false;
    };
  }, [initialize]);

  return {
    ...state,
    notification,
    setNotification,
    reinitialize: initialize,
  };
}
