import React from 'react';
import { Box, Text } from 'ink';
import type { TreeNode as TreeNodeType, YellowwoodConfig } from '../types/index.js';
import { TreeNode } from './TreeNode.js';

interface TreeViewProps {
  fileTree: TreeNodeType[];
  selectedPath: string;
  onSelect: (path: string) => void;
  config: YellowwoodConfig;
}

export const TreeView: React.FC<TreeViewProps> = ({ fileTree, selectedPath, onSelect, config }) => {
  // Placeholder toggle handler - will be enhanced in future issues
  const handleToggle = (path: string) => {
    // TODO: Implement folder toggle logic
    // For now, this is a no-op as folder expansion is handled elsewhere
  };

  if (fileTree.length === 0) {
    return (
      <Box paddingX={2} paddingY={1}>
        <Text dimColor>No files to display</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      {fileTree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          selected={node.path === selectedPath}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onToggle={handleToggle}
          config={config}
        />
      ))}
    </Box>
  );
};
