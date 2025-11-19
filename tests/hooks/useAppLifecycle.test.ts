// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAppLifecycle } from '../../src/hooks/useAppLifecycle.js';
import * as config from '../../src/utils/config.js';
import * as worktree from '../../src/utils/worktree.js';
import { DEFAULT_CONFIG } from '../../src/types/index.js';

// Mock modules
vi.mock('../../src/utils/config.js');
vi.mock('../../src/utils/worktree.js');

describe('useAppLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in initializing status', () => {
    vi.mocked(config.loadConfig).mockResolvedValue(DEFAULT_CONFIG);
    vi.mocked(worktree.getWorktrees).mockResolvedValue([]);

    const { result } = renderHook(() =>
      useAppLifecycle({ cwd: '/test', noWatch: true, noGit: true })
    );

    expect(result.current.status).toBe('initializing');
  });

  it('transitions to ready status after successful initialization', async () => {
    vi.mocked(config.loadConfig).mockResolvedValue(DEFAULT_CONFIG);
    vi.mocked(worktree.getWorktrees).mockResolvedValue([]);

    const { result } = renderHook(() =>
      useAppLifecycle({ cwd: '/test', noWatch: true, noGit: true })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
  });

  it('uses provided initialConfig instead of loading', async () => {
    const customConfig = { ...DEFAULT_CONFIG, showHidden: true };

    vi.mocked(worktree.getWorktrees).mockResolvedValue([]);

    const { result } = renderHook(() =>
      useAppLifecycle({
        cwd: '/test',
        initialConfig: customConfig,
        noWatch: true,
        noGit: true,
      })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(config.loadConfig).not.toHaveBeenCalled();
    expect(result.current.config.showHidden).toBe(true);
  });

  it('falls back to defaults on config loading error', async () => {
    vi.mocked(config.loadConfig).mockRejectedValue(new Error('Config error'));
    vi.mocked(worktree.getWorktrees).mockResolvedValue([]);

    const { result } = renderHook(() =>
      useAppLifecycle({ cwd: '/test', noWatch: true, noGit: true })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(result.current.config).toEqual(DEFAULT_CONFIG);

    // Should have issued a warning notification
    await waitFor(() => {
      expect(result.current.notification).toBeTruthy();
    });
    expect(result.current.notification?.type).toBe('warning');
    expect(result.current.notification?.message).toContain('Config error');
  });

  it('handles worktree discovery errors gracefully', async () => {
    vi.mocked(config.loadConfig).mockResolvedValue(DEFAULT_CONFIG);
    vi.mocked(worktree.getWorktrees).mockRejectedValue(new Error('Not a git repo'));

    const { result } = renderHook(() =>
      useAppLifecycle({ cwd: '/test', noWatch: true, noGit: true })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(result.current.worktrees).toEqual([]);
    expect(result.current.activeWorktreeId).toBeNull();
  });

  it('sets active worktree when worktrees are found', async () => {
    const mockWorktrees = [
      { id: 'wt1', path: '/repo/main', name: 'main', branch: 'main', isMain: true },
      { id: 'wt2', path: '/repo/feature', name: 'feature', branch: 'feature-branch', isMain: false },
    ];

    vi.mocked(config.loadConfig).mockResolvedValue(DEFAULT_CONFIG);
    vi.mocked(worktree.getWorktrees).mockResolvedValue(mockWorktrees);
    vi.mocked(worktree.getCurrentWorktree).mockReturnValue(mockWorktrees[0]);

    const { result } = renderHook(() =>
      useAppLifecycle({ cwd: '/repo/main', noWatch: true, noGit: true })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(result.current.worktrees).toEqual(mockWorktrees);
    expect(result.current.activeWorktreeId).toBe('wt1');
    expect(result.current.activeRootPath).toBe('/repo/main');
  });

  it('defaults to first worktree if current is not found', async () => {
    const mockWorktrees = [
      { id: 'wt1', path: '/repo/main', name: 'main', branch: 'main', isMain: true },
      { id: 'wt2', path: '/repo/feature', name: 'feature', branch: 'feature-branch', isMain: false },
    ];

    vi.mocked(config.loadConfig).mockResolvedValue(DEFAULT_CONFIG);
    vi.mocked(worktree.getWorktrees).mockResolvedValue(mockWorktrees);
    vi.mocked(worktree.getCurrentWorktree).mockReturnValue(null);

    const { result } = renderHook(() =>
      useAppLifecycle({ cwd: '/some/other/path', noWatch: true, noGit: true })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(result.current.activeWorktreeId).toBe('wt1');
    expect(result.current.activeRootPath).toBe('/repo/main');
  });

  it('handles catastrophic initialization errors', async () => {
    vi.mocked(config.loadConfig).mockRejectedValue(new Error('Disk failure'));
    vi.mocked(worktree.getWorktrees).mockImplementation(() => {
      throw new Error('Catastrophic error');
    });

    const { result } = renderHook(() =>
      useAppLifecycle({ cwd: '/test', noWatch: true, noGit: true })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toContain('Catastrophic error');

    // Should have issued an error notification
    await waitFor(() => {
      expect(result.current.notification).toBeTruthy();
    });
    expect(result.current.notification?.type).toBe('error');
    expect(result.current.notification?.message).toContain('Initialization failed');
  });

  it('exposes reinitialize function', async () => {
    vi.mocked(config.loadConfig).mockResolvedValue(DEFAULT_CONFIG);
    vi.mocked(worktree.getWorktrees).mockResolvedValue([]);

    const { result } = renderHook(() =>
      useAppLifecycle({ cwd: '/test', noWatch: true, noGit: true })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(typeof result.current.reinitialize).toBe('function');
  });

  it('reinitialize transitions through initializing to ready', async () => {
    let resolveConfig: (value: typeof DEFAULT_CONFIG) => void;
    const slowConfigPromise = new Promise<typeof DEFAULT_CONFIG>((resolve) => {
      resolveConfig = resolve;
    });

    vi.mocked(config.loadConfig).mockReturnValue(slowConfigPromise);
    vi.mocked(worktree.getWorktrees).mockResolvedValue([]);

    const { result } = renderHook(() =>
      useAppLifecycle({ cwd: '/test', noWatch: true, noGit: true })
    );

    // Wait for initial ready (resolve first config load)
    resolveConfig!(DEFAULT_CONFIG);
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    // Setup another slow promise for reinitialize
    const reinitConfigPromise = new Promise<typeof DEFAULT_CONFIG>((resolve) => {
      resolveConfig = resolve;
    });
    vi.mocked(config.loadConfig).mockReturnValue(reinitConfigPromise);

    // Call reinitialize
    const reinitPromise = result.current.reinitialize();

    // Should transition to initializing
    await waitFor(() => {
      expect(result.current.status).toBe('initializing');
    });

    // Resolve the config to complete initialization
    resolveConfig!(DEFAULT_CONFIG);
    await reinitPromise;

    // Should be back to ready
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
  });

  it('prevents concurrent reinitializations', async () => {
    let resolveConfig: () => void;
    const configPromise = new Promise<typeof DEFAULT_CONFIG>((resolve) => {
      resolveConfig = () => resolve(DEFAULT_CONFIG);
    });

    vi.mocked(config.loadConfig).mockReturnValue(configPromise);
    vi.mocked(worktree.getWorktrees).mockResolvedValue([]);

    const { result } = renderHook(() =>
      useAppLifecycle({ cwd: '/test', noWatch: true, noGit: true })
    );

    // Start first initialization (still pending)
    const firstInit = result.current.reinitialize();

    // Try to start second initialization immediately
    const secondInit = result.current.reinitialize();

    // Resolve config
    resolveConfig!();

    await Promise.all([firstInit, secondInit]);

    // Config should only have been loaded once due to guard
    expect(config.loadConfig).toHaveBeenCalledTimes(1);
  });

  it('provides setNotification function', async () => {
    vi.mocked(config.loadConfig).mockResolvedValue(DEFAULT_CONFIG);
    vi.mocked(worktree.getWorktrees).mockResolvedValue([]);

    const { result } = renderHook(() =>
      useAppLifecycle({ cwd: '/test', noWatch: true, noGit: true })
    );

    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });

    expect(typeof result.current.setNotification).toBe('function');
  });
});
