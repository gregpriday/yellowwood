import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseCommand, executeCommand } from '../../src/utils/commandParser.js';
import type { CommandContext, TreeNode, GitStatus } from '../../src/types/index.js';

// Helper to create test nodes
function createFile(name: string, path: string, gitStatus?: GitStatus): TreeNode {
  return {
    name,
    path,
    type: 'file',
    depth: 0,
    gitStatus,
  };
}

function createFolder(name: string, path: string, children: TreeNode[]): TreeNode {
  return {
    name,
    path,
    type: 'directory',
    depth: 0,
    children,
  };
}

// Helper to count files in tree
function countFiles(tree: TreeNode[]): number {
  let count = 0;
  for (const node of tree) {
    if (node.type === 'file') {
      count++;
    }
    if (node.children) {
      count += countFiles(node.children);
    }
  }
  return count;
}

describe('parseCommand', () => {
  it('parses /git modified correctly', () => {
    const result = parseCommand('/git modified');
    expect(result.command).toBe('git');
    expect(result.args).toEqual(['modified']);
  });

  it('parses /g modified (alias) correctly', () => {
    const result = parseCommand('/g modified');
    expect(result.command).toBe('g');
    expect(result.args).toEqual(['modified']);
  });

  it('parses /changed correctly', () => {
    const result = parseCommand('/changed');
    expect(result.command).toBe('changed');
    expect(result.args).toEqual([]);
  });

  it('parses /ch (alias) correctly', () => {
    const result = parseCommand('/ch');
    expect(result.command).toBe('ch');
    expect(result.args).toEqual([]);
  });

  it('handles mixed case command names', () => {
    const result = parseCommand('/GIT MODIFIED');
    expect(result.command).toBe('git');
    expect(result.args).toEqual(['MODIFIED']);
  });

  it('handles extra spaces in input', () => {
    const result = parseCommand('/git   modified   ');
    expect(result.command).toBe('git');
    expect(result.args).toEqual(['modified']);
  });

  it('throws error for input without leading slash', () => {
    expect(() => parseCommand('git modified')).toThrow(/must start with/i);
  });

  it('throws error for empty command', () => {
    expect(() => parseCommand('/')).toThrow(/empty command/i);
  });

  it('throws error for whitespace-only input', () => {
    expect(() => parseCommand('/   ')).toThrow(/empty command/i);
  });
});

describe('/git command', () => {
  let mockContext: CommandContext;
  let sampleTree: TreeNode[];
  let gitStatusMap: Map<string, GitStatus>;

  beforeEach(() => {
    // Sample tree with git statuses
    sampleTree = [
      createFolder('src', '/src', [
        createFile('App.tsx', '/src/App.tsx', 'modified'),
        createFile('New.tsx', '/src/New.tsx', 'added'),
        createFile('utils.ts', '/src/utils.ts'), // clean (no status)
      ]),
      createFile('README.md', '/README.md', 'modified'),
      createFile('deleted.ts', '/deleted.ts', 'deleted'),
      createFile('untracked.txt', '/untracked.txt', 'untracked'),
    ];

    gitStatusMap = new Map([
      ['/src/App.tsx', 'modified'],
      ['/src/New.tsx', 'added'],
      ['/README.md', 'modified'],
      ['/deleted.ts', 'deleted'],
      ['/untracked.txt', 'untracked'],
    ]);

    mockContext = {
      fileTree: sampleTree,
      gitStatus: gitStatusMap,
      gitEnabled: true,
      setGitStatusFilter: vi.fn(),
      setFilterActive: vi.fn(),
      setFilterQuery: vi.fn(),
      setNotification: vi.fn(),
      commandHistory: [],
    };
  });

  it('filters by modified status', async () => {
    const result = await executeCommand('/git modified', mockContext);

    expect(mockContext.setGitStatusFilter).toHaveBeenCalledWith('modified');
    expect(mockContext.setFilterActive).toHaveBeenCalledWith(true);
    expect(mockContext.setFilterQuery).toHaveBeenCalledWith('/git: modified');

    expect(result.type).toBe('success');
    expect(result.message).toContain('modified');
    expect(result.message).toContain('2 found');
  });

  it('filters by added status', async () => {
    const result = await executeCommand('/git added', mockContext);

    expect(mockContext.setGitStatusFilter).toHaveBeenCalledWith('added');
    expect(result.message).toContain('added');
    expect(result.message).toContain('1 found');
  });

  it('filters by deleted status', async () => {
    const result = await executeCommand('/git deleted', mockContext);

    expect(mockContext.setGitStatusFilter).toHaveBeenCalledWith('deleted');
    expect(result.message).toContain('deleted');
  });

  it('filters by untracked status', async () => {
    const result = await executeCommand('/git untracked', mockContext);

    expect(mockContext.setGitStatusFilter).toHaveBeenCalledWith('untracked');
    expect(result.message).toContain('untracked');
  });

  it('returns error for invalid status', async () => {
    const result = await executeCommand('/git invalid', mockContext);

    expect(result.type).toBe('error');
    expect(result.message).toContain('Invalid git status');
    expect(result.message).toContain('invalid');
    expect(mockContext.setGitStatusFilter).not.toHaveBeenCalled();
  });

  it('returns error for missing argument', async () => {
    const result = await executeCommand('/git', mockContext);

    expect(result.type).toBe('error');
    expect(result.message).toContain('Usage');
    expect(mockContext.setGitStatusFilter).not.toHaveBeenCalled();
  });

  it('returns error when git is disabled', async () => {
    mockContext.gitEnabled = false;

    const result = await executeCommand('/git modified', mockContext);

    expect(result.type).toBe('error');
    expect(result.message).toContain('Git is not enabled');
    expect(mockContext.setGitStatusFilter).not.toHaveBeenCalled();
  });

  it('returns 0 files found when no files match status', async () => {
    // Create a tree where no files are staged
    mockContext.fileTree = [createFile('file.ts', '/file.ts', 'modified')];
    mockContext.gitStatus = new Map([['/file.ts', 'modified']]);

    const result = await executeCommand('/git added', mockContext);

    expect(result.message).toContain('added');
    expect(result.message).toContain('0 found');
    expect(result.type).toBe('success');
  });

  it('handles empty tree gracefully', async () => {
    mockContext.fileTree = [];

    const result = await executeCommand('/git modified', mockContext);

    expect(result.type).toBe('success');
    expect(result.message).toContain('0 found');
  });

  it('uses alias /g correctly', async () => {
    const result = await executeCommand('/g modified', mockContext);

    expect(mockContext.setGitStatusFilter).toHaveBeenCalledWith('modified');
    expect(result.type).toBe('success');
    expect(result.message).toContain('modified');
  });

  it('case-insensitive status argument', async () => {
    const result = await executeCommand('/git MODIFIED', mockContext);

    expect(result.type).toBe('success');
    expect(mockContext.setGitStatusFilter).toHaveBeenCalledWith('modified');
    expect(mockContext.setFilterQuery).toHaveBeenCalledWith('/git: modified');
  });

  it('ignores extra arguments', async () => {
    const result = await executeCommand('/git modified extra args here', mockContext);

    expect(result.type).toBe('success');
    expect(mockContext.setGitStatusFilter).toHaveBeenCalledWith('modified');
  });
});

describe('/changed command', () => {
  let mockContext: CommandContext;
  let sampleTree: TreeNode[];

  beforeEach(() => {
    sampleTree = [
      createFolder('src', '/src', [
        createFile('App.tsx', '/src/App.tsx', 'modified'),
        createFile('New.tsx', '/src/New.tsx', 'added'),
        createFile('utils.ts', '/src/utils.ts'), // clean
      ]),
      createFile('README.md', '/README.md', 'modified'),
      createFile('deleted.ts', '/deleted.ts', 'deleted'),
      createFile('untracked.txt', '/untracked.txt', 'untracked'),
    ];

    mockContext = {
      fileTree: sampleTree,
      gitStatus: new Map([
        ['/src/App.tsx', 'modified'],
        ['/src/New.tsx', 'added'],
        ['/README.md', 'modified'],
        ['/deleted.ts', 'deleted'],
        ['/untracked.txt', 'untracked'],
      ]),
      gitEnabled: true,
      setGitStatusFilter: vi.fn(),
      setFilterActive: vi.fn(),
      setFilterQuery: vi.fn(),
      setNotification: vi.fn(),
      commandHistory: [],
    };
  });

  it('shows all changed files', async () => {
    const result = await executeCommand('/changed', mockContext);

    expect(mockContext.setGitStatusFilter).toHaveBeenCalledWith(['modified', 'added', 'deleted', 'untracked']);
    expect(mockContext.setFilterActive).toHaveBeenCalledWith(true);
    expect(mockContext.setFilterQuery).toHaveBeenCalledWith('/changed');

    expect(result.type).toBe('success');
    expect(result.message).toContain('changed');
    expect(result.message).toContain('5 found');
  });

  it('uses alias /ch correctly', async () => {
    const result = await executeCommand('/ch', mockContext);

    expect(mockContext.setGitStatusFilter).toHaveBeenCalledWith(['modified', 'added', 'deleted', 'untracked']);
    expect(result.type).toBe('success');
  });

  it('returns error when git is disabled', async () => {
    mockContext.gitEnabled = false;

    const result = await executeCommand('/changed', mockContext);

    expect(result.type).toBe('error');
    expect(result.message).toContain('Git is not enabled');
    expect(mockContext.setGitStatusFilter).not.toHaveBeenCalled();
  });

  it('returns 0 found for empty tree', async () => {
    mockContext.fileTree = [];

    const result = await executeCommand('/changed', mockContext);

    expect(result.type).toBe('success');
    expect(result.message).toContain('0 found');
  });

  it('handles clean tree (all files clean)', async () => {
    mockContext.fileTree = [
      createFile('file1.ts', '/file1.ts'), // clean
      createFile('file2.ts', '/file2.ts'), // clean
    ];

    const result = await executeCommand('/changed', mockContext);

    expect(mockContext.setGitStatusFilter).toHaveBeenCalled();
    expect(result.message).toContain('0 found');
  });
});

describe('unknown commands', () => {
  let mockContext: CommandContext;

  beforeEach(() => {
    mockContext = {
      fileTree: [],
      gitStatus: new Map(),
      gitEnabled: true,
      setGitStatusFilter: vi.fn(),
      setFilterActive: vi.fn(),
      setFilterQuery: vi.fn(),
      setNotification: vi.fn(),
      commandHistory: [],
    };
  });

  it('returns error for unknown command', async () => {
    const result = await executeCommand('/unknown', mockContext);

    expect(result.type).toBe('error');
    expect(result.message).toContain('Unknown command');
  });

  it('returns helpful message with /help suggestion', async () => {
    const result = await executeCommand('/notacommand', mockContext);

    expect(result.type).toBe('error');
    expect(result.message).toContain('help');
  });
});

describe('error handling', () => {
  let mockContext: CommandContext;

  beforeEach(() => {
    mockContext = {
      fileTree: [],
      gitStatus: new Map(),
      gitEnabled: true,
      setGitStatusFilter: vi.fn(),
      setFilterActive: vi.fn(),
      setFilterQuery: vi.fn(),
      setNotification: vi.fn(),
      commandHistory: [],
    };
  });

  it('gracefully handles malformed input', async () => {
    const result = await executeCommand('not a command', mockContext);

    expect(result.type).toBe('error');
  });

  it('preserves filter state on error', async () => {
    const result = await executeCommand('/git invalid', mockContext);

    expect(result.type).toBe('error');
    expect(mockContext.setFilterActive).not.toHaveBeenCalled();
    expect(mockContext.setGitStatusFilter).not.toHaveBeenCalled();
  });
});

describe('filter state updates', () => {
  let mockContext: CommandContext;
  let sampleTree: TreeNode[];

  beforeEach(() => {
    sampleTree = [
      createFile('modified.ts', '/modified.ts', 'modified'),
      createFile('clean.ts', '/clean.ts'),
    ];

    mockContext = {
      fileTree: sampleTree,
      gitStatus: new Map([['/modified.ts', 'modified']]),
      gitEnabled: true,
      setGitStatusFilter: vi.fn(),
      setFilterActive: vi.fn(),
      setFilterQuery: vi.fn(),
      setNotification: vi.fn(),
      commandHistory: [],
    };
  });

  it('updates filter state on successful command', async () => {
    await executeCommand('/git modified', mockContext);

    expect(mockContext.setFilterActive).toHaveBeenCalledWith(true);
    expect(mockContext.setFilterQuery).toHaveBeenCalledWith('/git: modified');
  });

  it('provides correct query string format', async () => {
    await executeCommand('/git added', mockContext);

    const calls = (mockContext.setFilterQuery as any).mock.calls;
    expect(calls[0][0]).toBe('/git: added');
  });

  it('changed command sets /changed query string', async () => {
    await executeCommand('/changed', mockContext);

    const calls = (mockContext.setFilterQuery as any).mock.calls;
    expect(calls[0][0]).toBe('/changed');
  });
});

describe('file tree preservation', () => {
  it('preserves folder hierarchy when filtering', async () => {
    const sampleTree: TreeNode[] = [
      createFolder('src', '/src', [
        createFolder('components', '/src/components', [
          createFile('Button.tsx', '/src/components/Button.tsx', 'modified'),
          createFile('Input.tsx', '/src/components/Input.tsx'),
        ]),
        createFile('App.tsx', '/src/App.tsx'),
      ]),
    ];

    const mockContext: CommandContext = {
      fileTree: sampleTree,
      gitStatus: new Map([['/src/components/Button.tsx', 'modified']]),
      gitEnabled: true,
      setGitStatusFilter: vi.fn(),
      setFilterActive: vi.fn(),
      setFilterQuery: vi.fn(),
      setNotification: vi.fn(),
      commandHistory: [],
    };

    await executeCommand('/git modified', mockContext);

    expect(mockContext.setGitStatusFilter).toHaveBeenCalledWith('modified');
  });
});
