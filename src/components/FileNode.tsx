import React from 'react';
import { Box, Text } from 'ink';
import type { TreeNode as TreeNodeType, CanopyConfig, GitStatus } from '../types/index.js';
import type { FlattenedNode } from '../utils/treeViewVirtualization.js';
import { getFileIcon } from '../utils/fileIcons.js';
import { getFileColor } from '../utils/nodeStyling.js';

interface FileNodeProps {
  node: TreeNodeType & Partial<FlattenedNode>;
  selected: boolean;
  config: CanopyConfig;
  mapGitStatusMarker: (status: GitStatus) => string;
  getNodeColor: (node: TreeNodeType, selected: boolean, showGitStatus: boolean) => string;
}

export function FileNode({
  node,
  selected,
  config,
  mapGitStatusMarker,
  getNodeColor,
}: FileNodeProps): React.JSX.Element {
  // 1. Setup Guides & Icons
  const treeGuide = ' '.repeat(node.depth * config.treeIndent);
  const icon = getFileIcon(node.name);
  
  // 2. Git Status Logic
  const gitMarker = config.showGitStatus && node.gitStatus
      ? ` ${mapGitStatusMarker(node.gitStatus)}`
      : '';
  const isGitModified = config.showGitStatus && !!node.gitStatus;

  // 3. Determine Base Color
  // If selected, force cyan. If git modified, force git color.
  // Otherwise, check our custom styling.
  let baseColor = getNodeColor(node, selected, config.showGitStatus);
  if (!selected && !isGitModified) {
    const customColor = getFileColor(node.name);
    if (customColor) baseColor = customColor;
  }

  // 4. Split Filename for Extension Dimming
  // We only split if it's not a dotfile (like .gitignore)
  const lastDotIndex = node.name.lastIndexOf('.');
  const hasExtension = lastDotIndex > 0; 
  
  const nameBase = hasExtension ? node.name.substring(0, lastDotIndex) : node.name;
  const nameExt = hasExtension ? node.name.substring(lastDotIndex) : '';

  // 5. Render
  // If selected, we invert background, so we keep text uniform white.
  // If not selected, we apply the dimming logic.
  return (
    <Box>
      <Text color="gray" dimColor>{treeGuide}</Text>
      <Text color={baseColor} dimColor={node.gitStatus === 'deleted'}>
        {icon} {nameBase}
      </Text>
      {nameExt && (
        <Text 
          color={baseColor} 
          dimColor={!selected} // The magic: Dim extension unless selected
        >
          {nameExt}
        </Text>
      )}
      <Text color={baseColor}>
        {gitMarker}
      </Text>
    </Box>
  );
}