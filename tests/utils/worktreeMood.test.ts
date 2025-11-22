import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { categorizeWorktree } from '../../src/utils/worktreeMood.js';
import type { Worktree, WorktreeChanges } from '../../src/types/index.js';
import simpleGit from 'simple-git';

// Mock simple-git
const logMock = vi.fn();
vi.mock('simple-git', () => {
  const simpleGitFn = vi.fn(() => ({
    log: logMock,
  }));
  return { default: simpleGitFn };
});

const baseWorktree: Worktree = {
  id: '/project/main',
  path: '/project/main',
  name: 'main',
  branch: 'main',
  isCurrent: true,
};

const createChanges = (changedFileCount: number): WorktreeChanges => ({
  worktreeId: baseWorktree.id,
  rootPath: baseWorktree.path,
  changedFileCount,
  changes: [],
  lastUpdated: Date.now(),
});

describe('worktree mood categorization', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-22T00:00:00Z'));
    logMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks clean main branch as stable', async () => {
    const mood = await categorizeWorktree(baseWorktree, createChanges(0), 'main');
    expect(mood).toBe('stable');
    expect(logMock).not.toHaveBeenCalled();
  });

  it('marks dirty feature branch as active', async () => {
    const worktree: Worktree = {
      ...baseWorktree,
      branch: 'feature/cool',
      name: 'feature',
      path: '/project/feature',
      id: '/project/feature',
    };
    const mood = await categorizeWorktree(worktree, createChanges(2), 'main');
    expect(mood).toBe('active');
  });

  it('marks clean but old branch as stale', async () => {
    const worktree: Worktree = {
      ...baseWorktree,
      branch: 'feature/old',
      name: 'feature-old',
      path: '/project/feature-old',
      id: '/project/feature-old',
    };
    // Commit 10 days ago
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    logMock.mockResolvedValueOnce({
      latest: { date: tenDaysAgo },
    });

    const mood = await categorizeWorktree(worktree, createChanges(0), 'main');
    expect(mood).toBe('stale');
    expect(simpleGit).toHaveBeenCalledWith(worktree.path);
  });
});
