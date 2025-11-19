import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Text } from 'ink';
import { Header } from './components/Header.js';
import { TreeView } from './components/TreeView.js';
import { StatusBar } from './components/StatusBar.js';
import { DEFAULT_CONFIG } from './types/index.js';
import type { YellowwoodConfig, TreeNode, Notification, GitStatus } from './types/index.js';
import { executeCommand } from './utils/commandParser.js';
import { filterTreeByGitStatus } from './utils/filter.js';

interface AppProps {
  cwd: string;
}

const App: React.FC<AppProps> = ({ cwd }) => {
  const [config] = useState<YellowwoodConfig>(DEFAULT_CONFIG);
  const [fileTree, setFileTree] = useState<TreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterActive, setFilterActive] = useState(false);
  const [filterQuery, setFilterQuery] = useState<string | null>(null);
  const [gitStatusFilter, setGitStatusFilter] = useState<GitStatus | GitStatus[] | null>(null);
  const [commandBarInput, setCommandBarInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);

  // Create command context for the parser
  const handleCommandExecute = useCallback(
    async (input: string) => {
      const result = await executeCommand(input, {
        fileTree,
        gitStatus: new Map(), // TODO: Get from git status hook
        gitEnabled: true, // TODO: Get from git status hook
        setGitStatusFilter,
        setFilterActive,
        setFilterQuery,
        setNotification,
        commandHistory,
      });

      // Add to history
      setCommandHistory(prev => [...prev, input]);

      // Show notification
      setNotification(result);

      // Clear after 2 seconds
      setTimeout(() => setNotification(null), 2000);
    },
    [fileTree, commandHistory]
  );

  useEffect(() => {
    // TODO: Load configuration from cosmiconfig
    // TODO: Build initial file tree
    // TODO: Set up file watcher
    setLoading(false);
  }, [cwd]);

  // Apply git status filter to tree
  const filteredTree = useMemo(() => {
    if (!gitStatusFilter) {
      return fileTree;
    }

    try {
      return filterTreeByGitStatus(fileTree, gitStatusFilter);
    } catch (error) {
      console.warn('Git status filter error:', error);
      return fileTree;
    }
  }, [fileTree, gitStatusFilter]);

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text>Loading Yellowwood...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <Header cwd={cwd} filterActive={filterActive} filterQuery={filterQuery || ''} />
      <Box flexGrow={1}>
        <TreeView
          fileTree={filteredTree}
          selectedPath={selectedPath}
          onSelect={setSelectedPath}
          config={config}
        />
      </Box>
      <StatusBar
        notification={notification}
        fileCount={filteredTree.length}
        modifiedCount={0}
      />
    </Box>
  );
};

export default App;
