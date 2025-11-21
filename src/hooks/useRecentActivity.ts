import { useState, useEffect, useCallback, useRef } from 'react';
import path from 'path';
import type { ActivityEvent, RecentActivityConfig } from '../types/index.js';
import { events } from '../services/events.js';

/**
 * Hook return value interface
 */
export interface UseRecentActivityReturn {
  /** Array of recent activity events, sorted by timestamp (newest first) */
  recentEvents: ActivityEvent[];
  /** Most recent event, or null if no events */
  lastEvent: ActivityEvent | null;
  /** Manually clear all events */
  clearEvents: () => void;
}

/**
 * React hook to track recent file system activity from watcher events.
 *
 * Features:
 * - Subscribes to watcher:change events from the event bus
 * - Maintains a ring buffer with time-based and size-based pruning
 * - Deduplicates events for the same path (keeps only latest)
 * - Converts absolute paths to workspace-relative paths
 * - Automatically prunes events older than configured window
 * - Respects maxEntries limit
 *
 * @param rootPath - Root path of the workspace (for converting absolute to relative paths)
 * @param config - Configuration options for the recent activity feature
 * @returns Recent activity state and control functions
 *
 * @example
 * ```typescript
 * const { recentEvents, lastEvent, clearEvents } = useRecentActivity(
 *   '/path/to/workspace',
 *   { enabled: true, windowMinutes: 10, maxEntries: 50 }
 * );
 *
 * // Display recent events
 * recentEvents.forEach(event => {
 *   console.log(`${event.type}: ${event.path} at ${new Date(event.timestamp)}`);
 * });
 * ```
 */
export function useRecentActivity(
  rootPath: string,
  config: RecentActivityConfig
): UseRecentActivityReturn {
  // State: array of events, newest first
  const [events_list, setEvents] = useState<ActivityEvent[]>([]);

  // Ref to track if component is mounted (prevent setState after unmount)
  const isMountedRef = useRef<boolean>(true);

  /**
   * Prunes events based on time window and max entries.
   * Returns a new array with old/excess events removed.
   */
  const pruneEvents = useCallback(
    (eventList: ActivityEvent[]): ActivityEvent[] => {
      const now = Date.now();
      const windowMs = config.windowMinutes * 60 * 1000;

      // First, filter by time window
      let pruned = eventList.filter(event => now - event.timestamp <= windowMs);

      // Then, limit by max entries (keep newest)
      if (pruned.length > config.maxEntries) {
        pruned = pruned.slice(0, config.maxEntries);
      }

      return pruned;
    },
    [config.windowMinutes, config.maxEntries]
  );

  /**
   * Handles a new watcher event by adding it to the buffer,
   * deduplicating, and pruning as needed.
   */
  const handleWatcherEvent = useCallback(
    (payload: { type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'; path: string }) => {
      if (!config.enabled || !isMountedRef.current) {
        return;
      }

      // Convert absolute path to relative path
      const relativePath = path.relative(rootPath, payload.path);

      // Create new event
      const newEvent: ActivityEvent = {
        path: relativePath,
        type: payload.type,
        timestamp: Date.now(),
      };

      setEvents(prevEvents => {
        // Remove any existing events for the same path (deduplication)
        const deduplicated = prevEvents.filter(event => event.path !== relativePath);

        // Prepend new event
        const updated = [newEvent, ...deduplicated];

        // Prune old events
        return pruneEvents(updated);
      });
    },
    [rootPath, config.enabled, pruneEvents]
  );

  /**
   * Clears all events from the buffer.
   */
  const clearEvents = useCallback(() => {
    if (isMountedRef.current) {
      setEvents([]);
    }
  }, []);

  /**
   * Subscribe to watcher:change events from the event bus.
   */
  useEffect(() => {
    if (!config.enabled) {
      // Clear events if feature is disabled
      setEvents([]);
      return;
    }

    // Subscribe to watcher events
    const unsubscribe = events.on('watcher:change', handleWatcherEvent);

    // Cleanup on unmount or config change
    return () => {
      unsubscribe();
    };
  }, [config.enabled, handleWatcherEvent]);

  /**
   * Periodically prune old events based on time window.
   * This ensures events expire even if no new events come in.
   */
  useEffect(() => {
    if (!config.enabled) {
      return;
    }

    // Prune every minute
    const intervalId = setInterval(() => {
      if (isMountedRef.current) {
        setEvents(prevEvents => pruneEvents(prevEvents));
      }
    }, 60 * 1000); // 1 minute

    return () => {
      clearInterval(intervalId);
    };
  }, [config.enabled, pruneEvents]);

  /**
   * Mark component as unmounted on cleanup.
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Calculate lastEvent (most recent)
  const lastEvent = events_list.length > 0 ? events_list[0] : null;

  return {
    recentEvents: events_list,
    lastEvent,
    clearEvents,
  };
}
