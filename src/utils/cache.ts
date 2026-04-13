import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';

const CACHE_DIR = path.join(os.tmpdir(), 'readme-ai-cache');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
}

async function ensureCacheDir(): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

export async function getCached(key: string): Promise<string | null> {
  try {
    const filePath = path.join(CACHE_DIR, hashKey(key) + '.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    const entry = JSON.parse(raw) as { timestamp: number; value: string };

    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      await fs.unlink(filePath).catch(() => {});
      return null;
    }

    return entry.value;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: string): Promise<void> {
  try {
    await ensureCacheDir();
    const filePath = path.join(CACHE_DIR, hashKey(key) + '.json');
    const entry = { timestamp: Date.now(), value };
    await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8');
  } catch {
    // Cache write failure is non-fatal
  }
}

export async function clearCache(): Promise<void> {
  try {
    const files = await fs.readdir(CACHE_DIR);
    await Promise.all(files.map((f) => fs.unlink(path.join(CACHE_DIR, f)).catch(() => {})));
  } catch {
    // Ignore
  }
}
