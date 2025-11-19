import clipboardy from 'clipboardy';
import path from 'path';

/**
 * Copy text to the system clipboard.
 *
 * @param text - Text to copy to clipboard
 * @throws Error if clipboard is unavailable or operation fails
 */
export async function copyToClipboard(text: string): Promise<void> {
	try {
		await clipboardy.write(text);
	} catch (error) {
		// Re-throw with more context
		throw new Error(
			`Failed to copy to clipboard: ${(error as Error).message}`
		);
	}
}

/**
 * Copy a file path to the clipboard.
 * Supports both relative and absolute paths.
 *
 * @param filePath - Absolute path to the file
 * @param rootPath - Root directory path (for computing relative paths)
 * @param relative - If true, copy relative path; if false, copy absolute path
 * @throws Error if clipboard is unavailable or paths are invalid
 */
export async function copyFilePath(
	filePath: string,
	rootPath: string,
	relative: boolean
): Promise<void> {
	// Validate inputs
	if (!filePath.trim() || !rootPath.trim()) {
		throw new Error('filePath and rootPath must not be empty');
	}

	// Normalize both paths
	const normalizedFilePath = path.normalize(filePath);
	const normalizedRootPath = path.normalize(rootPath);

	// Validate that paths are absolute
	if (!path.isAbsolute(normalizedFilePath) || !path.isAbsolute(normalizedRootPath)) {
		throw new Error('filePath and rootPath must be absolute');
	}

	// Compute the path to copy
	let pathToCopy = relative
		? path.relative(normalizedRootPath, normalizedFilePath)
		: normalizedFilePath;

	// Handle relative path edge cases
	if (relative) {
		// Windows: Check for cross-drive scenario (different drive letters)
		const fileDrive = path.parse(normalizedFilePath).root;
		const rootDrive = path.parse(normalizedRootPath).root;
		if (fileDrive !== rootDrive) {
			// Fall back to absolute path when drives differ
			pathToCopy = normalizedFilePath;
		} else if (!pathToCopy) {
			// When file equals root, relative path is empty - use '.' instead
			pathToCopy = '.';
		}
	}

	// Copy to clipboard
	await copyToClipboard(pathToCopy);
}
