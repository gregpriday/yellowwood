/**
 * Performance monitoring and metrics collection
 */

export interface PerformanceStats {
	min: number;
	max: number;
	avg: number;
	p95: number;
	count: number;
}

export class PerformanceMonitor {
	private metrics = new Map<string, number[]>();
	private readonly maxSamples = 100;

	/**
	 * Measure the duration of an async operation
	 */
	async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
		const start = Date.now();
		try {
			return await fn();
		} finally {
			const duration = Date.now() - start;
			this.recordMetric(name, duration);
		}
	}

	/**
	 * Measure the duration of a sync operation
	 */
	measureSync<T>(name: string, fn: () => T): T {
		const start = Date.now();
		try {
			return fn();
		} finally {
			const duration = Date.now() - start;
			this.recordMetric(name, duration);
		}
	}

	/**
	 * Record a metric value directly
	 */
	recordMetric(name: string, value: number): void {
		if (!this.metrics.has(name)) {
			this.metrics.set(name, []);
		}
		const values = this.metrics.get(name)!;
		values.push(value);

		// Keep only last N measurements to prevent memory growth
		if (values.length > this.maxSamples) {
			values.shift();
		}
	}

	/**
	 * Get statistics for a metric
	 */
	getStats(name: string): PerformanceStats | null {
		const values = this.metrics.get(name);
		if (!values || values.length === 0) {
			return null;
		}

		const sorted = [...values].sort((a, b) => a - b);
		const percentileBase = sorted.length - 1;
		const p95Index = Math.max(
			0,
			Math.min(percentileBase, Math.floor(percentileBase * 0.95)),
		);
		const sum = values.reduce((a, b) => a + b, 0);

		return {
			min: sorted[0],
			max: sorted[sorted.length - 1],
			avg: sum / values.length,
			p95: sorted[p95Index],
			count: values.length,
		};
	}

	/**
	 * Get all metric names
	 */
	getMetricNames(): string[] {
		return Array.from(this.metrics.keys());
	}

	/**
	 * Clear all metrics
	 */
	clear(): void {
		this.metrics.clear();
	}

	/**
	 * Clear a specific metric
	 */
	clearMetric(name: string): void {
		this.metrics.delete(name);
	}

	/**
	 * Get a summary of all metrics
	 */
	getSummary(): Record<string, PerformanceStats> {
		const summary: Record<string, PerformanceStats> = {};
		for (const name of this.metrics.keys()) {
			const stats = this.getStats(name);
			if (stats) {
				summary[name] = stats;
			}
		}
		return summary;
	}
}

// Global performance monitor instance
export const perfMonitor = new PerformanceMonitor();
