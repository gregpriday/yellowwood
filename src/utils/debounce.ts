/**
 * Advanced debouncing utilities with leading/trailing edge support
 */

export interface DebounceOptions {
	/** Call on leading edge */
	leading?: boolean;
	/** Call on trailing edge */
	trailing?: boolean;
	/** Maximum time to wait before forced call */
	maxWait?: number;
}

export interface DebouncedFunction<T extends (...args: any[]) => any> {
	(...args: Parameters<T>): void;
	cancel(): void;
	flush(): void;
}

/**
 * Debounce a function with configurable leading/trailing behavior
 */
export function debounce<T extends (...args: any[]) => any>(
	fn: T,
	delay: number,
	options: DebounceOptions = {},
): DebouncedFunction<T> {
	const { leading = false, trailing = true, maxWait } = options;

	let timeoutId: NodeJS.Timeout | null = null;
	let maxTimeoutId: NodeJS.Timeout | null = null;
	let lastCallTime = 0;
	let lastArgs: Parameters<T> | null = null;

	const invoke = () => {
		if (lastArgs) {
			fn(...lastArgs);
			lastArgs = null;
		}
	};

	const clearDebounceTimer = () => {
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	};

	const clearMaxWaitTimer = () => {
		if (maxTimeoutId) {
			clearTimeout(maxTimeoutId);
			maxTimeoutId = null;
		}
	};

	const clearAllTimers = () => {
		clearDebounceTimer();
		clearMaxWaitTimer();
	};

	const debounced = (...args: Parameters<T>) => {
		lastArgs = args;
		const now = Date.now();
		const timeSinceLastCall = now - lastCallTime;

		// Leading edge
		if (leading && timeSinceLastCall >= delay) {
			invoke();
			lastCallTime = now;
		}

		// Clear trailing timer but keep maxWait counting down
		clearDebounceTimer();

		// Trailing edge timer
		if (trailing) {
			timeoutId = setTimeout(() => {
				invoke();
				lastCallTime = Date.now();
				clearAllTimers();
			}, delay);
		}

		// Max wait timer
		if (maxWait && !maxTimeoutId) {
			maxTimeoutId = setTimeout(() => {
				invoke();
				lastCallTime = Date.now();
				clearAllTimers();
			}, maxWait);
		}
	};

	debounced.cancel = () => {
		clearAllTimers();
		lastArgs = null;
	};

	debounced.flush = () => {
		invoke();
		lastCallTime = Date.now();
		clearAllTimers();
	};

	return debounced as DebouncedFunction<T>;
}

/**
 * Convenience function for leading-edge debounce
 * Executes immediately, then ignores calls for delay period
 */
export function debounceLeading<T extends (...args: any[]) => any>(
	fn: T,
	delay: number,
): DebouncedFunction<T> {
	return debounce(fn, delay, { leading: true, trailing: false });
}

/**
 * Convenience function for trailing-edge debounce
 * Waits for quiet period, then executes
 */
export function debounceTrailing<T extends (...args: any[]) => any>(
	fn: T,
	delay: number,
): DebouncedFunction<T> {
	return debounce(fn, delay, { leading: false, trailing: true });
}
