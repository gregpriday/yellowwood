import { describe, it, expect, vi, beforeEach } from 'vitest';
import { copyToClipboard, copyFilePath } from '../../src/utils/clipboard.js';
import clipboardy from 'clipboardy';
import path from 'path';

// Mock clipboardy
vi.mock('clipboardy', () => ({
	default: {
		write: vi.fn(),
		read: vi.fn(),
	},
}));

describe('clipboard utilities', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('copyToClipboard', () => {
		it('copies text to clipboard', async () => {
			const text = 'Hello, world!';
			await copyToClipboard(text);

			expect(clipboardy.write).toHaveBeenCalledWith(text);
			expect(clipboardy.write).toHaveBeenCalledTimes(1);
		});

		it('copies empty string to clipboard', async () => {
			await copyToClipboard('');

			expect(clipboardy.write).toHaveBeenCalledWith('');
		});

		it('throws error if clipboard operation fails', async () => {
			const error = new Error('Clipboard unavailable');
			vi.mocked(clipboardy.write).mockRejectedValueOnce(error);

			await expect(copyToClipboard('test')).rejects.toThrow(
				'Failed to copy to clipboard: Clipboard unavailable'
			);
		});
	});

	describe('copyFilePath', () => {
		it('copies absolute path when relative is false', async () => {
			const filePath = '/Users/foo/project/src/App.tsx';
			const rootPath = '/Users/foo/project';

			await copyFilePath(filePath, rootPath, false);

			// Should copy the absolute path (normalized)
			expect(clipboardy.write).toHaveBeenCalledWith(
				path.normalize(filePath)
			);
		});

		it('copies relative path when relative is true', async () => {
			const filePath = '/Users/foo/project/src/App.tsx';
			const rootPath = '/Users/foo/project';

			await copyFilePath(filePath, rootPath, true);

			// Should copy relative path
			expect(clipboardy.write).toHaveBeenCalledWith(
				path.join('src', 'App.tsx')
			);
		});

		it('handles relative paths for files at root level', async () => {
			const filePath = '/Users/foo/project/README.md';
			const rootPath = '/Users/foo/project';

			await copyFilePath(filePath, rootPath, true);

			expect(clipboardy.write).toHaveBeenCalledWith('README.md');
		});

		it('handles relative paths for files outside root', async () => {
			const filePath = '/Users/bar/other/file.txt';
			const rootPath = '/Users/foo/project';

			await copyFilePath(filePath, rootPath, true);

			// Should compute relative path going up and over
			const expectedPath = path.relative(rootPath, filePath);
			expect(clipboardy.write).toHaveBeenCalledWith(expectedPath);
		});

		it('normalizes paths before processing', async () => {
			const filePath = '/Users/foo/project/src/../App.tsx';
			const rootPath = '/Users/foo/project/';

			await copyFilePath(filePath, rootPath, false);

			// Should normalize (remove ..)
			expect(clipboardy.write).toHaveBeenCalledWith(
				path.normalize(filePath)
			);
		});

		it('handles Windows-style paths on Windows', async () => {
			// Mock path functions to handle Windows paths on any platform
			const originalIsAbsolute = path.isAbsolute;
			const originalParse = path.parse;
			const originalRelative = path.relative;
			const originalNormalize = path.normalize;

			vi.spyOn(path, 'isAbsolute').mockImplementation((p: string) => {
				// Treat Windows-style paths as absolute
				if (p.match(/^[A-Z]:\\/)) return true;
				return originalIsAbsolute(p);
			});

			vi.spyOn(path, 'parse').mockImplementation((p: string) => {
				if (p.match(/^[A-Z]:\\/)) {
					const match = p.match(/^([A-Z]:\\)/);
					return { ...originalParse(p), root: match ? match[1] : 'C:\\' };
				}
				return originalParse(p);
			});

			vi.spyOn(path, 'relative').mockImplementation((from: string, to: string) => {
				// Simple Windows path relative calculation
				if (from.match(/^[A-Z]:\\/) && to.match(/^[A-Z]:\\/)) {
					return 'src\\App.tsx';
				}
				return originalRelative(from, to);
			});

			vi.spyOn(path, 'normalize').mockImplementation((p: string) => {
				if (p.match(/^[A-Z]:\\/)) return p;
				return originalNormalize(p);
			});

			const filePath = 'C:\\Users\\foo\\project\\src\\App.tsx';
			const rootPath = 'C:\\Users\\foo\\project';

			await copyFilePath(filePath, rootPath, true);

			// Should copy relative path with Windows separators
			expect(clipboardy.write).toHaveBeenCalledWith('src\\App.tsx');

			// Restore original implementations
			vi.restoreAllMocks();
		});

		it('handles nested directories in relative paths', async () => {
			const filePath = '/Users/foo/project/src/components/Button/index.tsx';
			const rootPath = '/Users/foo/project';

			await copyFilePath(filePath, rootPath, true);

			expect(clipboardy.write).toHaveBeenCalledWith(
				path.join('src', 'components', 'Button', 'index.tsx')
			);
		});

		it('throws error if clipboard write fails', async () => {
			const error = new Error('Permission denied');
			vi.mocked(clipboardy.write).mockRejectedValueOnce(error);

			const filePath = '/Users/foo/project/src/App.tsx';
			const rootPath = '/Users/foo/project';

			await expect(copyFilePath(filePath, rootPath, false)).rejects.toThrow(
				'Failed to copy to clipboard'
			);
		});

		it('handles file path same as root path', async () => {
			const filePath = '/Users/foo/project';
			const rootPath = '/Users/foo/project';

			await copyFilePath(filePath, rootPath, true);

			// Relative path from root to root returns '.' for clarity
			expect(clipboardy.write).toHaveBeenCalledWith('.');
		});
	});

	describe('validation', () => {
		it('throws error for empty file path', async () => {
			await expect(copyFilePath('', '/Users/foo/project', false)).rejects.toThrow(
				'filePath and rootPath must not be empty'
			);
		});

		it('throws error for empty root path', async () => {
			await expect(copyFilePath('/Users/foo/project/src/App.tsx', '', false)).rejects.toThrow(
				'filePath and rootPath must not be empty'
			);
		});

		it('throws error for whitespace-only paths', async () => {
			await expect(copyFilePath('   ', '/Users/foo/project', false)).rejects.toThrow(
				'filePath and rootPath must not be empty'
			);
		});

		it('throws error for relative file path', async () => {
			await expect(copyFilePath('./src/App.tsx', '/Users/foo/project', false)).rejects.toThrow(
				'filePath and rootPath must be absolute'
			);
		});

		it('throws error for relative root path', async () => {
			await expect(copyFilePath('/Users/foo/project/src/App.tsx', './project', false)).rejects.toThrow(
				'filePath and rootPath must be absolute'
			);
		});

		it('handles Windows cross-drive scenario by falling back to absolute path', async () => {
			// Mock path functions to handle Windows paths on any platform
			const originalIsAbsolute = path.isAbsolute;
			const originalParse = path.parse;
			const originalNormalize = path.normalize;

			vi.spyOn(path, 'isAbsolute').mockImplementation((p: string) => {
				// Treat Windows-style paths as absolute
				if (p.match(/^[A-Z]:\\/)) return true;
				return originalIsAbsolute(p);
			});

			vi.spyOn(path, 'parse').mockImplementation((p: string) => {
				if (p.includes('C:')) {
					return { ...originalParse(p), root: 'C:\\' };
				} else if (p.includes('D:')) {
					return { ...originalParse(p), root: 'D:\\' };
				}
				return originalParse(p);
			});

			vi.spyOn(path, 'normalize').mockImplementation((p: string) => {
				if (p.match(/^[A-Z]:\\/)) return p;
				return originalNormalize(p);
			});

			const filePath = 'D:\\Users\\bar\\file.txt';
			const rootPath = 'C:\\Users\\foo\\project';

			await copyFilePath(filePath, rootPath, true);

			// Should fall back to absolute path when drives differ
			expect(clipboardy.write).toHaveBeenCalledWith(filePath);

			// Restore original implementations
			vi.restoreAllMocks();
		});
	});

	describe('edge cases', () => {
		it('handles paths with spaces', async () => {
			const filePath = '/Users/foo/My Project/src/App.tsx';
			const rootPath = '/Users/foo/My Project';

			await copyFilePath(filePath, rootPath, true);

			expect(clipboardy.write).toHaveBeenCalledWith(
				path.join('src', 'App.tsx')
			);
		});

		it('handles paths with special characters', async () => {
			const filePath = '/Users/foo/project/@types/index.d.ts';
			const rootPath = '/Users/foo/project';

			await copyFilePath(filePath, rootPath, true);

			expect(clipboardy.write).toHaveBeenCalledWith(
				path.join('@types', 'index.d.ts')
			);
		});

		it('handles paths with unicode characters', async () => {
			const filePath = '/Users/foo/project/文件/测试.txt';
			const rootPath = '/Users/foo/project';

			await copyFilePath(filePath, rootPath, true);

			expect(clipboardy.write).toHaveBeenCalledWith(
				path.join('文件', '测试.txt')
			);
		});
	});
});
