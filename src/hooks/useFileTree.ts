import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { TreeNode, YellowwoodConfig, GitStatus } from '../types/index.js';
import { buildFileTree } from '../utils/fileTree.js';
import { filterTreeByName, filterTreeByGitStatus } from '../utils/filter.js';

export interface UseFileTreeOptions {
  rootPath: string;
  config: YellowwoodConfig;
  filterQuery?: string | null;
  gitStatusMap?: Map<string, GitStatus>;
  gitStatusFilter?: GitStatus | GitStatus[] | null;
}

export interface UseFileTreeResult {
  tree: TreeNode[];
  rawTree: TreeNode[]; // Unfiltered tree (for commands)
  expandedFolders: Set<string>;
  selectedPath: string | null;
  loading: boolean;
  expandFolder: (path: string) => void;
  collapseFolder: (path: string) => void;
  toggleFolder: (path: string) => void;
  selectPath: (path: string | null) => void;
  refresh: () => Promise<void>;
}

/**
 * Custom hook for managing file tree state.
 *
 * Handles:
 * - Loading tree from filesystem
 * - Expansion/collapse state
 * - Selection state
 * - Filter integration
 * - Git status integration
 *
 * @param options - Configuration options
 * @returns Tree state and actions
 */
export function useFileTree(options: UseFileTreeOptions): UseFileTreeResult {
  const { rootPath, config, filterQuery, gitStatusMap, gitStatusFilter } = options;

  // State
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Ref to track refresh cancellation
  const refreshIdRef = useRef(0);

  // Build initial tree when rootPath or config changes
  useEffect(() => {
    let cancelled = false;

    async function loadTree() {
      setLoading(true);
      // Clear selection and expansion when rootPath changes (worktree switch)
      setSelectedPath(null);
      setExpandedFolders(new Set());

      try {
        const newTree = await buildFileTree(rootPath, config);
        if (!cancelled) {
          setTree(newTree);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to build file tree:', error);
        if (!cancelled) {
          setTree([]); // Empty tree on error
          setLoading(false);
        }
      }
    }

    loadTree();

    // Cleanup: cancel if component unmounts or dependencies change
    return () => {
      cancelled = true;
    };
  }, [rootPath, config]);

  // Apply git status to tree nodes when gitStatusMap changes
  // Convert Map to stable array for dependency tracking (Map reference doesn't change when mutated)
  const gitStatusSignature = useMemo(
    () => (gitStatusMap ? Array.from(gitStatusMap.entries()).sort((a, b) => a[0].localeCompare(b[0])) : []),
    [gitStatusMap]
  );

  const treeWithGitStatus = useMemo(() => {
    if (!gitStatusMap || gitStatusMap.size === 0) {
      return tree;
    }

    // Recursively attach git status to nodes
    function attachGitStatus(nodes: TreeNode[]): TreeNode[] {
      return nodes.map(node => {
        const gitStatus = gitStatusMap?.get(node.path);
        const updatedNode: TreeNode = {
          ...node,
          gitStatus,
          children: node.children ? attachGitStatus(node.children) : undefined,
        };
        return updatedNode;
      });
    }

    return attachGitStatus(tree);
  }, [tree, gitStatusMap, gitStatusSignature]);

  // Apply filters to tree (git status filter first, then name filter)
  const filteredTree = useMemo(() => {
    let result = treeWithGitStatus;

    // Apply git status filter first
    if (gitStatusFilter) {
      try {
        result = filterTreeByGitStatus(result, gitStatusFilter);
      } catch (error) {
        console.warn('Git status filter error:', error);
        result = treeWithGitStatus; // Return unfiltered on error
      }
    }

    // Apply name filter second
    if (filterQuery) {
      try {
        result = filterTreeByName(result, filterQuery);
      } catch (error) {
        console.warn('Name filter error:', error);
        // If name filter fails, return git-filtered tree (don't apply name filter)
      }
    }

    return result;
  }, [treeWithGitStatus, filterQuery, gitStatusFilter]);

  // Expansion actions
  const expandFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.add(path);
      return next;
    });
  }, []);

  const collapseFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
  }, []);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Selection action
  const selectPath = useCallback((path: string | null) => {
    setSelectedPath(path);
  }, []);

  // Refresh action
  const refresh = useCallback(async () => {
    // Increment refresh ID to invalidate any in-flight refreshes
    const currentRefreshId = ++refreshIdRef.current;

    setLoading(true);
    try {
      const newTree = await buildFileTree(rootPath, config);

      // Only update state if this is still the latest refresh
      if (currentRefreshId === refreshIdRef.current) {
        setTree(newTree);
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to refresh tree:', error);

      // Only update state if this is still the latest refresh
      if (currentRefreshId === refreshIdRef.current) {
        setTree([]);
        setLoading(false);
      }
    }
  }, [rootPath, config]);

  return {
    tree: filteredTree,
    rawTree: treeWithGitStatus, // Unfiltered but with git status
    expandedFolders,
    selectedPath,
    loading,
    expandFolder,
    collapseFolder,
    toggleFolder,
    selectPath,
    refresh,
  };
}
