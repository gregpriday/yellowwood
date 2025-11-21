// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecentActivity } from '../../src/hooks/useRecentActivity.js';
import { events } from '../../src/services/events.js';
import type { RecentActivityConfig } from '../../src/types/index.js';

describe('useRecentActivity', () => {
  const testRootPath = '/test/workspace';
  const defaultConfig: RecentActivityConfig = {
    enabled: true,
    windowMinutes: 10,
    maxEntries: 50,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('initializes with empty events', () => {
    const { result } = renderHook(() => useRecentActivity(testRootPath, defaultConfig));

    expect(result.current.recentEvents).toEqual([]);
    expect(result.current.lastEvent).toBeNull();
    expect(typeof result.current.clearEvents).toBe('function');
  });

  it('captures watcher events and converts to relative paths', () => {
    const { result } = renderHook(() => useRecentActivity(testRootPath, defaultConfig));

    // Emit a watcher event with absolute path
    act(() => {
      events.emit('watcher:change', {
        type: 'change',
        path: '/test/workspace/src/App.tsx',
      });
    });

    expect(result.current.recentEvents).toHaveLength(1);

    const event = result.current.recentEvents[0];
    expect(event.path).toBe('src/App.tsx'); // Converted to relative
    expect(event.type).toBe('change');
    expect(event.timestamp).toBeGreaterThan(0);
  });

  it('stores events with newest first', () => {
    const { result } = renderHook(() => useRecentActivity(testRootPath, defaultConfig));

    // Emit multiple events
    act(() => {
      events.emit('watcher:change', {
        type: 'add',
        path: '/test/workspace/file1.txt',
      });
      vi.advanceTimersByTime(100);
      events.emit('watcher:change', {
        type: 'change',
        path: '/test/workspace/file2.txt',
      });
      vi.advanceTimersByTime(100);
      events.emit('watcher:change', {
        type: 'unlink',
        path: '/test/workspace/file3.txt',
      });
    });

    expect(result.current.recentEvents).toHaveLength(3);

    // Newest should be first
    expect(result.current.recentEvents[0].path).toBe('file3.txt');
    expect(result.current.recentEvents[1].path).toBe('file2.txt');
    expect(result.current.recentEvents[2].path).toBe('file1.txt');

    // lastEvent should be the most recent
    expect(result.current.lastEvent?.path).toBe('file3.txt');
  });

  it('deduplicates events for the same path (keeps latest)', () => {
    const { result } = renderHook(() => useRecentActivity(testRootPath, defaultConfig));

    // Emit event for file1.txt with type 'add'
    act(() => {
      events.emit('watcher:change', {
        type: 'add',
        path: '/test/workspace/src/file1.txt',
      });
    });

    expect(result.current.recentEvents).toHaveLength(1);
    expect(result.current.recentEvents[0].type).toBe('add');

    // Emit another event for same path with type 'change'
    act(() => {
      vi.advanceTimersByTime(1000);
      events.emit('watcher:change', {
        type: 'change',
        path: '/test/workspace/src/file1.txt',
      });
    });

    // Should still have only 1 event (deduplicated)
    expect(result.current.recentEvents).toHaveLength(1);

    // Should have kept the latest event
    expect(result.current.recentEvents[0].type).toBe('change');
    expect(result.current.recentEvents[0].path).toBe('src/file1.txt');
  });

  it('respects maxEntries limit', () => {
    const smallConfig: RecentActivityConfig = {
      enabled: true,
      windowMinutes: 10,
      maxEntries: 3, // Only keep 3 events
    };

    const { result } = renderHook(() => useRecentActivity(testRootPath, smallConfig));

    // Emit 5 events
    act(() => {
      for (let i = 1; i <= 5; i++) {
        events.emit('watcher:change', {
          type: 'add',
          path: `/test/workspace/file${i}.txt`,
        });
        vi.advanceTimersByTime(100);
      }
    });

    // Should only keep the 3 newest events
    expect(result.current.recentEvents).toHaveLength(3);

    // Should have the 3 most recent files (5, 4, 3)
    expect(result.current.recentEvents[0].path).toBe('file5.txt');
    expect(result.current.recentEvents[1].path).toBe('file4.txt');
    expect(result.current.recentEvents[2].path).toBe('file3.txt');
  });

  it('prunes events older than windowMinutes', () => {
    const config: RecentActivityConfig = {
      enabled: true,
      windowMinutes: 5, // 5 minutes window
      maxEntries: 50,
    };

    const { result } = renderHook(() => useRecentActivity(testRootPath, config));

    // Emit an event
    act(() => {
      events.emit('watcher:change', {
        type: 'add',
        path: '/test/workspace/old-file.txt',
      });
    });

    expect(result.current.recentEvents).toHaveLength(1);

    // Advance time by 6 minutes (beyond the window) and emit new event
    act(() => {
      vi.advanceTimersByTime(6 * 60 * 1000);
      events.emit('watcher:change', {
        type: 'add',
        path: '/test/workspace/new-file.txt',
      });
    });

    expect(result.current.recentEvents).toHaveLength(1);

    // Old event should be pruned, only new event remains
    expect(result.current.recentEvents[0].path).toBe('new-file.txt');
  });

  it('automatically prunes old events via interval', () => {
    const config: RecentActivityConfig = {
      enabled: true,
      windowMinutes: 1, // 1 minute window
      maxEntries: 50,
    };

    const { result } = renderHook(() => useRecentActivity(testRootPath, config));

    // Emit an event
    act(() => {
      events.emit('watcher:change', {
        type: 'add',
        path: '/test/workspace/file.txt',
      });
    });

    expect(result.current.recentEvents).toHaveLength(1);

    // Advance time by 2 minutes (beyond the window) - trigger the interval
    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });

    // Event should be automatically pruned by interval
    expect(result.current.recentEvents).toHaveLength(0);
  });

  it('clears all events when clearEvents is called', () => {
    const { result } = renderHook(() => useRecentActivity(testRootPath, defaultConfig));

    // Emit multiple events
    act(() => {
      events.emit('watcher:change', { type: 'add', path: '/test/workspace/file1.txt' });
      events.emit('watcher:change', { type: 'add', path: '/test/workspace/file2.txt' });
      events.emit('watcher:change', { type: 'add', path: '/test/workspace/file3.txt' });
    });

    expect(result.current.recentEvents).toHaveLength(3);

    // Clear events
    act(() => {
      result.current.clearEvents();
    });

    expect(result.current.recentEvents).toHaveLength(0);
    expect(result.current.lastEvent).toBeNull();
  });

  it('does not capture events when enabled is false', () => {
    const disabledConfig: RecentActivityConfig = {
      enabled: false,
      windowMinutes: 10,
      maxEntries: 50,
    };

    const { result } = renderHook(() => useRecentActivity(testRootPath, disabledConfig));

    // Emit events
    act(() => {
      events.emit('watcher:change', { type: 'add', path: '/test/workspace/file.txt' });
    });

    expect(result.current.recentEvents).toHaveLength(0);
  });

  it('clears events when config changes from enabled to disabled', () => {
    const { result, rerender } = renderHook(
      ({ config }) => useRecentActivity(testRootPath, config),
      {
        initialProps: { config: { ...defaultConfig, enabled: true } },
      }
    );

    // Emit events while enabled
    act(() => {
      events.emit('watcher:change', { type: 'add', path: '/test/workspace/file.txt' });
    });

    expect(result.current.recentEvents).toHaveLength(1);

    // Disable the feature
    act(() => {
      rerender({ config: { ...defaultConfig, enabled: false } });
    });

    expect(result.current.recentEvents).toHaveLength(0);
  });

  it('re-enables and captures events when config changes from disabled to enabled', () => {
    const { result, rerender } = renderHook(
      ({ config }) => useRecentActivity(testRootPath, config),
      {
        initialProps: { config: { ...defaultConfig, enabled: false } },
      }
    );

    // Emit event while disabled - should not be captured
    act(() => {
      events.emit('watcher:change', { type: 'add', path: '/test/workspace/file1.txt' });
    });

    expect(result.current.recentEvents).toHaveLength(0);

    // Re-enable the feature
    act(() => {
      rerender({ config: { ...defaultConfig, enabled: true } });
    });

    // Emit event after re-enabling - should be captured
    act(() => {
      events.emit('watcher:change', { type: 'add', path: '/test/workspace/file2.txt' });
    });

    expect(result.current.recentEvents).toHaveLength(1);
    expect(result.current.recentEvents[0].path).toBe('file2.txt');
  });

  it('handles paths outside workspace root', () => {
    const { result } = renderHook(() => useRecentActivity(testRootPath, defaultConfig));

    // Emit event with path outside workspace
    act(() => {
      events.emit('watcher:change', {
        type: 'add',
        path: '/different/workspace/file.txt',
      });
    });

    expect(result.current.recentEvents).toHaveLength(1);
    // Path should be converted to relative path (will start with ../)
    // path.relative('/test/workspace', '/different/workspace/file.txt') = '../../different/workspace/file.txt'
    expect(result.current.recentEvents[0].path).toBe('../../different/workspace/file.txt');
  });

  it('unsubscribes from events on unmount', () => {
    const { result, unmount } = renderHook(() => useRecentActivity(testRootPath, defaultConfig));

    // Emit event before unmount
    act(() => {
      events.emit('watcher:change', { type: 'add', path: '/test/workspace/file1.txt' });
    });

    expect(result.current.recentEvents).toHaveLength(1);

    // Unmount the hook
    unmount();

    // Emit event after unmount - should not throw or affect anything
    act(() => {
      events.emit('watcher:change', { type: 'add', path: '/test/workspace/file2.txt' });
    });

    // No assertions here - we just verify no errors are thrown
  });

  it('handles all event types correctly', () => {
    const { result } = renderHook(() => useRecentActivity(testRootPath, defaultConfig));

    const eventTypes: Array<'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'> = [
      'add',
      'change',
      'unlink',
      'addDir',
      'unlinkDir',
    ];

    // Emit one event of each type
    act(() => {
      eventTypes.forEach((type, index) => {
        events.emit('watcher:change', {
          type,
          path: `/test/workspace/file${index}.txt`,
        });
        vi.advanceTimersByTime(10);
      });
    });

    expect(result.current.recentEvents).toHaveLength(5);

    // Verify all types are captured correctly (in reverse order - newest first)
    eventTypes.reverse().forEach((type, index) => {
      expect(result.current.recentEvents[index].type).toBe(type);
    });
  });

  it('handles paths with special characters', () => {
    const { result } = renderHook(() => useRecentActivity(testRootPath, defaultConfig));

    act(() => {
      events.emit('watcher:change', {
        type: 'add',
        path: '/test/workspace/src/file with spaces.tsx',
      });
    });

    expect(result.current.recentEvents).toHaveLength(1);
    expect(result.current.recentEvents[0].path).toBe('src/file with spaces.tsx');
  });

  it('maintains correct order after deduplication', () => {
    const { result } = renderHook(() => useRecentActivity(testRootPath, defaultConfig));

    // Emit events: file1, file2, file3
    act(() => {
      events.emit('watcher:change', { type: 'add', path: '/test/workspace/file1.txt' });
      vi.advanceTimersByTime(100);
      events.emit('watcher:change', { type: 'add', path: '/test/workspace/file2.txt' });
      vi.advanceTimersByTime(100);
      events.emit('watcher:change', { type: 'add', path: '/test/workspace/file3.txt' });
    });

    expect(result.current.recentEvents).toHaveLength(3);

    // Update file1 (should move to top)
    act(() => {
      vi.advanceTimersByTime(100);
      events.emit('watcher:change', { type: 'change', path: '/test/workspace/file1.txt' });
    });

    expect(result.current.recentEvents).toHaveLength(3);

    // Order should now be: file1 (updated), file3, file2
    expect(result.current.recentEvents[0].path).toBe('file1.txt');
    expect(result.current.recentEvents[0].type).toBe('change');
    expect(result.current.recentEvents[1].path).toBe('file3.txt');
    expect(result.current.recentEvents[2].path).toBe('file2.txt');
  });
});
