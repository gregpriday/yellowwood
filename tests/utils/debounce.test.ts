import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	debounce,
	debounceLeading,
	debounceTrailing,
} from '../../src/utils/debounce.js';

describe('debounce', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('debounces trailing edge by default', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced();
		debounced();
		debounced();

		expect(fn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(100);

		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('supports leading edge', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100, { leading: true, trailing: false });

		debounced();
		expect(fn).toHaveBeenCalledTimes(1);

		debounced();
		debounced();
		expect(fn).toHaveBeenCalledTimes(1); // Still only once

		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1); // No trailing call
	});

	it('supports both leading and trailing', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100, { leading: true, trailing: true });

		debounced();
		expect(fn).toHaveBeenCalledTimes(1); // Leading

		debounced();
		debounced();

		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(2); // Trailing
	});

	it('forces call after maxWait even when calls never settle', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100, { maxWait: 300, trailing: false });

		debounced();
		vi.advanceTimersByTime(50);
		debounced();
		vi.advanceTimersByTime(50);
		debounced();
		vi.advanceTimersByTime(50);
		debounced();

		// 150ms elapsed - no leading edge triggered yet since delay is 100ms
		// but calls keep resetting it. maxWait should fire soon.
		vi.advanceTimersByTime(149);
		expect(fn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1); // Total 300ms - maxWait fires
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('cancel prevents pending call', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced();
		debounced.cancel();

		vi.advanceTimersByTime(100);

		expect(fn).not.toHaveBeenCalled();
	});

	it('flush executes immediately', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced();
		debounced.flush();

		expect(fn).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(100);

		expect(fn).toHaveBeenCalledTimes(1); // Still only once
	});

	it('passes arguments correctly', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced('arg1', 42, { key: 'value' });

		vi.advanceTimersByTime(100);

		expect(fn).toHaveBeenCalledWith('arg1', 42, { key: 'value' });
	});

	it('debounceLeading is a convenience wrapper', () => {
		const fn = vi.fn();
		const debounced = debounceLeading(fn, 100);

		debounced();
		expect(fn).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1); // No trailing call
	});

	it('debounceTrailing is a convenience wrapper', () => {
		const fn = vi.fn();
		const debounced = debounceTrailing(fn, 100);

		debounced();
		expect(fn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);
	});
});
