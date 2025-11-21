/**
 * Calculate folder "heat" color based on recursive git change count
 * Creates visual hierarchy: more changes = more intense color
 */
export interface HeatMapConfig {
	minChanges: number; // Threshold for showing heat (default: 1)
	maxChanges: number; // Saturation point (default: 20)
	baseColor: string; // Base folder color (default: 'blue')
	intensity: 'subtle' | 'normal' | 'intense';
}

const DEFAULT_HEAT_CONFIG: HeatMapConfig = {
	minChanges: 1,
	maxChanges: 20,
	baseColor: '#CCCCCC', // Default secondary text color
	intensity: 'normal',
};

/**
 * Get folder color based on change intensity and configured thresholds.
 * changeCount < minChanges returns the base color, otherwise we apply a
 * cyan→yellow→orange→red gradient. Intensity can be tuned via the config
 * so subtle maps wait longer while intense starts coloring sooner.
 */
export function getFolderHeatColor(
	changeCount: number,
	config: Partial<HeatMapConfig> = {},
): string {
	const cfg = { ...DEFAULT_HEAT_CONFIG, ...config };

	if (changeCount === 0 || changeCount < cfg.minChanges) {
		return cfg.baseColor; // Default folder color
	}

	// Normalize to 0-1 range (avoid div by zero)
	const normalized = cfg.maxChanges > 0 ? Math.min(changeCount / cfg.maxChanges, 1.0) : 1.0;

	const thresholds: Record<HeatMapConfig['intensity'], { cyan: number; yellow: number; orange: number }> = {
		subtle: { cyan: 0.35, yellow: 0.65, orange: 0.9 },
		normal: { cyan: 0.25, yellow: 0.6, orange: 0.85 },
		intense: { cyan: 0.15, yellow: 0.45, orange: 0.75 },
	};

	const { cyan, yellow, orange } = thresholds[cfg.intensity];

	if (normalized < cyan) {
		return 'cyan';
	} else if (normalized < yellow) {
		return '#FFD700';
	} else if (normalized < orange) {
		return '#FF8C00';
	}
	return '#FF6347';
}

/**
 * Get heat indicator glyph for collapsed folders
 * Optional: add visual indicator alongside count
 */
export function getHeatIndicator(changeCount: number): string {
	if (changeCount === 0) return '';
	if (changeCount < 5) return ''; // No indicator for low activity
	if (changeCount < 15) return ''; // Flame for moderate
	return '🔥'; // Fire for high activity
}
