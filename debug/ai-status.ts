#!/usr/bin/env tsx
import path from 'node:path';
import { loadEnv } from '../src/utils/envLoader.js';
import { gatherContext } from '../src/utils/aiContext.js';
import { generateStatusUpdate } from '../src/services/ai/status.js';

async function main(): Promise<void> {
  const target = process.argv[2] ? path.resolve(process.argv[2]!) : process.cwd();
  loadEnv(target);

  // eslint-disable-next-line no-console
  console.log(`AI status debug for: ${target}`);
  // eslint-disable-next-line no-console
  console.log(`OPENAI_API_KEY present: ${Boolean(process.env.OPENAI_API_KEY)}`);

  const context = await gatherContext(target);
  // eslint-disable-next-line no-console
  console.log(`Diff length: ${context.diff.length}`);
  // eslint-disable-next-line no-console
  console.log(`README length: ${context.readme.length}`);

  const status = await generateStatusUpdate(context.diff, context.readme);
  // eslint-disable-next-line no-console
  console.log('AI status result:', status);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('AI status debug failed', err);
  process.exit(1);
});
