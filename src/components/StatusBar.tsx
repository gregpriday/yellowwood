import React, { useState, useEffect } from 'react';
import { Box, Text, useStdout } from 'ink';
import type { Notification, GitStatus } from '../types/index.js';
import { perfMonitor } from '../utils/perfMetrics.js';
import { ActionButton } from './StatusBar/ActionButton.js';
import { ActionGroup } from './StatusBar/ActionGroup.js';
import { InlineInput } from './StatusBar/InlineInput.js';
import { runCopyTree } from '../utils/copytree.js';
import { useTerminalMouse } from '../hooks/useTerminalMouse.js';

interface StatusBarProps {
  notification: Notification | null;
  fileCount: number;
  modifiedCount: number;
  filterQuery?: string | null;
  filterGitStatus?: GitStatus | null;
  showPerformance?: boolean;
  activeRootPath?: string;
  
  commandMode: boolean;
  onSetCommandMode: (active: boolean) => void;
  onCommandSubmit: (command: string) => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  notification,
  fileCount,
  modifiedCount,
  filterQuery,
  filterGitStatus,
  showPerformance = false,
  activeRootPath = '.',
  commandMode,
  onSetCommandMode,
  onCommandSubmit,
}) => {
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [input, setInput] = useState('');
  const { stdout } = useStdout();

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    if (commandMode) {
      setInput('/');
    }
  }, [commandMode]);

  const handleCopyTree = async () => {
    try {
      setFeedback({ message: 'Running copytree...', type: 'success' });
      const output = await runCopyTree(activeRootPath);
      setFeedback({ message: output, type: 'success' });
    } catch (error: any) {
      setFeedback({ message: error.message, type: 'error' });
    }
  };

  // Mouse handling for CopyTree button
  useTerminalMouse({
    enabled: !commandMode && !notification && !feedback, // Only active in default mode
    onMouse: (event) => {
      if (event.button === 'left' && stdout) {
        // Heuristic: Check if click is in the bottom-right area where the button is.
        // Button is roughly 14 chars wide (border + padding + "CopyTree")
        // StatusBar height with 2 lines of text is 4 lines (2 content + 2 border)
        // So checking last 3 rows to be safe.
        
        const buttonWidth = 16; // "CopyTree" (8) + padding (2) + border (2) + margin (1) + generous buffer
        const statusBarHeight = 5; // Generous height check (last 5 rows)
        
        const isBottom = event.y >= stdout.rows - statusBarHeight;
        const isRight = event.x >= stdout.columns - buttonWidth;
        
        if (isBottom && isRight) {
          handleCopyTree();
        }
      }
    }
  });

  const handleCommandSubmitInternal = (value: string) => {
    onCommandSubmit(value);
    onSetCommandMode(false);
  };

  const handleCommandCancel = () => {
    onSetCommandMode(false);
  };

  // 1. Command Mode (Overrides everything to allow full width input if needed, or partial)
  // Spec 2.3: "The file stats and buttons disappear (or are pushed out), replaced by the command input."
  // So we render ONLY input.
  if (commandMode) {
    return (
      <Box borderStyle="single" paddingX={1}>
        <InlineInput
          input={input}
          onChange={setInput}
          onSubmit={handleCommandSubmitInternal}
          onCancel={handleCommandCancel}
        />
      </Box>
    );
  }

  // 2. Global Notification (Overrides everything)
  if (notification) {
     const colorMap = {
      success: 'green',
      info: 'blue',
      warning: 'yellow',
      error: 'red',
    } as const;

    return (
      <Box borderStyle="single" paddingX={1}>
        <Text color={colorMap[notification.type]} bold={notification.type === 'error'}>
          {notification.message}
        </Text>
      </Box>
    );
  }

  // 3. Default Layout: Stats (Left) + Right Side (Feedback OR Buttons)
  
  // Filters Section (inline with files or separate?)
  // We'll put filters next to file count for compactness, or on a 3rd line if needed.
  // Let's append them to the first line if they exist.
  const filterElements: React.JSX.Element[] = [];
  if (filterQuery || filterGitStatus) {
    filterElements.push(<Text key="sep" dimColor> • </Text>);
    if (filterQuery) filterElements.push(<Text key="fq" color="cyan">/filter: {filterQuery}</Text>);
    if (filterQuery && filterGitStatus) filterElements.push(<Text key="sep2" dimColor> • </Text>);
    if (filterGitStatus) filterElements.push(<Text key="fgs" color="cyan">/git: {filterGitStatus}</Text>);
  }

  // Performance Section
  const perfElements: React.JSX.Element[] = [];
  if (showPerformance) {
    const gitStats = perfMonitor.getStats('git-status-fetch');
    if (gitStats) {
       perfElements.push(<Text key="sep" dimColor> • </Text>);
       perfElements.push(<Text key="perf" dimColor>Git {Math.round(gitStats.avg)}ms</Text>);
    }
  }

  return (
    <Box borderStyle="single" paddingX={1} justifyContent="space-between">
      <Box flexDirection="column">
        <Box>
          <Text>{fileCount} files</Text>
          {filterElements}
          {perfElements}
        </Box>
        <Box>
          {modifiedCount > 0 ? (
            <Text color="yellow">{modifiedCount} modified</Text>
          ) : (
            <Text dimColor>No changes</Text>
          )}
        </Box>
      </Box>
      
      {feedback ? (
        <Box marginLeft={1}>
           <Text color={feedback.type === 'success' ? 'white' : 'red'}>
            {feedback.type === 'success' ? '📎 ' : ''}{feedback.message}
          </Text>
        </Box>
      ) : (
        <ActionGroup>
          <ActionButton 
            label="CopyTree" 
            onAction={handleCopyTree}
          />
        </ActionGroup>
      )}
    </Box>
  );
};
