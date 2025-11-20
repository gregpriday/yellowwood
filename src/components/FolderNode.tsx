import React from 'react';
import { Box, Text } from 'ink';
import type { TreeNode as TreeNodeType, CanopyConfig, GitStatus } from '../types/index.js';
import type { FlattenedNode } from '../utils/treeViewVirtualization.js';
import { getFolderIcon } from '../utils/fileIcons.js';

interface FolderNodeProps {
  node: TreeNodeType & Partial<FlattenedNode>;
  selected: boolean;
  config: CanopyConfig;
  mapGitStatusMarker: (status: GitStatus) => string;
  getNodeColor: (node: TreeNodeType, selected: boolean, showGitStatus: boolean) => string;
}

/**
 * FolderNode component - renders a directory node with expansion icon, name, and git status.
 * With virtualization, child rendering is handled by TreeView, not recursively here.
 */
export function FolderNode({
  node,
  selected,
  config,
  mapGitStatusMarker,
  getNodeColor,
}: FolderNodeProps): React.JSX.Element {
  // Get tree guide prefix
  const treeGuide = ' '.repeat(node.depth * config.treeIndent);

  // Get Nerd Font icon for folder
  const icon = getFolderIcon(node.name, node.expanded || false);

  // Get git status marker if enabled
  const gitMarker =
    config.showGitStatus && node.gitStatus
      ? ` ${mapGitStatusMarker(node.gitStatus)}`
      : '';

  // Get color for the folder
  const color = getNodeColor(node, selected, config.showGitStatus);

  // Determine if text should be dimmed (for deleted folders, but never dim selected items)
  const dimmed = !selected && node.gitStatus === 'deleted';

  // For selected items, use inverted colors (background highlight)
  if (selected) {
    return (
      <Box>
        <Text color="gray" dimColor>{treeGuide}</Text>
        <Box paddingX={1}>
          <Text backgroundColor="blue" color="white" bold>
            {icon} {node.name}{gitMarker}
          </Text>
        </Box>
      </Box>
    );
  }

  // Non-selected items use standard colors
  return (
    <Box>
      <Text color="gray" dimColor>{treeGuide}</Text>
      <Text color={color} dimColor={dimmed} bold>
        {icon} {node.name}{gitMarker}
      </Text>
    </Box>
  );
}
