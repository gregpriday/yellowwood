import React from 'react';
import { Box, Text } from 'ink';
import type { TreeNode as TreeNodeType, CanopyConfig, GitStatus } from '../types/index.js';
import type { FlattenedNode } from '../utils/treeViewVirtualization.js';
import { getFileIcon } from '../utils/fileIcons.js';
import { getTreeGuide } from '../utils/treeGuides.js';

interface FileNodeProps {
  node: TreeNodeType & Partial<FlattenedNode>;
  selected: boolean;
  config: CanopyConfig;
  mapGitStatusMarker: (status: GitStatus) => string;
  getNodeColor: (node: TreeNodeType, selected: boolean, showGitStatus: boolean) => string;
}

/**
 * FileNode component - renders a file node with icon, name, and git status.
 * Files are leaf nodes and do not have children.
 */
export function FileNode({
  node,
  selected,
  config,
  mapGitStatusMarker,
  getNodeColor,
}: FileNodeProps): React.JSX.Element {
  // Get tree guide prefix
  const treeGuide = node.isLastSiblingAtDepth
    ? getTreeGuide(node.depth, node.isLastSiblingAtDepth, config.treeIndent)
    : ' '.repeat(node.depth * config.treeIndent);

  // Get Nerd Font icon for file
  const icon = getFileIcon(node.name);

  // Get git status marker if enabled
  const gitMarker =
    config.showGitStatus && node.gitStatus
      ? ` ${mapGitStatusMarker(node.gitStatus)}`
      : '';

  // Get color for the file
  const color = getNodeColor(node, selected, config.showGitStatus);

  // Determine if text should be dimmed (for deleted files)
  const dimmed = node.gitStatus === 'deleted';

  // Files don't show selection highlighting - clicking them copies their path
  return (
    <Box>
      <Text color="gray" dimColor>{treeGuide}</Text>
      <Text color={color} dimColor={dimmed}>
        {icon} {node.name}{gitMarker}
      </Text>
    </Box>
  );
}
