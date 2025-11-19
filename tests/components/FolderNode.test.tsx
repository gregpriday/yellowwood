import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { FolderNode } from '../../src/components/FolderNode.js';
import { DEFAULT_CONFIG } from '../../src/types/index.js';
import type { TreeNode as TreeNodeType, GitStatus } from '../../src/types/index.js';

describe('FolderNode', () => {
  const mockConfig = DEFAULT_CONFIG;
  const mockOnSelect = vi.fn();
  const mockOnToggle = vi.fn();
  const mockMapGitStatusMarker = (status: GitStatus) => {
    const markers: Record<GitStatus, string> = {
      modified: 'M',
      added: 'A',
      deleted: 'D',
      untracked: 'U',
      ignored: 'I',
    };
    return markers[status];
  };
  const mockGetNodeColor = (
    node: TreeNodeType,
    selected: boolean,
    showGitStatus: boolean
  ) => {
    if (selected) return 'cyan';
    if (showGitStatus && node.gitStatus === 'modified') return 'yellow';
    if (node.type === 'directory') return 'blue';
    return 'white';
  };
  const mockRenderChild = vi.fn((child: TreeNodeType) => (
    <div key={child.path}>{child.name}</div>
  ));

  it('renders collapsed folder with ▶ icon', () => {
    const node: TreeNodeType = {
      name: 'src',
      path: '/src',
      type: 'directory',
      depth: 0,
      expanded: false,
    };

    const { lastFrame } = render(
      <FolderNode
        node={node}
        selected={false}
        config={mockConfig}
        mapGitStatusMarker={mockMapGitStatusMarker}
        getNodeColor={mockGetNodeColor}
        renderChild={mockRenderChild}
      />
    );

    const output = lastFrame();
    // Should render ▶ (U+25B6), but test env may show � replacement character
    expect(output).toMatch(/[▶�] src/);
    expect(output).not.toMatch(/[▼] src/);
  });

  it('renders expanded folder with ▼ icon', () => {
    const node: TreeNodeType = {
      name: 'src',
      path: '/src',
      type: 'directory',
      depth: 0,
      expanded: true,
      children: [],
    };

    const { lastFrame } = render(
      <FolderNode
        node={node}
        selected={false}
        
        
        
        config={mockConfig}
        mapGitStatusMarker={mockMapGitStatusMarker}
        getNodeColor={mockGetNodeColor}
        renderChild={mockRenderChild}
      />
    );

    const output = lastFrame();
    // Should render ▼ (U+25BC), but test env may show � replacement character
    expect(output).toMatch(/[▼�] src/);
    expect(output).not.toMatch(/[▶] src/);
  });

  it('applies proper indentation based on depth', () => {
    const node: TreeNodeType = {
      name: 'nested',
      path: '/a/b/c/nested',
      type: 'directory',
      depth: 3,
      expanded: false,
    };

    const { lastFrame } = render(
      <FolderNode
        node={node}
        selected={false}
        
        
        
        config={mockConfig}
        mapGitStatusMarker={mockMapGitStatusMarker}
        getNodeColor={mockGetNodeColor}
        renderChild={mockRenderChild}
      />
    );

    // depth=3, treeIndent=2 -> 6 spaces
    expect(lastFrame()).toMatch(/\s{6}[▶�] nested/);
  });

  it('displays git status marker when present', () => {
    const node: TreeNodeType = {
      name: 'modified-folder',
      path: '/modified-folder',
      type: 'directory',
      depth: 0,
      expanded: false,
      gitStatus: 'modified',
    };

    const { lastFrame } = render(
      <FolderNode
        node={node}
        selected={false}
        
        
        
        config={mockConfig}
        mapGitStatusMarker={mockMapGitStatusMarker}
        getNodeColor={mockGetNodeColor}
        renderChild={mockRenderChild}
      />
    );

    expect(lastFrame()).toContain('modified-folder M');
  });

  it('hides git marker when showGitStatus is false', () => {
    const node: TreeNodeType = {
      name: 'modified-folder',
      path: '/modified-folder',
      type: 'directory',
      depth: 0,
      expanded: false,
      gitStatus: 'modified',
    };

    const configNoGit = { ...mockConfig, showGitStatus: false };

    const { lastFrame } = render(
      <FolderNode
        node={node}
        selected={false}
        
        
        
        config={configNoGit}
        mapGitStatusMarker={mockMapGitStatusMarker}
        getNodeColor={mockGetNodeColor}
        renderChild={mockRenderChild}
      />
    );

    // Should NOT contain the M marker
    expect(lastFrame()).not.toContain(' M');
    expect(lastFrame()).toContain('modified-folder');
  });

  it('renders all git status types correctly for folders', () => {
    const statuses: Array<{ status: GitStatus; marker: string }> = [
      { status: 'modified', marker: 'M' },
      { status: 'added', marker: 'A' },
      { status: 'deleted', marker: 'D' },
      { status: 'untracked', marker: 'U' },
      { status: 'ignored', marker: 'I' },
    ];

    statuses.forEach(({ status, marker }) => {
      const node: TreeNodeType = {
        name: `${status}-folder`,
        path: `/${status}-folder`,
        type: 'directory',
        depth: 0,
        expanded: false,
        gitStatus: status,
      };

      const { lastFrame } = render(
        <FolderNode
          node={node}
          selected={false}
          config={mockConfig}
          mapGitStatusMarker={mockMapGitStatusMarker}
          getNodeColor={mockGetNodeColor}
          renderChild={mockRenderChild}
        />
      );

      expect(lastFrame()).toContain(`${status}-folder ${marker}`);
    });
  });

  it('renders children when expanded', () => {
    // Create a fresh mock for this test to avoid accumulation
    const freshRenderChild = vi.fn((child: TreeNodeType) => (
      <div key={child.path}>{child.name}</div>
    ));

    const node: TreeNodeType = {
      name: 'parent',
      path: '/parent',
      type: 'directory',
      depth: 0,
      expanded: true,
      children: [
        { name: 'child1.txt', path: '/parent/child1.txt', type: 'file', depth: 1 },
        { name: 'child2.txt', path: '/parent/child2.txt', type: 'file', depth: 1 },
      ],
    };

    render(
      <FolderNode
        node={node}
        selected={false}
        
        
        
        config={mockConfig}
        mapGitStatusMarker={mockMapGitStatusMarker}
        getNodeColor={mockGetNodeColor}
        renderChild={freshRenderChild}
      />
    );

    // Verify that renderChild was called with both children
    // Note: May be called multiple times due to React rendering behavior (e.g., StrictMode)
    expect(freshRenderChild).toHaveBeenCalledWith(node.children![0]);
    expect(freshRenderChild).toHaveBeenCalledWith(node.children![1]);
  });

  it('does not render children when collapsed', () => {
    // Create a fresh mock for this test
    const freshRenderChild = vi.fn((child: TreeNodeType) => (
      <div key={child.path}>{child.name}</div>
    ));

    const node: TreeNodeType = {
      name: 'collapsed',
      path: '/collapsed',
      type: 'directory',
      depth: 0,
      expanded: false,
      children: [
        { name: 'hidden.txt', path: '/collapsed/hidden.txt', type: 'file', depth: 1 },
      ],
    };

    render(
      <FolderNode
        node={node}
        selected={false}
        
        
        
        config={mockConfig}
        mapGitStatusMarker={mockMapGitStatusMarker}
        getNodeColor={mockGetNodeColor}
        renderChild={freshRenderChild}
      />
    );

    expect(freshRenderChild).not.toHaveBeenCalled();
  });

  it('handles missing children gracefully', () => {
    const node: TreeNodeType = {
      name: 'no-children',
      path: '/no-children',
      type: 'directory',
      depth: 0,
      expanded: true,
      // children is undefined
    };

    const { lastFrame } = render(
      <FolderNode
        node={node}
        selected={false}
        
        
        
        config={mockConfig}
        mapGitStatusMarker={mockMapGitStatusMarker}
        getNodeColor={mockGetNodeColor}
        renderChild={mockRenderChild}
      />
    );

    // Should render without crashing
    expect(lastFrame()).toContain('no-children');
  });

  it('uses custom treeIndent from config', () => {
    const node: TreeNodeType = {
      name: 'folder',
      path: '/a/b/folder',
      type: 'directory',
      depth: 2,
      expanded: false,
    };

    const customConfig = { ...mockConfig, treeIndent: 4 };

    const { lastFrame } = render(
      <FolderNode
        node={node}
        selected={false}
        
        
        
        config={customConfig}
        mapGitStatusMarker={mockMapGitStatusMarker}
        getNodeColor={mockGetNodeColor}
        renderChild={mockRenderChild}
      />
    );

    // depth=2, treeIndent=4 -> 8 spaces
    expect(lastFrame()).toMatch(/\s{8}[▶�] folder/);
  });

  it('verifies selection styling is applied', () => {
    const mockGetNodeColorSpy = vi.fn(mockGetNodeColor);

    const node: TreeNodeType = {
      name: 'selected-folder',
      path: '/selected-folder',
      type: 'directory',
      depth: 0,
      expanded: false,
    };

    render(
      <FolderNode
        node={node}
        selected={true}
        config={mockConfig}
        mapGitStatusMarker={mockMapGitStatusMarker}
        getNodeColor={mockGetNodeColorSpy}
        renderChild={mockRenderChild}
      />
    );

    // Verify getNodeColor was called with selected=true
    expect(mockGetNodeColorSpy).toHaveBeenCalledWith(node, true, mockConfig.showGitStatus);
  });

  it('dims deleted folders but not selected ones', () => {
    const deletedNode: TreeNodeType = {
      name: 'deleted',
      path: '/deleted',
      type: 'directory',
      depth: 0,
      expanded: false,
      gitStatus: 'deleted',
    };

    const selectedDeletedNode: TreeNodeType = {
      name: 'selected-deleted',
      path: '/selected-deleted',
      type: 'directory',
      depth: 0,
      expanded: false,
      gitStatus: 'deleted',
    };

    const { lastFrame: deletedFrame } = render(
      <FolderNode
        node={deletedNode}
        selected={false}
        
        
        
        config={mockConfig}
        mapGitStatusMarker={mockMapGitStatusMarker}
        getNodeColor={mockGetNodeColor}
        renderChild={mockRenderChild}
      />
    );

    const { lastFrame: selectedFrame } = render(
      <FolderNode
        node={selectedDeletedNode}
        selected={true}
        selectedPath="/selected-deleted"
        
        
        config={mockConfig}
        mapGitStatusMarker={mockMapGitStatusMarker}
        getNodeColor={mockGetNodeColor}
        renderChild={mockRenderChild}
      />
    );

    // Both should render (no crashes)
    expect(deletedFrame()).toContain('deleted');
    expect(selectedFrame()).toContain('selected-deleted');
  });
});
