import type { CommandDefinition } from '../types.js';

export const openCommand: CommandDefinition = {
  name: 'open',
  description: 'Open the current folder in Finder/Explorer',
  aliases: ['o', 'explore'],

  execute: async (args, { system, state }) => {
    // Default to opening the root cwd
    let targetPath = system.cwd;

    // If they typed "/open .", it implies root
    // If they typed "/open selected", we could handle that:
    if (args[0] === 'selected' && state.selectedPath) {
      targetPath = state.selectedPath;
    }

    await system.openExternal(targetPath);

    return {
      success: true,
      message: `Opened ${targetPath}`
    };
  }
};
