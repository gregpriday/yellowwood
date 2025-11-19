import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Text } from 'ink';
import { Header } from './components/Header.js';
import { TreeView } from './components/TreeView.js';
import { StatusBar } from './components/StatusBar.js';
import { CommandBar } from './components/CommandBar.js';
import { ContextMenu } from './components/ContextMenu.js';
import { WorktreePanel } from './components/WorktreePanel.js';
import { DEFAULT_CONFIG } from './types/index.js';
import type { YellowwoodConfig, TreeNode, Notification, Worktree } from './types/index.js';
import { executeCommand } from './commands/index.js';
import type { CommandContext } from './commands/index.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import { useFileTree } from './hooks/useFileTree.js';
import { getWorktrees, getCurrentWorktree } from './utils/worktree.js';
import { openFile } from './utils/fileOpener.js';
import { copyFilePath } from './utils/clipboard.js';
import path from 'path';
import { useGitStatus } from './hooks/useGitStatus.js';
import { createFileWatcher, buildIgnorePatterns } from './utils/fileWatcher.js';
import type { FileWatcher } from './utils/fileWatcher.js';

interface AppProps {
  cwd: string;
  config?: YellowwoodConfig;
  noWatch?: boolean;
  noGit?: boolean;
  initialFilter?: string;
}

const App: React.FC<AppProps> = ({ cwd, config: initialConfig, noWatch, noGit, initialFilter }) => {
  const [config] = useState<YellowwoodConfig>(initialConfig || DEFAULT_CONFIG);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);

  // Command bar state
  const [commandBarActive, setCommandBarActive] = useState(false);
  const [commandBarInput, setCommandBarInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);

  // Filter state - initialize from CLI if provided
  const [filterActive, setFilterActive] = useState(!!initialFilter);
  const [filterQuery, setFilterQuery] = useState(initialFilter || '');

  // Worktree state
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [activeWorktreeId, setActiveWorktreeId] = useState<string | null>(null);
  const [activeRootPath, setActiveRootPath] = useState<string>(cwd);
  const [isWorktreePanelOpen, setIsWorktreePanelOpen] = useState(false);

  // File watcher ref
  const watcherRef = useRef<FileWatcher | null>(null);

  // Git status hook - tracks the active root path
  // noGit flag from CLI overrides config.showGitStatus
  const { gitStatus, gitEnabled, refresh: refreshGitStatus, clear: clearGitStatus } = useGitStatus(
    activeRootPath,
    noGit ? false : config.showGitStatus,
    config.refreshDebounce,
  );

  const refreshGitStatusRef = useRef(refreshGitStatus);
  refreshGitStatusRef.current = refreshGitStatus;

  // File tree hook - manages tree state, expansion, selection, filtering
  const {
    tree: fileTree,
    rawTree,
    expandedFolders,
    selectedPath,
    loading: treeLoading,
    selectPath,
    toggleFolder,
    refresh: refreshTree,
  } = useFileTree({
    rootPath: activeRootPath,
    config,
    filterQuery: filterActive ? filterQuery : null,
    gitStatusMap: gitStatus,
  });

  // Context menu state (from PR #73)
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuTarget, setContextMenuTarget] = useState<string>('');
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        const loadedWorktrees = await getWorktrees(cwd);
        if (!isMounted) return;

        setWorktrees(loadedWorktrees);

        if (loadedWorktrees.length > 0) {
          const current = getCurrentWorktree(cwd, loadedWorktrees);
          if (current) {
            setActiveWorktreeId(current.id);
          } else {
            setActiveWorktreeId(loadedWorktrees[0].id);
          }
        }
      } catch (error) {
        if (!isMounted) return;
        console.debug('Could not load worktrees:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
      // Cleanup watcher on unmount
      if (watcherRef.current) {
        void watcherRef.current.stop().catch((err) => {
          console.error('Error stopping watcher on unmount:', err);
        });
      }
    };
  }, [cwd]);

  // Auto-dismiss notifications after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Derive current worktree from activeWorktreeId
  const currentWorktree = worktrees.find(wt => wt.id === activeWorktreeId) || null;

  // Calculate modified count from git status
  const modifiedCount = useMemo(() => {
    return Array.from(gitStatus.values()).filter(
      status => status === 'modified' || status === 'added' || status === 'deleted'
    ).length;
  }, [gitStatus]);

  // File watcher lifecycle - start/stop based on activeRootPath
  useEffect(() => {
    // Stop old watcher if exists
    if (watcherRef.current) {
      void watcherRef.current.stop().catch((err) => {
        console.error('Error stopping watcher:', err);
      });
      watcherRef.current = null;
    }

    // Skip watcher creation if --no-watch flag is set
    if (noWatch) {
      return;
    }

    // Create and start new watcher for current root
    try {
      const watcher = createFileWatcher(activeRootPath, {
        ignored: buildIgnorePatterns(config.customIgnores || []),
        debounce: config.refreshDebounce,
        onAdd: () => {
          refreshTree();
          refreshGitStatusRef.current();
        },
        onChange: () => {
          refreshTree();
          refreshGitStatusRef.current();
        },
        onUnlink: () => {
          refreshTree();
          refreshGitStatusRef.current();
        },
        onAddDir: () => {
          refreshTree();
          refreshGitStatusRef.current();
        },
        onUnlinkDir: () => {
          refreshTree();
          refreshGitStatusRef.current();
        },
        onError: (error) => {
          setNotification({
            type: 'error',
            message: `File watcher error: ${error.message}`,
          });
        },
      });

      watcher.start();
      watcherRef.current = watcher;
    } catch (error) {
      // Watcher creation/start failed - notify user but don't crash
      console.error('Failed to start file watcher:', error);
      setNotification({
        type: 'warning',
        message: `File watcher disabled: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      watcherRef.current = null;
    }

    // Cleanup on unmount or path change
    return () => {
      if (watcherRef.current) {
        void watcherRef.current.stop().catch((err) => {
          console.error('Error stopping watcher during cleanup:', err);
        });
        watcherRef.current = null;
      }
    };
  }, [activeRootPath, config, refreshTree, noWatch]);

  // Handle command bar open/close
  const handleOpenCommandBar = () => {
    setCommandBarActive(true);
    setCommandBarInput('');
  };

  const handleCloseCommandBar = () => {
    setCommandBarActive(false);
    setCommandBarInput('');
  };

  // Handle filter clear (ESC key when filter is active)
  const handleClearFilter = () => {
    if (filterActive) {
      setFilterActive(false);
      setFilterQuery('');
      setNotification({
        type: 'info',
        message: 'Filter cleared',
      });
    } else if (commandBarActive) {
      // ESC in command bar closes it
      handleCloseCommandBar();
    } else if (isWorktreePanelOpen) {
      // ESC in worktree panel closes it
      setIsWorktreePanelOpen(false);
    }
  };

  // Handle cycling to next worktree (w key)
  const handleNextWorktree = () => {
    // No-op if no worktrees or only one worktree
    if (worktrees.length <= 1) {
      return;
    }

    // Find current index
    const currentIndex = worktrees.findIndex(wt => wt.id === activeWorktreeId);

    // Calculate next index with wrap-around
    const nextIndex = currentIndex >= 0 && currentIndex < worktrees.length - 1
      ? currentIndex + 1
      : 0;

    // Switch to next worktree
    const nextWorktree = worktrees[nextIndex];
    if (nextWorktree) {
      handleSwitchWorktree(nextWorktree);
    }
  };

  // Handle worktree switching
  const handleSwitchWorktree = async (targetWorktree: Worktree) => {
    try {
      // Clear git status before switching
      clearGitStatus();

      // Stop current watcher (new one will be created by useEffect when activeRootPath changes)
      if (watcherRef.current) {
        await watcherRef.current.stop();
        watcherRef.current = null;
      }

      // Update active worktree and root path
      // This triggers useFileTree and watcher useEffects to rebuild for new path
      setActiveWorktreeId(targetWorktree.id);
      setActiveRootPath(targetWorktree.path);

      // Clear any active filter when switching
      setFilterActive(false);
      setFilterQuery('');

      // Close panel and show success notification
      setIsWorktreePanelOpen(false);
      setNotification({
        type: 'success',
        message: `Switched to ${targetWorktree.branch || targetWorktree.name}`,
      });
    } catch (error) {
      // Keep panel open on error, show error notification
      setNotification({
        type: 'error',
        message: `Failed to switch worktree: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  // Execute command from command bar
  const handleCommandSubmit = async (input: string) => {
    // Close command bar
    setCommandBarActive(false);

    // Add to history (most recent first)
    setCommandHistory(prev => [input, ...prev.filter(cmd => cmd !== input)].slice(0, 50));

    // Build command context
    const context: CommandContext = {
      state: {
        fileTree,
        expandedFolders,
        selectedPath: selectedPath || '',
        cursorPosition: 0,
        showPreview: false,
        showHelp: false,
        contextMenuOpen: false,
        contextMenuPosition: { x: 0, y: 0 },
        filterActive,
        filterQuery,
        filteredPaths: [],
        gitStatus,
        gitEnabled,
        notification,
        commandBarActive,
        commandBarInput,
        commandHistory,
        config,
        worktrees,
        activeWorktreeId,
      },
      originalFileTree: rawTree,
      setFilterActive: (active: boolean) => {
        setFilterActive(active);
        if (!active) {
          setFilterQuery('');
        }
      },
      setFilterQuery,
      setFileTree: () => {
        // No-op: filtering is now handled by useFileTree hook
        // Commands should use setFilterQuery and setFilterActive instead
      },
      notify: setNotification,
      addToHistory: (cmd: string) => {
        setCommandHistory(prev => [cmd, ...prev.filter(c => c !== cmd)].slice(0, 50));
      },
      worktrees,
      activeWorktreeId,
      switchToWorktree: handleSwitchWorktree,
    };

    // Execute command
    const result = await executeCommand(input, context);

    // Show notification if command provided one
    if (result.notification) {
      setNotification(result.notification);
    }

    // Clear input
    setCommandBarInput('');
  };

  // File operation handlers (from PR #73)
  const handleOpenSelectedFile = async () => {
    if (!selectedPath) return;

    try {
      await openFile(selectedPath, config);
      setNotification({
        type: 'success',
        message: `Opened ${path.basename(selectedPath)}`,
      });
    } catch (error) {
      setNotification({
        type: 'error',
        message: `Failed to open file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  const handleCopySelectedPath = async () => {
    if (!selectedPath) return;

    try {
      await copyFilePath(selectedPath, activeRootPath, false); // false = absolute path
      setNotification({
        type: 'success',
        message: 'Path copied to clipboard',
      });
    } catch (error) {
      setNotification({
        type: 'error',
        message: `Failed to copy path: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  const handleOpenContextMenu = () => {
    if (!selectedPath) return;

    setContextMenuTarget(selectedPath);
    setContextMenuPosition({ x: 0, y: 0 }); // Simple positioning
    setContextMenuOpen(true);
  };

  // Set up keyboard handlers
  useKeyboard({
    onOpenCommandBar: handleOpenCommandBar,
    onClearFilter: handleClearFilter,
    onNextWorktree: handleNextWorktree,
    onOpenWorktreePanel: () => setIsWorktreePanelOpen(true),
    onOpenFile: handleOpenSelectedFile,
    onCopyPath: handleCopySelectedPath,
    onOpenContextMenu: handleOpenContextMenu,
    onToggleExpand: () => {
      if (selectedPath) {
        toggleFolder(selectedPath);
      }
    },
    onRefresh: () => {
      refreshTree();
      refreshGitStatus();
    },
  });

  // Show loading screen only during initial load (not for incremental refreshes)
  if (loading || (treeLoading && fileTree.length === 0)) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Loading Yellowwood...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <Header
        cwd={cwd}
        filterActive={filterActive}
        filterQuery={filterQuery}
        currentWorktree={currentWorktree}
        worktreeCount={worktrees.length}
        onWorktreeClick={() => setIsWorktreePanelOpen(true)}
      />
      <Box flexGrow={1}>
        <TreeView
          fileTree={fileTree}
          selectedPath={selectedPath || ''}
          onSelect={selectPath}
          config={config}
          expandedPaths={expandedFolders}
          onToggleExpand={toggleFolder}
          disableKeyboard={true}
        />
      </Box>
      <StatusBar
        notification={notification}
        fileCount={fileTree.length}
        modifiedCount={modifiedCount}
        filterQuery={filterActive ? filterQuery : null}
      />
      <CommandBar
        active={commandBarActive}
        input={commandBarInput}
        history={commandHistory}
        onInputChange={setCommandBarInput}
        onSubmit={handleCommandSubmit}
        onCancel={handleCloseCommandBar}
      />
      {contextMenuOpen && (
        <ContextMenu
          path={contextMenuTarget}
          rootPath={activeRootPath}
          position={contextMenuPosition}
          config={config}
          onClose={() => setContextMenuOpen(false)}
          onAction={(actionType, result) => {
            if (result.success) {
              setNotification({
                type: 'success',
                message: result.message || 'Action completed',
              });
            } else {
              setNotification({
                type: 'error',
                message: result.message || 'Action failed',
              });
            }
            setContextMenuOpen(false);
          }}
        />
      )}
      {isWorktreePanelOpen && (
        <WorktreePanel
          worktrees={worktrees}
          activeWorktreeId={activeWorktreeId}
          onSelect={(worktreeId) => {
            const targetWorktree = worktrees.find(wt => wt.id === worktreeId);
            if (targetWorktree) {
              handleSwitchWorktree(targetWorktree);
            }
          }}
          onClose={() => setIsWorktreePanelOpen(false)}
        />
      )}
    </Box>
  );
};

export default App;
