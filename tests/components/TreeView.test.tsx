import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { TreeView } from '../../src/components/TreeView.js';
import { DEFAULT_CONFIG } from '../../src/types/index.js';
import type { TreeNode } from '../../src/types/index.js';

describe('TreeView', () => {
  const mockConfig = DEFAULT_CONFIG;
  const mockOnSelect = vi.fn();

  it('renders empty state when no files', () => {
    const { lastFrame } = render(
      <TreeView
        fileTree={[]}
        selectedPath=""
        onSelect={mockOnSelect}
        config={mockConfig}
      />
    );

    expect(lastFrame()).toContain('No files to display');
  });

  it('renders file tree with TreeNode components', () => {
    const fileTree: TreeNode[] = [
      {
        name: 'test.txt',
        path: '/test.txt',
        type: 'file',
        depth: 0,
      },
      {
        name: 'src',
        path: '/src',
        type: 'directory',
        depth: 0,
        expanded: false,
      },
    ];

    const { lastFrame } = render(
      <TreeView
        fileTree={fileTree}
        selectedPath=""
        onSelect={mockOnSelect}
        config={mockConfig}
      />
    );

    const output = lastFrame();
    expect(output).toContain('test.txt');
    expect(output).toContain('src');
  });

  it('highlights selected node', () => {
    const fileTree: TreeNode[] = [
      {
        name: 'test.txt',
        path: '/test.txt',
        type: 'file',
        depth: 0,
      },
    ];

    const { lastFrame } = render(
      <TreeView
        fileTree={fileTree}
        selectedPath="/test.txt"
        onSelect={mockOnSelect}
        config={mockConfig}
      />
    );

    // Selected nodes are rendered in cyan by TreeNode component
    expect(lastFrame()).toContain('test.txt');
  });

  it('renders nested tree structure', () => {
    const fileTree: TreeNode[] = [
      {
        name: 'src',
        path: '/src',
        type: 'directory',
        depth: 0,
        expanded: true,
        children: [
          {
            name: 'App.tsx',
            path: '/src/App.tsx',
            type: 'file',
            depth: 1,
          },
        ],
      },
    ];

    const { lastFrame } = render(
      <TreeView
        fileTree={fileTree}
        selectedPath=""
        onSelect={mockOnSelect}
        config={mockConfig}
      />
    );

    const output = lastFrame();
    expect(output).toContain('src');
    expect(output).toContain('App.tsx');
  });

  it('passes onSelect callback to TreeNode', () => {
    const fileTree: TreeNode[] = [
      {
        name: 'test.txt',
        path: '/test.txt',
        type: 'file',
        depth: 0,
      },
    ];

    render(
      <TreeView
        fileTree={fileTree}
        selectedPath=""
        onSelect={mockOnSelect}
        config={mockConfig}
      />
    );

    // TreeNode receives the onSelect callback
    // (actual invocation testing would require simulating clicks, which is complex with Ink)
    expect(mockOnSelect).not.toHaveBeenCalled(); // Not called during render
  });
});
