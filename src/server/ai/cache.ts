import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DATA_DIR } from "@/server/data/store";

function cacheFile(namespace: string, key: string): string {
  if (!/^[a-z0-9-]+$/.test(namespace)) throw new Error("Invalid AI cache namespace");
  return join(DATA_DIR, "ai-cache", namespace, `${createHash("sha256").update(key).digest("hex")}.json`);
}

/** Successful extractions stay repeatable across restarts; delete the file to refresh. */
export async function readAiCache<T>(namespace: string, key: string, parse: (value: unknown) => T): Promise<T | undefined> {
  const file = cacheFile(namespace, key);
  try {
    return parse(JSON.parse(await readFile(file, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.warn(`Ignoring unreadable ${namespace} cache entry`);
    return undefined;
  }
}

/** Atomic writes prevent concurrent requests from leaving a partial JSON response. */
export async function writeAiCache<T>(namespace: string, key: string, value: T): Promise<void> {
  const file = cacheFile(namespace, key);
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await mkdir(join(DATA_DIR, "ai-cache", namespace), { recursive: true });
    await writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
    await rename(temporary, file);
  } catch {
    console.warn(`Could not save ${namespace} cache entry`);
    await unlink(temporary).catch(() => {});
  }
}
