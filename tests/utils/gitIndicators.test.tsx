import { describe, it, expect } from 'vitest';
import { getGitStatusGlyph } from '../../src/utils/gitIndicators.js';
import type { GitStatus } from '../../src/types/index.js';

// Note: We test getGitStatusGlyph instead of rendering GitIndicator component
// because Ink components require a terminal environment to render properly.
// The GitIndicator component is visually tested through manual testing and
// integration tests with the full app.

describe('getGitStatusGlyph', () => {
	it('returns correct glyph for modified status', () => {
		expect(getGitStatusGlyph('modified')).toBe('●');
	});

	it('returns correct glyph for added status', () => {
		expect(getGitStatusGlyph('added')).toBe('●');
	});

	it('returns correct glyph for deleted status', () => {
		expect(getGitStatusGlyph('deleted')).toBe('●');
	});

	it('returns hollow circle for untracked status', () => {
		expect(getGitStatusGlyph('untracked')).toBe('○');
	});

	it('returns dot for ignored status', () => {
		expect(getGitStatusGlyph('ignored')).toBe('·');
	});

	it('returns different glyphs for different status types', () => {
		const modifiedGlyph = getGitStatusGlyph('modified');
		const untrackedGlyph = getGitStatusGlyph('untracked');
		const ignoredGlyph = getGitStatusGlyph('ignored');

		// Solid circles are the same for modified/added/deleted
		expect(modifiedGlyph).toBe('●');

		// But untracked and ignored should be different
		expect(untrackedGlyph).not.toBe(modifiedGlyph);
		expect(ignoredGlyph).not.toBe(modifiedGlyph);
		expect(ignoredGlyph).not.toBe(untrackedGlyph);
	});
});
