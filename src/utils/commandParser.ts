import type { GitStatus, Notification, CommandContext, TreeNode } from '../types/index.js';
import { filterTreeByGitStatus } from './filter.js';

/**
 * Command execution result with message to display to user.
 */
export interface CommandResult {
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

/**
 * Command handler function signature.
 */
type CommandHandler = (args: string[], context: CommandContext) => Promise<CommandResult> | CommandResult;

/**
 * Registered command definition.
 */
interface CommandDefinition {
  name: string;
  aliases: string[];
  description: string;
  handler: CommandHandler;
}

/**
 * Command parser for handling slash commands.
 * Manages command registration, parsing, and execution.
 */
class CommandParser {
  private commands: Map<string, CommandDefinition> = new Map();
  private aliasMap: Map<string, string> = new Map();

  /**
   * Parse a command string into command name and arguments.
   * @param input - Raw command input (e.g., "/git modified")
   * @returns Parsed command name and arguments
   * @throws Error if input is not a valid command format
   */
  parseCommand(input: string): { command: string; args: string[] } {
    const trimmed = input.trim();

    // Must start with /
    if (!trimmed.startsWith('/')) {
      throw new Error('Commands must start with /');
    }

    // Remove leading /
    const commandStr = trimmed.slice(1);

    // Split by spaces to get command and args
    const parts = commandStr.split(/\s+/).filter(p => p.length > 0);

    if (parts.length === 0) {
      throw new Error('Empty command');
    }

    const [commandName, ...args] = parts;
    return { command: commandName.toLowerCase(), args };
  }

  /**
   * Register a command handler.
   */
  registerCommand(
    name: string,
    aliases: string[],
    description: string,
    handler: CommandHandler
  ): void {
    const lowerName = name.toLowerCase();

    // Register main name
    this.commands.set(lowerName, {
      name: lowerName,
      aliases: aliases.map(a => a.toLowerCase()),
      description,
      handler,
    });

    // Register all aliases
    for (const alias of aliases) {
      this.aliasMap.set(alias.toLowerCase(), lowerName);
    }
  }

  /**
   * Execute a command string with the given context.
   * @param input - Raw command input (e.g., "/git modified")
   * @param context - Command execution context
   * @returns Command result with message
   */
  async executeCommand(input: string, context: CommandContext): Promise<CommandResult> {
    try {
      const { command, args } = this.parseCommand(input);

      // Resolve alias to main command name
      const mainCommand = this.aliasMap.get(command) || command;
      const commandDef = this.commands.get(mainCommand);

      if (!commandDef) {
        return {
          message: `Unknown command: ${command}. Use /help for available commands.`,
          type: 'error',
        };
      }

      // Execute the command handler
      const result = await commandDef.handler(args, context);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        message: `Error: ${message}`,
        type: 'error',
      };
    }
  }
}

/**
 * Global parser instance.
 */
const parser = new CommandParser();

/**
 * Count files in tree (excluding directories).
 */
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

/**
 * Register git filter commands (/git and /changed).
 */
function registerGitCommands(): void {
  // /git [status] command
  parser.registerCommand(
    'git',
    ['g'],
    'Filter tree by git status (modified|added|deleted|untracked)',
    (args, context) => {
      // Check if git is enabled
      if (!context.gitEnabled) {
        return {
          message: 'Git is not enabled. Make sure you are in a git repository and git is installed.',
          type: 'error',
        };
      }

      // Validate arguments
      if (args.length === 0) {
        return {
          message: 'Usage: /git <status>\nAvailable statuses: modified, added, deleted, untracked',
          type: 'error',
        };
      }

      const status = args[0].toLowerCase();
      const validStatuses: GitStatus[] = ['modified', 'added', 'deleted', 'untracked'];

      if (!validStatuses.includes(status as GitStatus)) {
        return {
          message: `Invalid git status: "${status}"\nUse: /git ${validStatuses.join('|')}`,
          type: 'error',
        };
      }

      // Update state to apply git status filter
      context.setGitStatusFilter(status as GitStatus);
      context.setFilterActive(true);
      context.setFilterQuery(`/git: ${status}`);

      // Count matching files by applying filter to current tree
      const filteredTree = filterTreeByGitStatus(context.fileTree, status as GitStatus);
      const count = countFiles(filteredTree);

      return {
        message: `Showing ${status} files (${count} found)`,
        type: 'success',
      };
    }
  );

  // /changed command (shorthand for all modified files)
  parser.registerCommand(
    'changed',
    ['ch'],
    'Show all changed files (modified, added, deleted, untracked)',
    (args, context) => {
      // Check if git is enabled
      if (!context.gitEnabled) {
        return {
          message: 'Git is not enabled. Make sure you are in a git repository.',
          type: 'error',
        };
      }

      // Filter by all non-clean statuses
      const statuses: GitStatus[] = ['modified', 'added', 'deleted', 'untracked'];

      // Update state to apply git status filter
      context.setGitStatusFilter(statuses);
      context.setFilterActive(true);
      context.setFilterQuery('/changed');

      // Count matching files by applying filter to current tree
      const filteredTree = filterTreeByGitStatus(context.fileTree, statuses);
      const count = countFiles(filteredTree);

      return {
        message: `Showing all changed files (${count} found)`,
        type: 'success',
      };
    }
  );
}

// Initialize commands on module load
registerGitCommands();

/**
 * Execute a command string with the given context.
 * @param input - Raw command input (e.g., "/git modified")
 * @param context - Command execution context
 * @returns Command result with message
 */
export async function executeCommand(input: string, context: CommandContext): Promise<CommandResult> {
  return parser.executeCommand(input, context);
}

/**
 * Parse a command string into command name and arguments.
 * @param input - Raw command input (e.g., "/git modified")
 * @returns Parsed command name and arguments
 */
export function parseCommand(input: string): { command: string; args: string[] } {
  return parser.parseCommand(input);
}

/**
 * Register a custom command.
 * Used for testing and extending the command system.
 */
export function registerCommand(
  name: string,
  aliases: string[],
  description: string,
  handler: CommandHandler
): void {
  parser.registerCommand(name, aliases, description, handler);
}
