import { useEffect } from 'react';
import path from 'path';
import type { CanopyConfig } from '../types/index.js';
import { createFileWatcher, buildIgnorePatterns } from '../utils/fileWatcher.js';
import { debounce } from '../utils/debounce.js';
import { events } from '../services/events.js';

export function useWatcher(rootPath: string, config: CanopyConfig, disabled: boolean): void {
  useEffect(() => {
    if (disabled) {
      return;
    }

    const emitRefresh = debounce(() => {
      events.emit('sys:refresh');
    }, config.refreshDebounce);

    const watcher = createFileWatcher(rootPath, {
      ignored: buildIgnorePatterns(config.customIgnores),
      debounce: config.refreshDebounce,
      usePolling: config.usePolling,
      onBatch: (batch) => {
        for (const change of batch) {
          const absolutePath = path.resolve(rootPath, change.path);
          events.emit('watcher:change', { type: change.type, path: absolutePath });
        }
        emitRefresh();
      },
    });

    watcher.start();

    return () => {
      void watcher.stop();
      emitRefresh.cancel();
    };
  }, [rootPath, config, disabled]);
}
