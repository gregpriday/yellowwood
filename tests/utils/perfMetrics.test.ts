import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceMonitor } from '../../src/utils/perfMetrics.js';

describe('PerformanceMonitor', () => {
	let monitor: PerformanceMonitor;

	beforeEach(() => {
		monitor = new PerformanceMonitor();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('records metrics directly', () => {
		monitor.recordMetric('test-metric', 42);
		monitor.recordMetric('test-metric', 50);

		const stats = monitor.getStats('test-metric');

		expect(stats).not.toBeNull();
		expect(stats!.count).toBe(2);
	});

	it('calculates statistics correctly', () => {
		monitor.recordMetric('test', 10);
		monitor.recordMetric('test', 20);
		monitor.recordMetric('test', 30);
		monitor.recordMetric('test', 40);
		monitor.recordMetric('test', 50);

		const stats = monitor.getStats('test');

		expect(stats).not.toBeNull();
		expect(stats!.min).toBe(10);
		expect(stats!.max).toBe(50);
		expect(stats!.avg).toBe(30);
		expect(stats!.count).toBe(5);
	});

	it('calculates p95 percentile', () => {
		// Add 100 values
		for (let i = 1; i <= 100; i++) {
			monitor.recordMetric('test', i);
		}

		const stats = monitor.getStats('test');

		expect(stats).not.toBeNull();
		// P95 should be around 95 (95th percentile of 1-100)
		expect(stats!.p95).toBeGreaterThanOrEqual(94);
		expect(stats!.p95).toBeLessThanOrEqual(96);
	});

	it('calculates p95 accurately for small samples', () => {
		monitor.recordMetric('small', 10);
		monitor.recordMetric('small', 20);
		monitor.recordMetric('small', 30);
		monitor.recordMetric('small', 40);
		monitor.recordMetric('small', 50);

		const stats = monitor.getStats('small');
		expect(stats).not.toBeNull();
		expect(stats!.p95).toBe(40);
	});

	it('returns null for unknown metrics', () => {
		const stats = monitor.getStats('nonexistent');
		expect(stats).toBeNull();
	});

	it('measures async operations', async () => {
		const asyncFn = async () => {
			await new Promise((resolve) => {
				setTimeout(resolve, 100);
			});
			return 'result';
		};

		const promise = monitor.measure('async-test', asyncFn);

		vi.advanceTimersByTime(100);
		await promise;

		const stats = monitor.getStats('async-test');

		expect(stats).not.toBeNull();
		expect(stats!.count).toBe(1);
		expect(stats!.avg).toBeGreaterThanOrEqual(99);
		expect(stats!.avg).toBeLessThanOrEqual(101);
	});

	it('measures sync operations', () => {
		const syncFn = () => {
			vi.advanceTimersByTime(50);
			return 'result';
		};

		const result = monitor.measureSync('sync-test', syncFn);

		expect(result).toBe('result');

		const stats = monitor.getStats('sync-test');

		expect(stats).not.toBeNull();
		expect(stats!.count).toBe(1);
		expect(stats!.avg).toBeGreaterThanOrEqual(49);
		expect(stats!.avg).toBeLessThanOrEqual(51);
	});

	it('keeps only last N measurements', () => {
		// Default maxSamples is 100
		for (let i = 0; i < 150; i++) {
			monitor.recordMetric('test', i);
		}

		const stats = monitor.getStats('test');

		expect(stats).not.toBeNull();
		expect(stats!.count).toBe(100); // Should only keep last 100
	});

	it('getMetricNames returns all metric names', () => {
		monitor.recordMetric('metric1', 1);
		monitor.recordMetric('metric2', 2);
		monitor.recordMetric('metric3', 3);

		const names = monitor.getMetricNames();

		expect(names).toHaveLength(3);
		expect(names).toContain('metric1');
		expect(names).toContain('metric2');
		expect(names).toContain('metric3');
	});

	it('getSummary returns all metrics', () => {
		monitor.recordMetric('metric1', 10);
		monitor.recordMetric('metric2', 20);

		const summary = monitor.getSummary();

		expect(Object.keys(summary)).toHaveLength(2);
		expect(summary['metric1']).toBeDefined();
		expect(summary['metric2']).toBeDefined();
		expect(summary['metric1'].avg).toBe(10);
		expect(summary['metric2'].avg).toBe(20);
	});

	it('clear removes all metrics', () => {
		monitor.recordMetric('metric1', 1);
		monitor.recordMetric('metric2', 2);

		monitor.clear();

		expect(monitor.getMetricNames()).toHaveLength(0);
		expect(monitor.getStats('metric1')).toBeNull();
	});

	it('clearMetric removes specific metric', () => {
		monitor.recordMetric('metric1', 1);
		monitor.recordMetric('metric2', 2);

		monitor.clearMetric('metric1');

		expect(monitor.getStats('metric1')).toBeNull();
		expect(monitor.getStats('metric2')).not.toBeNull();
	});
});
