import {
  BaseDirectory,
  mkdir,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import type { WebShard } from "@/runtime/web-contract";
import { SHARD_IDS } from "../shard-ids";

export interface StaticCacheRequest {
  namespace: string;
  fileName: string;
  urls: readonly string[];
  forceRefresh?: boolean;
}

export class StaticCacheShard implements WebShard {
  private readonly inFlight = new Map<string, Promise<string>>();
  private readonly parsedJson = new Map<string, unknown>();

  public label() {
    return "StaticCacheShard";
  }

  public id() {
    return SHARD_IDS.STATIC_CACHE;
  }

  public async getJson<T>(request: StaticCacheRequest): Promise<T> {
    const key = cacheKey({ ...request, forceRefresh: false });
    if (!request.forceRefresh && this.parsedJson.has(key)) {
      return this.parsedJson.get(key) as T;
    }

    const text = await this.getText(request);

    try {
      const value = JSON.parse(text) as T;
      this.parsedJson.set(key, value);
      return value;
    } catch (error) {
      if (request.forceRefresh) {
        throw error;
      }

      const refreshedText = await this.getText({
        ...request,
        forceRefresh: true,
      });
      const value = JSON.parse(refreshedText) as T;
      this.parsedJson.set(key, value);
      return value;
    }
  }

  public async getText(request: StaticCacheRequest): Promise<string> {
    const key = cacheKey(request);
    const inFlight = this.inFlight.get(key);
    if (inFlight) {
      return inFlight;
    }

    const pending = this.getTextInternal(request).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, pending);
    return pending;
  }

  private async getTextInternal(request: StaticCacheRequest): Promise<string> {
    const filePath = cacheFilePath(request.namespace, request.fileName);

    if (!request.forceRefresh) {
      try {
        return await readTextFile(filePath, {
          baseDir: BaseDirectory.AppData,
        });
      } catch {
        // Cache misses and invalid permissions both fall through to fetch.
      }
    }

    const text = await fetchFirstText(request.urls);
    await writeCacheText(filePath, text);
    return text;
  }
}

async function fetchFirstText(urls: readonly string[]): Promise<string> {
  let lastError = "No URL was provided";

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.text();
      }

      lastError = `${url} returned ${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = `${url} failed: ${String(error)}`;
    }
  }

  throw new Error(`Static cache fetch failed: ${lastError}`);
}

async function writeCacheText(filePath: string, text: string): Promise<void> {
  const parent = filePath.split("/").slice(0, -1).join("/");
  if (parent.length > 0) {
    await mkdir(parent, {
      baseDir: BaseDirectory.AppData,
      recursive: true,
    });
  }

  await writeTextFile(filePath, text, {
    baseDir: BaseDirectory.AppData,
  });
}

function cacheKey(request: StaticCacheRequest): string {
  return [
    sanitizeCacheSegment(request.namespace),
    sanitizeCacheSegment(request.fileName),
    request.forceRefresh ? "refresh" : "cached",
    request.urls.join("\n"),
  ].join("\0");
}

function cacheFilePath(namespace: string, fileName: string): string {
  return [
    "cache",
    sanitizeCacheSegment(namespace),
    sanitizeCacheSegment(fileName),
  ].join("/");
}

function sanitizeCacheSegment(value: string): string {
  const sanitized = value
    .split("")
    .map((char) => (/^[a-zA-Z0-9._-]$/.test(char) ? char : "_"))
    .join("");

  return sanitized.length > 0 ? sanitized : "unknown";
}
