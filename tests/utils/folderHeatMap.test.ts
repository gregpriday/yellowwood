import { describe, it, expect } from 'vitest';
import { getFolderHeatColor, getHeatIndicator } from '../../src/utils/folderHeatMap.js';

describe('getFolderHeatColor', () => {
	it('returns base color for 0 changes', () => {
		const baseColor = '#CCCCCC';
		const result = getFolderHeatColor(0, { baseColor });
		expect(result).toBe(baseColor);
	});

	it('returns cyan for low activity (1-4 changes)', () => {
		expect(getFolderHeatColor(1)).toBe('cyan');
		expect(getFolderHeatColor(3)).toBe('cyan');
		expect(getFolderHeatColor(4)).toBe('cyan');
	});

	it('returns yellow/gold for moderate activity (5-11 changes)', () => {
		const color5 = getFolderHeatColor(5);
		const color8 = getFolderHeatColor(8);
		const color11 = getFolderHeatColor(11);

		// Should all be in the yellow/gold range
		expect(color5).toBe('#FFD700');
		expect(color8).toBe('#FFD700');
		expect(color11).toBe('#FFD700');
	});

	it('returns orange for high activity (12-16 changes)', () => {
		const color12 = getFolderHeatColor(12);
		const color14 = getFolderHeatColor(14);
		const color16 = getFolderHeatColor(16);

		// Should all be in the orange range
		expect(color12).toBe('#FF8C00');
		expect(color14).toBe('#FF8C00');
		expect(color16).toBe('#FF8C00');
	});

	it('returns red for very high activity (17+ changes)', () => {
		expect(getFolderHeatColor(17)).toBe('#FF6347');
		expect(getFolderHeatColor(20)).toBe('#FF6347');
		expect(getFolderHeatColor(100)).toBe('#FF6347');
	});

	it('saturates at red for extremely high change counts', () => {
		// Even very high numbers should max out at red
		expect(getFolderHeatColor(1000)).toBe('#FF6347');
		expect(getFolderHeatColor(10000)).toBe('#FF6347');
	});

	it('respects custom base color', () => {
		const customBase = '#FF00FF';
		const result = getFolderHeatColor(0, { baseColor: customBase });
		expect(result).toBe(customBase);
	});

	it('respects custom max changes for saturation', () => {
		// With maxChanges: 10, intensity of 5 should be at 50%
		const result = getFolderHeatColor(5, { maxChanges: 10 });
		// At 50% intensity, should be in yellow range (between 0.25 and 0.6)
		expect(result).toBe('#FFD700');
	});

	it('handles edge case of exactly maxChanges', () => {
		const result = getFolderHeatColor(20, { maxChanges: 20 });
		// At exactly 100% intensity, should be red
		expect(result).toBe('#FF6347');
	});

	it('creates progressive heat gradient', () => {
		const colors = [
			getFolderHeatColor(0),
			getFolderHeatColor(3),
			getFolderHeatColor(8),
			getFolderHeatColor(14),
			getFolderHeatColor(20),
		];

		// Should show progression: base → cyan → yellow → orange → red
		expect(colors).toEqual([
			'#CCCCCC', // 0 changes - base
			'cyan', // 3 changes - low
			'#FFD700', // 8 changes - moderate
			'#FF8C00', // 14 changes - high
			'#FF6347', // 20 changes - very high
		]);
	});
});

describe('getHeatIndicator', () => {
	it('returns empty string for 0 changes', () => {
		expect(getHeatIndicator(0)).toBe('');
	});

	it('returns empty string for low activity (< 5 changes)', () => {
		expect(getHeatIndicator(1)).toBe('');
		expect(getHeatIndicator(2)).toBe('');
		expect(getHeatIndicator(4)).toBe('');
	});

	it('returns empty string for moderate activity (5-14 changes)', () => {
		expect(getHeatIndicator(5)).toBe('');
		expect(getHeatIndicator(10)).toBe('');
		expect(getHeatIndicator(14)).toBe('');
	});

	it('returns fire emoji for high activity (15+ changes)', () => {
		expect(getHeatIndicator(15)).toBe('🔥');
		expect(getHeatIndicator(20)).toBe('🔥');
		expect(getHeatIndicator(100)).toBe('🔥');
	});

	it('shows visual progression matching heat color thresholds', () => {
		// No indicator until significant heat
		expect(getHeatIndicator(0)).toBe(''); // Base color
		expect(getHeatIndicator(5)).toBe(''); // Cyan
		expect(getHeatIndicator(10)).toBe(''); // Yellow
		expect(getHeatIndicator(15)).toBe('🔥'); // Orange/Red - fire appears here
		expect(getHeatIndicator(20)).toBe('🔥'); // Red
	});
});

describe('heat map intensity configuration', () => {
	it('intense mode shifts colors sooner', () => {
		// With intense, 2 changes (10% of 20) should already show color
		const result = getFolderHeatColor(2, { intensity: 'intense' });
		expect(result).toBe('cyan'); // Below 0.15 (15%)
	});

	it('subtle mode requires more changes', () => {
		// With subtle, 5 changes (25% of 20) should still show cyan
		const result = getFolderHeatColor(5, { intensity: 'subtle' });
		expect(result).toBe('cyan'); // Below 0.35 (35%)
	});

	it('normal mode uses default thresholds', () => {
		const result1 = getFolderHeatColor(4, { intensity: 'normal' });
		const result2 = getFolderHeatColor(8, { intensity: 'normal' });
		expect(result1).toBe('cyan'); // < 0.25
		expect(result2).toBe('#FFD700'); // >= 0.25, < 0.6
	});

	it('respects minChanges threshold', () => {
		const baseColor = '#CUSTOM';
		const result = getFolderHeatColor(2, { minChanges: 5, baseColor });
		expect(result).toBe(baseColor); // Below minChanges, returns base
	});

	it('handles maxChanges = 0 safely', () => {
		// Edge case: if maxChanges is 0, should immediately saturate to red
		const result = getFolderHeatColor(5, { maxChanges: 0 });
		expect(result).toBe('#FF6347'); // Saturates immediately
	});

	it('handles very small maxChanges', () => {
		const result = getFolderHeatColor(2, { maxChanges: 2 });
		expect(result).toBe('#FF6347'); // At 100% intensity = red
	});
});

describe('heat map integration', () => {
	it('color and indicator thresholds are aligned', () => {
		// Test that fire emoji appears when color is getting hot (orange/red)
		for (let i = 0; i <= 25; i++) {
			const color = getFolderHeatColor(i);
			const indicator = getHeatIndicator(i);

			if (i >= 15) {
				// High activity should have fire emoji
				expect(indicator).toBe('🔥');
				// And should be orange or red
				expect(color === '#FF8C00' || color === '#FF6347').toBe(true);
			}
		}
	});

	it('handles zero changes consistently', () => {
		const color = getFolderHeatColor(0);
		const indicator = getHeatIndicator(0);

		expect(color).toBe('#CCCCCC'); // Base color
		expect(indicator).toBe(''); // No indicator
	});

	it('fire emoji appears at appropriate intensity for all modes', () => {
		// Fire should appear for high change counts regardless of intensity mode
		const intenseResult = getFolderHeatColor(18, { intensity: 'intense' });
		const normalResult = getFolderHeatColor(18, { intensity: 'normal' });
		const subtleResult = getFolderHeatColor(18, { intensity: 'subtle' });

		// All should be red at 18 changes (90% of default 20)
		expect(intenseResult).toBe('#FF6347');
		expect(normalResult).toBe('#FF6347');
		expect(subtleResult).toBe('#FF6347');

		// And fire indicator should show
		expect(getHeatIndicator(18)).toBe('🔥');
	});
});
