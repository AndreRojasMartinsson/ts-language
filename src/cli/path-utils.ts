import fs from "node:fs/promises";
import path from "node:path";
import { join } from "../utils/path";
import type { IFile } from "./types";
import { WORKING_DIRECTORY } from "../constants";

export enum PathType {
  FILE,
  DIRECTORY,
  UNKNOWN,
  NOT_FOUND,
}

export async function getPathType(inputPath: string) {
  const exists = await fs.exists(inputPath);
  if (!exists) return PathType.NOT_FOUND;

  const stat = await fs.stat(inputPath);
  if (stat.isFile()) return PathType.FILE;
  if (stat.isDirectory()) return PathType.DIRECTORY;

  return PathType.UNKNOWN;
}

export async function walkDirectory(dirPath: string): Promise<string[]> {
  const files = await fs.readdir(dirPath);
  const paths: string[] = [];

  for await (const file of files) {
    const type = await getPathType(path.join(dirPath, file));

    if (type === PathType.DIRECTORY) {
      const newDirPath = path.join(dirPath, file);
      paths.push(...(await walkDirectory(newDirPath)));
    } else if (type === PathType.FILE) {
      paths.push(join(dirPath, file));
    }
  }

  return paths;
}

export async function getSourceFiles(inputs: string[]): Promise<IFile[]> {
  const files: string[] = [];

  for await (const input of inputs) {
    const type = await getPathType(input);

    if (type === PathType.FILE) {
      files.push(join(input));
    } else if (type === PathType.DIRECTORY) {
      const entries = await walkDirectory(input);
      files.push(...entries);
    } else if (type === PathType.NOT_FOUND) {
      throw new Error(`Could not find file or directory '${input}'`);
    }
  }

  return files.map((filePath) => {
    const fileName = path.relative(WORKING_DIRECTORY, filePath);

    return { path: filePath, name: fileName };
  });
}
