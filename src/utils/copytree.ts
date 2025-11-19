import { execa } from 'execa';

/**
 * Executes the 'copytree' command in the specified directory.
 * 
 * @param cwd The current working directory to run the command in (usually activeRootPath)
 * @returns The stdout output from the command
 * @throws Error if command fails or is not found
 */
export async function runCopyTree(cwd: string): Promise<string> {
  try {
    // Using -r flag as per spec
    const { stdout } = await execa('copytree', ['-r'], { cwd });
    return stdout.trim();
  } catch (error: any) {
    // Improve error message if command is missing
    if (error.code === 'ENOENT') {
      throw new Error('copytree command not found. Please install it first.');
    }
    throw new Error(error.message || 'CopyTree execution failed');
  }
}
