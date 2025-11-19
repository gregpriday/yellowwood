/**
 * Change processor coordinates file watcher events with cache invalidation
 * and triggers UI refreshes.
 */

import path from 'path';
import type { FileChangeEvent } from './fileWatcher.js';
import { invalidateDirCache } from './fileTree.js';
import { invalidateGitStatusCache } from './git.js';
import { perfMonitor } from './perfMetrics.js';

export interface ChangeProcessorCallbacks {
	/** Callback to refresh the file tree */
	onTreeRefresh: () => void;
	/** Callback to refresh git status */
	onGitRefresh: (forceRefresh: boolean) => void;
}

export interface ChangeProcessorOptions {
	/** Root path of the watched directory */
	rootPath: string;
	/** Callbacks for refresh operations */
	callbacks: ChangeProcessorCallbacks;
}

/**
 * Change processor handles batched file watcher events.
 * Invalidates caches and triggers targeted refreshes.
 */
export class ChangeProcessor {
	private rootPath: string;
	private callbacks: ChangeProcessorCallbacks;

	constructor(options: ChangeProcessorOptions) {
		this.rootPath = options.rootPath;
		this.callbacks = options.callbacks;
	}

	/**
	 * Process a batch of file change events.
	 * Invalidates caches for affected paths and triggers refreshes.
	 */
	processBatch(events: FileChangeEvent[]): void {
		if (events.length === 0) {
			return;
		}

		const startTime = Date.now();

		// Track which directories and git status need refresh
		const affectedDirs = new Set<string>();
		let needsGitRefresh = false;

		for (const event of events) {
			const absolutePath = path.join(this.rootPath, event.path);

			// Determine parent directory
			const parentDir =
				event.type === 'addDir' || event.type === 'unlinkDir'
					? path.dirname(absolutePath)
					: path.dirname(absolutePath);

			// Track affected directories
			affectedDirs.add(parentDir);

			// Any file changes potentially affect git status
			needsGitRefresh = true;

			// Invalidate directory cache for parent
			// (when files are added/removed, the directory listing changes)
			if (
				event.type === 'add' ||
				event.type === 'unlink' ||
				event.type === 'addDir' ||
				event.type === 'unlinkDir'
			) {
				invalidateDirCache(parentDir);
			}

			// For directory events, also invalidate the directory itself
			if (event.type === 'addDir' || event.type === 'unlinkDir') {
				invalidateDirCache(absolutePath);
			}
		}

		// Invalidate git status cache for the root
		// (git status is per-repository, not per-file)
		if (needsGitRefresh) {
			invalidateGitStatusCache(this.rootPath);
		}

		// Trigger refreshes
		this.callbacks.onTreeRefresh();
		if (needsGitRefresh) {
			this.callbacks.onGitRefresh(true); // Force refresh since we invalidated cache
		}

		// Record metrics
		const duration = Date.now() - startTime;
		perfMonitor.recordMetric('change-processor-batch', duration);
		perfMonitor.recordMetric(
			'change-processor-affected-dirs',
			affectedDirs.size,
		);
	}

	/**
	 * Clear all caches when switching worktrees.
	 */
	clearAllCaches(): void {
		invalidateGitStatusCache(this.rootPath);
		// Directory cache is cleared globally via clearDirCache()
		// in the worktree switch code
	}

	/**
	 * Update root path (used when switching worktrees).
	 */
	setRootPath(newRootPath: string): void {
		this.rootPath = newRootPath;
	}
}
