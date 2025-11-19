import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

export interface ProjectIdentity {
  emoji: string;
  title: string;
  gradientStart: string;
  gradientEnd: string;
}

export interface IdentityCacheEntry extends ProjectIdentity {
  hash: string;
  timestamp: number;
  model: string;
}

export interface IdentityCacheStore {
  [projectPath: string]: IdentityCacheEntry;
}

// Legacy support
export interface EmojiCacheEntry {
  emoji: string;
  hash: string;
  timestamp: number;
  model: string;
}

export interface EmojiCacheStore {
  [projectPath: string]: EmojiCacheEntry;
}

const CACHE_DIR = path.join(os.homedir(), '.config', 'canopy');
const CACHE_FILE = path.join(CACHE_DIR, 'emoji-cache.json');

export async function loadCache(): Promise<IdentityCacheStore> {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8');
    const json = JSON.parse(data);

    // Validation: Check if the first key found has the new 'gradientStart' property.
    // If not, this is the old cache format. Return empty to force overwrite.
    const keys = Object.keys(json);
    if (keys.length > 0 && !json[keys[0]].gradientStart) {
      return {};
    }

    return json as IdentityCacheStore;
  } catch (error) {
    // If file doesn't exist or is invalid, return empty store
    return {};
  }
}

export async function saveCache(store: IdentityCacheStore): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (error) {
    // Fail silently as per user request to remove logging for this feature.
  }
}

export async function getProjectHash(rootPath: string): Promise<string> {
  const folderName = path.basename(rootPath);
  const hash = crypto.createHash('sha256');
  hash.update(folderName);
  return hash.digest('hex');
}
