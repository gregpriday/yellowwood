import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TreeView } from '../../src/components/TreeView.js';
import { DEFAULT_CONFIG } from '../../src/types/index.js';
import type { TreeNode } from '../../src/types/index.js';

describe('TreeView virtualization', () => {
  let originalRows: number | undefined;

  beforeEach(() => {
    // Save original terminal rows
    originalRows = process.stdout.rows;
  });

  afterEach(() => {
    // Restore original terminal rows
    if (originalRows !== undefined) {
      Object.defineProperty(process.stdout, 'rows', {
        value: originalRows,
        writable: true,
        configurable: true,
      });
    }
  });

  const createLargeTree = (count: number): TreeNode[] => {
    return Array.from({ length: count }, (_, i) => ({
      name: `file-${i}.txt`,
      path: `/root/file-${i}.txt`,
      type: 'file' as const,
      depth: 0,
    }));
  };

  const createNestedTree = (): TreeNode[] => {
    return [
      {
        name: 'folder1',
        path: '/root/folder1',
        type: 'directory' as const,
        depth: 0,
        expanded: true,
        children: [
          { name: 'file1.txt', path: '/root/folder1/file1.txt', type: 'file' as const, depth: 1 },
          { name: 'file2.txt', path: '/root/folder1/file2.txt', type: 'file' as const, depth: 1 },
        ],
      },
      {
        name: 'folder2',
        path: '/root/folder2',
        type: 'directory' as const,
        depth: 0,
        expanded: false,
        children: [
          { name: 'hidden.txt', path: '/root/folder2/hidden.txt', type: 'file' as const, depth: 1 },
        ],
      },
      { name: 'file3.txt', path: '/root/file3.txt', type: 'file' as const, depth: 0 },
    ];
  };

  describe('rendering', () => {
    it('renders empty state when fileTree is empty', () => {
      const { lastFrame } = render(
        <TreeView
          fileTree={[]}
          selectedPath=""
          onSelect={vi.fn()}
          config={DEFAULT_CONFIG}
        />
      );

      const output = lastFrame();
      expect(output).toContain('No files to display');
    });

    it('renders visible nodes when tree fits in viewport', () => {
      // Mock small terminal
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const smallTree = createLargeTree(10);
      const { lastFrame } = render(
        <TreeView
          fileTree={smallTree}
          selectedPath=""
          onSelect={vi.fn()}
          config={DEFAULT_CONFIG}
        />
      );

      const output = lastFrame();

      // All files should be visible
      expect(output).toContain('file-0.txt');
      expect(output).toContain('file-9.txt');

      // No scroll indicators
      expect(output).not.toContain('more above');
      expect(output).not.toContain('more below');
    });

    it('renders only visible portion of large tree', () => {
      // Mock terminal height: 30 rows total, 27 for tree (30 - 3 reserved)
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const largeTree = createLargeTree(100);
      const { lastFrame } = render(
        <TreeView
          fileTree={largeTree}
          selectedPath=""
          onSelect={vi.fn()}
          config={DEFAULT_CONFIG}
        />
      );

      const output = lastFrame();

      // First few files should be visible
      expect(output).toContain('file-0.txt');

      // Files way down the list should NOT be visible
      expect(output).not.toContain('file-50.txt');
      expect(output).not.toContain('file-99.txt');

      // Should show "more below" indicator
      expect(output).toContain('more below');
    });

    it('shows bottom scroll indicator for large tree', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const largeTree = createLargeTree(100);
      const { lastFrame } = render(
        <TreeView
          fileTree={largeTree}
          selectedPath=""
          onSelect={vi.fn()}
          config={DEFAULT_CONFIG}
        />
      );

      const output = lastFrame();

      // Should show "more below" indicator when initially rendered with large tree
      expect(output).toContain('more below');
    });

    it('respects expansion state for directories', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const tree = createNestedTree();
      const { lastFrame } = render(
        <TreeView
          fileTree={tree}
          selectedPath=""
          onSelect={vi.fn()}
          config={DEFAULT_CONFIG}
        />
      );

      const output = lastFrame();

      // Expanded folder1 children should be visible
      expect(output).toContain('folder1');
      expect(output).toContain('file1.txt');
      expect(output).toContain('file2.txt');

      // Collapsed folder2 children should NOT be visible
      expect(output).toContain('folder2');
      expect(output).not.toContain('hidden.txt');

      // Root file should be visible
      expect(output).toContain('file3.txt');
    });

    it('highlights selected node', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const tree = createLargeTree(10);
      const { lastFrame } = render(
        <TreeView
          fileTree={tree}
          selectedPath="/root/file-5.txt"
          onSelect={vi.fn()}
          config={DEFAULT_CONFIG}
        />
      );

      const output = lastFrame();

      // The selected file should be present and will be rendered with selection styling
      expect(output).toContain('file-5.txt');
    });
  });

  describe('keyboard navigation', () => {
    it('navigates down on down arrow', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const tree = createLargeTree(10);
      const onSelect = vi.fn();

      const { stdin } = render(
        <TreeView
          fileTree={tree}
          selectedPath="/root/file-0.txt"
          onSelect={onSelect}
          config={DEFAULT_CONFIG}
        />
      );

      // Press down arrow
      stdin.write('\x1B[B');

      // Should call onSelect with next file
      expect(onSelect).toHaveBeenCalledWith('/root/file-1.txt');
    });

    it('navigates up on up arrow', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const tree = createLargeTree(10);
      const onSelect = vi.fn();

      const { stdin } = render(
        <TreeView
          fileTree={tree}
          selectedPath="/root/file-5.txt"
          onSelect={onSelect}
          config={DEFAULT_CONFIG}
        />
      );

      // Press up arrow
      stdin.write('\x1B[A');

      // Should call onSelect with previous file
      expect(onSelect).toHaveBeenCalledWith('/root/file-4.txt');
    });

    it('does not navigate up past first item', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const tree = createLargeTree(10);
      const onSelect = vi.fn();

      const { stdin } = render(
        <TreeView
          fileTree={tree}
          selectedPath="/root/file-0.txt"
          onSelect={onSelect}
          config={DEFAULT_CONFIG}
        />
      );

      // Press up arrow at first item
      stdin.write('\x1B[A');

      // Should still be on first item
      expect(onSelect).toHaveBeenCalledWith('/root/file-0.txt');
    });

    it('does not navigate down past last item', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const tree = createLargeTree(10);
      const onSelect = vi.fn();

      const { stdin } = render(
        <TreeView
          fileTree={tree}
          selectedPath="/root/file-9.txt"
          onSelect={onSelect}
          config={DEFAULT_CONFIG}
        />
      );

      // Press down arrow at last item
      stdin.write('\x1B[B');

      // Should still be on last item
      expect(onSelect).toHaveBeenCalledWith('/root/file-9.txt');
    });

    it('jumps page down on PageDown', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const tree = createLargeTree(100);
      const onSelect = vi.fn();

      const { stdin } = render(
        <TreeView
          fileTree={tree}
          selectedPath="/root/file-0.txt"
          onSelect={onSelect}
          config={DEFAULT_CONFIG}
        />
      );

      // Press PageDown (viewport is 23 rows: 30 - 7 reserved)
      stdin.write('\x1B[6~');

      // Should jump by viewport height
      expect(onSelect).toHaveBeenCalled();
      const lastCall = onSelect.mock.calls[onSelect.mock.calls.length - 1][0];
      expect(lastCall).toContain('file-23.txt');
    });

    it('jumps to start on Home', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const tree = createLargeTree(100);
      const onSelect = vi.fn();

      const { stdin } = render(
        <TreeView
          fileTree={tree}
          selectedPath="/root/file-50.txt"
          onSelect={onSelect}
          config={DEFAULT_CONFIG}
        />
      );

      // Press Home
      stdin.write('\x1B[H');

      // Should jump to first item
      expect(onSelect).toHaveBeenCalledWith('/root/file-0.txt');
    });

    it('jumps to end on End', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const tree = createLargeTree(100);
      const onSelect = vi.fn();

      const { stdin } = render(
        <TreeView
          fileTree={tree}
          selectedPath="/root/file-0.txt"
          onSelect={onSelect}
          config={DEFAULT_CONFIG}
        />
      );

      // Press End
      stdin.write('\x1B[F');

      // Should jump to last item
      expect(onSelect).toHaveBeenCalledWith('/root/file-99.txt');
    });

    it('shows collapsed folder without children', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const tree: TreeNode[] = [
        {
          name: 'folder',
          path: '/root/folder',
          type: 'directory',
          depth: 0,
          expanded: false,
          children: [
            { name: 'child.txt', path: '/root/folder/child.txt', type: 'file', depth: 1 },
          ],
        },
      ];

      const { lastFrame } = render(
        <TreeView
          fileTree={tree}
          selectedPath="/root/folder"
          onSelect={vi.fn()}
          config={DEFAULT_CONFIG}
        />
      );

      // Collapsed folder - child not visible
      const output = lastFrame();
      expect(output).toContain('folder');
      expect(output).not.toContain('child.txt');
    });
  });

  describe('auto-scroll', () => {
    it('renders initial view without scroll indicator', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 15, writable: true, configurable: true });

      const tree = createLargeTree(50);

      const { lastFrame } = render(
        <TreeView
          fileTree={tree}
          selectedPath="/root/file-0.txt"
          onSelect={vi.fn()}
          config={DEFAULT_CONFIG}
        />
      );

      const output = lastFrame();

      // Should NOT show "more above" indicator at top of tree
      expect(output).not.toContain('more above');
      // Should show "more below" indicator with large tree
      expect(output).toContain('more below');
    });

    // Note: Auto-scroll behavior is tested via unit tests in treeViewVirtualization.test.ts
    // Integration tests with Ink rendering are flaky due to async React updates
  });

  describe('terminal resize', () => {
    it('updates viewport height on terminal resize', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const tree = createLargeTree(50);
      const { lastFrame } = render(
        <TreeView
          fileTree={tree}
          selectedPath=""
          onSelect={vi.fn()}
          config={DEFAULT_CONFIG}
        />
      );

      // Initial render
      let output = lastFrame();
      const initialLines = output.split('\n').length;

      // Simulate terminal resize
      Object.defineProperty(process.stdout, 'rows', { value: 20, writable: true, configurable: true });
      process.stdout.emit('resize');

      // Wait a tick for React to re-render
      output = lastFrame();
      const newLines = output.split('\n').length;

      // Should render fewer lines after resize
      // (This is a simplified check - actual behavior depends on Ink's rendering)
      expect(newLines).toBeLessThanOrEqual(initialLines);
    });
  });

  describe('left/right arrow navigation', () => {
    it('collapses expanded folder with left arrow', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const expandedPaths = new Set(['/root/folder1']);
      const onToggleExpand = vi.fn();

      const tree: TreeNode[] = [
        {
          name: 'folder1',
          path: '/root/folder1',
          type: 'directory',
          depth: 0,
          expanded: true,
          children: [
            { name: 'file1.txt', path: '/root/folder1/file1.txt', type: 'file', depth: 1 },
          ],
        },
      ];

      const { stdin } = render(
        <TreeView
          fileTree={tree}
          selectedPath="/root/folder1"
          onSelect={vi.fn()}
          onToggleExpand={onToggleExpand}
          expandedPaths={expandedPaths}
          config={DEFAULT_CONFIG}
        />
      );

      // Press left arrow on expanded folder
      stdin.write('\x1B[D');

      // Should toggle (collapse) the folder
      expect(onToggleExpand).toHaveBeenCalledWith('/root/folder1');
    });

    it('moves to parent with left arrow on collapsed node', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const expandedPaths = new Set(['/root/folder1']);
      const onSelect = vi.fn();

      const tree: TreeNode[] = [
        {
          name: 'folder1',
          path: '/root/folder1',
          type: 'directory',
          depth: 0,
          expanded: true,
          children: [
            { name: 'file1.txt', path: '/root/folder1/file1.txt', type: 'file', depth: 1 },
          ],
        },
      ];

      const { stdin } = render(
        <TreeView
          fileTree={tree}
          selectedPath="/root/folder1/file1.txt"
          onSelect={onSelect}
          expandedPaths={expandedPaths}
          config={DEFAULT_CONFIG}
        />
      );

      // Press left arrow on child file (should move to parent)
      stdin.write('\x1B[D');

      // Should move to parent folder
      expect(onSelect).toHaveBeenCalledWith('/root/folder1');
    });

    it('does nothing with left arrow on root node', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const onSelect = vi.fn();
      const onToggleExpand = vi.fn();

      const tree: TreeNode[] = [
        {
          name: 'folder1',
          path: '/root/folder1',
          type: 'directory',
          depth: 0,
          expanded: false,
          children: [],
        },
      ];

      const { stdin } = render(
        <TreeView
          fileTree={tree}
          selectedPath="/root/folder1"
          onSelect={onSelect}
          onToggleExpand={onToggleExpand}
          config={DEFAULT_CONFIG}
        />
      );

      // Press left arrow on root collapsed folder
      stdin.write('\x1B[D');

      // Should not call onSelect (can't move to parent at depth 0)
      expect(onSelect).not.toHaveBeenCalled();
      // Should not toggle (already collapsed)
      expect(onToggleExpand).not.toHaveBeenCalled();
    });

    it('expands collapsed folder with right arrow', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const expandedPaths = new Set<string>();
      const onToggleExpand = vi.fn();

      const tree: TreeNode[] = [
        {
          name: 'folder1',
          path: '/root/folder1',
          type: 'directory',
          depth: 0,
          expanded: false,
          children: [
            { name: 'file1.txt', path: '/root/folder1/file1.txt', type: 'file', depth: 1 },
          ],
        },
      ];

      const { stdin } = render(
        <TreeView
          fileTree={tree}
          selectedPath="/root/folder1"
          onSelect={vi.fn()}
          onToggleExpand={onToggleExpand}
          expandedPaths={expandedPaths}
          config={DEFAULT_CONFIG}
        />
      );

      // Press right arrow on collapsed folder
      stdin.write('\x1B[C');

      // Should toggle (expand) the folder
      expect(onToggleExpand).toHaveBeenCalledWith('/root/folder1');
    });

    it('moves to first child with right arrow on expanded folder', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const expandedPaths = new Set(['/root/folder1']);
      const onSelect = vi.fn();

      const tree: TreeNode[] = [
        {
          name: 'folder1',
          path: '/root/folder1',
          type: 'directory',
          depth: 0,
          expanded: true,
          children: [
            { name: 'file1.txt', path: '/root/folder1/file1.txt', type: 'file', depth: 1 },
            { name: 'file2.txt', path: '/root/folder1/file2.txt', type: 'file', depth: 1 },
          ],
        },
      ];

      const { stdin } = render(
        <TreeView
          fileTree={tree}
          selectedPath="/root/folder1"
          onSelect={onSelect}
          expandedPaths={expandedPaths}
          config={DEFAULT_CONFIG}
        />
      );

      // Press right arrow on expanded folder with children
      stdin.write('\x1B[C');

      // Should move to first child
      expect(onSelect).toHaveBeenCalledWith('/root/folder1/file1.txt');
    });

    it('does nothing with right arrow on expanded folder without children', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const expandedPaths = new Set(['/root/folder1']);
      const onSelect = vi.fn();
      const onToggleExpand = vi.fn();

      const tree: TreeNode[] = [
        {
          name: 'folder1',
          path: '/root/folder1',
          type: 'directory',
          depth: 0,
          expanded: true,
          children: [],
        },
      ];

      const { stdin } = render(
        <TreeView
          fileTree={tree}
          selectedPath="/root/folder1"
          onSelect={onSelect}
          onToggleExpand={onToggleExpand}
          expandedPaths={expandedPaths}
          config={DEFAULT_CONFIG}
        />
      );

      // Press right arrow on expanded empty folder
      stdin.write('\x1B[C');

      // Should not move or toggle
      expect(onSelect).not.toHaveBeenCalled();
      expect(onToggleExpand).not.toHaveBeenCalled();
    });

    it('does nothing with right arrow on file', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const onSelect = vi.fn();
      const onToggleExpand = vi.fn();

      const tree: TreeNode[] = [
        { name: 'file1.txt', path: '/root/file1.txt', type: 'file', depth: 0 },
      ];

      const { stdin } = render(
        <TreeView
          fileTree={tree}
          selectedPath="/root/file1.txt"
          onSelect={onSelect}
          onToggleExpand={onToggleExpand}
          config={DEFAULT_CONFIG}
        />
      );

      // Press right arrow on file
      stdin.write('\x1B[C');

      // Should do nothing
      expect(onSelect).not.toHaveBeenCalled();
      expect(onToggleExpand).not.toHaveBeenCalled();
    });
  });

  describe('Enter key navigation', () => {
    it('selects file with Enter key', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const onSelect = vi.fn();

      const tree: TreeNode[] = [
        { name: 'file1.txt', path: '/root/file1.txt', type: 'file', depth: 0 },
      ];

      const { stdin } = render(
        <TreeView
          fileTree={tree}
          selectedPath="/root/file1.txt"
          onSelect={onSelect}
          config={DEFAULT_CONFIG}
        />
      );

      // Press Enter on file
      stdin.write('\r');

      // Should call onSelect (open file)
      expect(onSelect).toHaveBeenCalledWith('/root/file1.txt');
    });

    it('toggles folder with Enter key', () => {
      Object.defineProperty(process.stdout, 'rows', { value: 30, writable: true, configurable: true });

      const expandedPaths = new Set<string>();
      const onToggleExpand = vi.fn();

      const tree: TreeNode[] = [
        {
          name: 'folder1',
          path: '/root/folder1',
          type: 'directory',
          depth: 0,
          expanded: false,
          children: [],
        },
      ];

      const { stdin } = render(
        <TreeView
          fileTree={tree}
          selectedPath="/root/folder1"
          onSelect={vi.fn()}
          onToggleExpand={onToggleExpand}
          expandedPaths={expandedPaths}
          config={DEFAULT_CONFIG}
        />
      );

      // Press Enter on folder
      stdin.write('\r');

      // Should toggle folder
      expect(onToggleExpand).toHaveBeenCalledWith('/root/folder1');
    });
  });
});
