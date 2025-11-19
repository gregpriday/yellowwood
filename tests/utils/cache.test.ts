import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Cache } from '../../src/utils/cache.js';

describe('Cache', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('stores and retrieves values', () => {
		const cache = new Cache<string, number>();
		cache.set('key1', 42);
		expect(cache.get('key1')).toBe(42);
	});

	it('returns undefined for missing keys', () => {
		const cache = new Cache<string, number>();
		expect(cache.get('missing')).toBeUndefined();
	});

	it('expires entries after TTL', () => {
		const cache = new Cache<string, number>({ defaultTTL: 1000 });
		cache.set('key1', 42);

		expect(cache.get('key1')).toBe(42);

		vi.advanceTimersByTime(1001);

		expect(cache.get('key1')).toBeUndefined();
	});

	it('uses custom TTL per entry', () => {
		const cache = new Cache<string, number>({ defaultTTL: 1000 });
		cache.set('short', 1, 500);
		cache.set('long', 2, 2000);

		vi.advanceTimersByTime(600);

		expect(cache.get('short')).toBeUndefined();
		expect(cache.get('long')).toBe(2);
	});

	it('evicts LRU entry when size limit reached', () => {
		const cache = new Cache<string, number>({ maxSize: 3 });

		cache.set('key1', 1);
		vi.advanceTimersByTime(10); // Ensure different timestamps
		cache.set('key2', 2);
		vi.advanceTimersByTime(10);
		cache.set('key3', 3);
		vi.advanceTimersByTime(10);

		// Access key1 to make it recently used
		cache.get('key1');

		// Add key4 - should evict key2 (least recently used)
		cache.set('key4', 4);

		expect(cache.get('key1')).toBe(1);
		expect(cache.get('key2')).toBeUndefined();
		expect(cache.get('key3')).toBe(3);
		expect(cache.get('key4')).toBe(4);
	});

	it('calls onEvict callback when evicting', () => {
		const onEvict = vi.fn();
		const cache = new Cache<string, number>({ maxSize: 2, onEvict });

		cache.set('key1', 1);
		cache.set('key2', 2);
		cache.set('key3', 3); // Evicts key1

		expect(onEvict).toHaveBeenCalledWith('key1', 1);
	});

	it('invokes onEvict when entries expire via get()', () => {
		const onEvict = vi.fn();
		const cache = new Cache<string, number>({
			defaultTTL: 100,
			onEvict,
		});

		cache.set('key1', 1);
		vi.advanceTimersByTime(101);

		expect(cache.get('key1')).toBeUndefined();
		expect(onEvict).toHaveBeenCalledWith('key1', 1);
	});

	it('cleanup removes expired entries', () => {
		const cache = new Cache<string, number>({ defaultTTL: 1000 });
		cache.set('key1', 1);
		cache.set('key2', 2);

		vi.advanceTimersByTime(1001);

		cache.cleanup();

		expect(cache.size()).toBe(0);
	});

	it('clear removes all entries', () => {
		const cache = new Cache<string, number>();
		cache.set('key1', 1);
		cache.set('key2', 2);

		cache.clear();

		expect(cache.size()).toBe(0);
	});

	it('invalidate removes specific entry', () => {
		const cache = new Cache<string, number>();
		cache.set('key1', 1);
		cache.set('key2', 2);

		cache.invalidate('key1');

		expect(cache.get('key1')).toBeUndefined();
		expect(cache.get('key2')).toBe(2);
		expect(cache.size()).toBe(1);
	});

	it('has() returns true for valid entries', () => {
		const cache = new Cache<string, number>({ defaultTTL: 1000 });
		cache.set('key1', 42);

		expect(cache.has('key1')).toBe(true);

		vi.advanceTimersByTime(1001);

		expect(cache.has('key1')).toBe(false);
	});

	it('updates last accessed time on get', () => {
		const cache = new Cache<string, number>({ maxSize: 2 });

		cache.set('key1', 1);
		vi.advanceTimersByTime(100);

		cache.set('key2', 2);
		vi.advanceTimersByTime(100);

		// Access key1 to make it more recently used than key2
		cache.get('key1');

		// Add key3 - should evict key2 (least recently used)
		cache.set('key3', 3);

		expect(cache.get('key1')).toBe(1);
		expect(cache.get('key2')).toBeUndefined();
		expect(cache.get('key3')).toBe(3);
	});
});
