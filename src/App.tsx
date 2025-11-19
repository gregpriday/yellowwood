import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Header } from './components/Header.js';
import { TreeView } from './components/TreeView.js';
import { StatusBar } from './components/StatusBar.js';
import { CommandBar } from './components/CommandBar.js';
import { WorktreePanel } from './components/WorktreePanel.js';
import { DEFAULT_CONFIG } from './types/index.js';
import type { YellowwoodConfig, TreeNode, Notification, Worktree } from './types/index.js';
import { executeCommand } from './commands/index.js';
import type { CommandContext } from './commands/index.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import { getWorktrees, getCurrentWorktree } from './utils/worktree.js';
import { switchWorktree } from './utils/worktreeSwitch.js';

interface AppProps {
  cwd: string;
}

const App: React.FC<AppProps> = ({ cwd }) => {
  const [config] = useState<YellowwoodConfig>(DEFAULT_CONFIG);
  const [fileTree, setFileTree] = useState<TreeNode[]>([]);
  const [originalFileTree, setOriginalFileTree] = useState<TreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);

  // Command bar state
  const [commandBarActive, setCommandBarActive] = useState(false);
  const [commandBarInput, setCommandBarInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);

  // Filter state
  const [filterActive, setFilterActive] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  // Worktree state
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [activeWorktreeId, setActiveWorktreeId] = useState<string | null>(null);
  const [isWorktreePanelOpen, setIsWorktreePanelOpen] = useState(false);
  const [currentWatcher, setCurrentWatcher] = useState<any>(null); // FileWatcher from worktreeSwitch

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
      if (currentWatcher) {
        currentWatcher.stop();
      }
    };
  }, [cwd, currentWatcher]);

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

  // Keep originalFileTree in sync with fileTree when filter is not active
  useEffect(() => {
    if (!filterActive && fileTree.length > 0) {
      setOriginalFileTree(fileTree);
    }
  }, [filterActive, fileTree]);

  // Restore original tree when filter is cleared
  useEffect(() => {
    if (!filterActive && originalFileTree.length > 0) {
      setFileTree(originalFileTree);
    }
  }, [filterActive, originalFileTree]);

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
      setFileTree(originalFileTree);
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
      const result = await switchWorktree({
        targetWorktree,
        currentWatcher, // Pass current watcher for cleanup
        currentTree: fileTree,
        selectedPath,
        config,
        onFileChange: {
          // File change handlers not yet implemented
          // These will be wired when file watcher state is added to App
        },
      });

      // Update state with new tree, selection, and watcher
      setFileTree(result.tree);
      setOriginalFileTree(result.tree);
      setSelectedPath(result.selectedPath || '');
      setActiveWorktreeId(targetWorktree.id);
      setCurrentWatcher(result.watcher); // Store new watcher

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
    // Use the current originalFileTree if we have one, otherwise use fileTree
    const treeForCommands = originalFileTree.length > 0 ? originalFileTree : fileTree;

    const context: CommandContext = {
      state: {
        fileTree,
        expandedFolders: new Set(),
        selectedPath,
        cursorPosition: 0,
        showPreview: false,
        showHelp: false,
        contextMenuOpen: false,
        contextMenuPosition: { x: 0, y: 0 },
        filterActive,
        filterQuery,
        filteredPaths: [],
        gitStatus: new Map(),
        gitEnabled: config.showGitStatus,
        notification,
        commandBarActive,
        commandBarInput,
        commandHistory,
        config,
        worktrees,
        activeWorktreeId,
      },
      originalFileTree: treeForCommands,
      setFilterActive: (active: boolean) => {
        setFilterActive(active);
        if (!active) {
          setFilterQuery('');
        }
      },
      setFilterQuery,
      setFileTree: (tree: TreeNode[]) => {
        setFileTree(tree);
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

  // Set up keyboard handlers
  useKeyboard({
    onOpenCommandBar: handleOpenCommandBar,
    onClearFilter: handleClearFilter,
    onNextWorktree: handleNextWorktree,
    onOpenWorktreePanel: () => setIsWorktreePanelOpen(true),
  });

  if (loading) {
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
          selectedPath={selectedPath}
          onSelect={setSelectedPath}
          config={config}
        />
      </Box>
      <StatusBar
        notification={notification}
        fileCount={fileTree.length}
        modifiedCount={0}
      />
      <CommandBar
        active={commandBarActive}
        input={commandBarInput}
        history={commandHistory}
        onInputChange={setCommandBarInput}
        onSubmit={handleCommandSubmit}
        onCancel={handleCloseCommandBar}
      />
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
