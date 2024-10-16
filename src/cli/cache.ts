import path from "node:path";
import { join } from "../utils/path";
import xxhash from "xxhash-wasm";
import type { IFile } from "./types";

const { h64ToString } = await xxhash();

const Decoder = new TextDecoder("utf8");

export function splitBufferAt(buf: Buffer, sep: any) {
  const parts = [];
  let start = 0;
  let nullIndex;

  while ((nullIndex = buf.indexOf(sep, start)) !== -1) {
    parts.push(buf.subarray(start, nullIndex));
    start = nullIndex + 1;
  }

  if (start < buf.length) {
    parts.push(buf.subarray(start));
  }

  return parts;
}

export function cacheFile(file: IFile) {
  const filePath = file.path;

  const fileBuf = Bun.mmap(filePath);
  const fileContent = Decoder.decode(fileBuf);

  const pathHash = h64ToString(filePath);
  const contentHash = h64ToString(fileContent);

  CacheStore.cache.set(pathHash, contentHash);
}

export function isFileCached(filePath: string) {
  const fileBuf = Bun.mmap(filePath);
  const fileContent = Decoder.decode(fileBuf);

  const pathHash = h64ToString(filePath);
  const contentHash = h64ToString(fileContent);

  const entry = CacheStore.cache.get(pathHash);

  if (!entry) return false;

  return entry === contentHash;
}

export class CacheStore {
  private static cacheMap: Map<string, string>;

  private static readCache(): Map<string, string> {
    const cacheFile = getCacheFile();
    const bytes = Bun.mmap(cacheFile);
    const buf = Buffer.from(bytes);

    if (bytes.length === 1) return new Map();

    const map = new Map<string, string>();
    const lines = splitBufferAt(buf, "|");

    for (const line of lines) {
      const [pathBuf, contentBuf] = splitBufferAt(line, " ");

      map.set(pathBuf.toString("hex"), contentBuf.toString("hex"));
    }

    return map;
  }

  public static get cache() {
    if (this.cacheMap === undefined) {
      this.cacheMap = this.readCache();
    }

    return this.cacheMap;
  }

  public static commit() {
    const cacheFilePath = getCacheFile();
    const file = Bun.file(cacheFilePath);
    const writer = file.writer({ highWaterMark: 4096 * 4096 });

    const entries = this.cache.entries();

    for (let i = 0; i < this.cache.size; i += 1) {
      const { value, done } = entries.next();
      if (!value || done) break;

      writer.write(Buffer.from(value[0], "hex"));
      writer.write(" ");
      writer.write(Buffer.from(value[1], "hex"));
      writer.write("|");
    }

    writer.end();
  }
}

export function getCacheDirectory() {
  return join(".sccache");
}

export function getCacheFile() {
  return path.join(getCacheDirectory(), ".cache");
}
