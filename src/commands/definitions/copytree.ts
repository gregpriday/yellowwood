import type { CommandDefinition } from '../types.js';

export const copyTreeCommand: CommandDefinition = {
  name: 'copytree',
  description: 'Run CopyTree on the current directory',
  aliases: ['cp'],
  
  execute: async (_args, { system, ui }) => {
    ui.notify({ type: 'info', message: 'Running CopyTree...' });

    try {
      // Execute copytree in the current working directory
      // Note: We assume 'copytree' is in the PATH. 
      // We pass '-r' based on your spec to copy as reference.
      const output = await system.exec('copytree', ['-r'], system.cwd);
      
      // Clean up output for notification
      const cleanOutput = output.trim().split('\n').pop() || 'Copied to clipboard!';

      return {
        success: true,
        message: `✅ ${cleanOutput}`
      };
    } catch (error: any) {
      throw new Error(`CopyTree failed: ${error.message}`);
    }
  }
};
