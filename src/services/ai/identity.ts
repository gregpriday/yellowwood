import { getAIClient } from './client.js';
import type { ProjectIdentity } from './cache.js';

function extractOutputText(response: any): string | null {
  if (typeof response?.output_text === 'string' && response.output_text.trim().length > 0) {
    return response.output_text;
  }

  if (Array.isArray(response?.output)) {
    for (const item of response.output) {
      if (Array.isArray(item?.content)) {
        for (const content of item.content) {
          if (typeof content?.text === 'string' && content.text.trim().length > 0) {
            return content.text;
          }
        }
      }
    }
  }

  return null;
}

export async function generateProjectIdentity(pathOrName: string): Promise<ProjectIdentity | null> {
  const client = getAIClient();
  if (!client) return null;

  try {
    const response = await client.responses.create({
      model: 'gpt-5-mini',
      instructions: 'You create visual identities for projects. Choose a representative emoji, convert folder name to Title Case (remove hyphens/underscores), and pick two bright/neon/pastel gradient colors. Avoid dark colors.',
      input: `Project path: "${pathOrName}"`,
      text: {
        format: {
          type: "json_schema",
          name: "project_identity",
          strict: true,
          schema: {
            type: "object",
            properties: {
              emoji: { type: "string" },
              title: { type: "string" },
              gradientStart: { type: "string" },
              gradientEnd: { type: "string" }
            },
            required: ["emoji", "title", "gradientStart", "gradientEnd"],
            additionalProperties: false
          }
        }
      },
      reasoning: { effort: 'minimal' },
      max_output_tokens: 96
    } as any);

    const text = extractOutputText(response);
    if (!text) {
      console.error('[canopy] Identity: empty response from model');
      return null;
    }

    try {
      return JSON.parse(text) as ProjectIdentity;
    } catch (parseError) {
      console.error('[canopy] Identity: failed to parse JSON', parseError);
      return null;
    }
  } catch (error) {
    console.error('[canopy] generateProjectIdentity failed', error);
    return null;
  }
}
