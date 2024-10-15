import type { Command } from 'commander';
import type { ICommand, IOptions } from '../utils/command-file';
import path from 'node:path';
import fs from 'node:fs/promises';
import { $Log, LEVEL } from '../../compiler/utils/logger';
import { compileSourceFile } from '../../compiler';
import { SCLexer } from '../../compiler/lexer/lexer';
import { SemanticAnalyzer } from '../../compiler/semantic-analyzer';
import { parserInstance } from '../../compiler/parser/parser';

import XXHash from "xxhash-wasm"

const CACHE_DIR = path.resolve(process.cwd(), ".sc-cache")

async function compileFile(filePath: string) {
  {
    const stat = await fs.stat(filePath);
    $Log.$assert(stat.isFile(), 'Item must be a file.');
  }

  try {
    return await compileSourceFile(filePath);
  } catch (err) {
    return $Log.$err(`COMPILEFILE`, err);
  }
}

async function compile(inputPath: string) {
  $Log.$assert(await fs.exists(inputPath), 'File/Directory does not exist.');

  const stat = await fs.stat(inputPath);

  $Log.$assert(
    !stat.isDirectory() || !stat.isFile(),
    'Item must be a file or a directory.',
  );

  if (stat.isFile()) {
    return compileFile(inputPath)
  }

  const files = await fs.readdir(inputPath, { recursive: true });

  for (const file of files) {
    const filePath = path.resolve(inputPath, file);
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) continue;

    $Log.$assert(stat.isFile(), 'Item must be a file.');

    compileFile(filePath);
  }
}

export default {
  name: 'compile',
  args: '<input-path>',
  description: 'Takes in an input path to a file or a directory and compiles it',
  context: (builder: Command) =>
    builder
      .action(async (inputPath: string, options: IOptions) => {
        $Log.$assert(
          options.verbose !== undefined,
          'Compile options have no verbosity option.',
        );
        $Log.$assert(
          options.quiet !== undefined,
          'Compile options have no quiet option.',
        );

        $Log.$assert(options.O1 !== undefined, 'Compile options have no O1 option.');
        $Log.$assert(options.O2 !== undefined, 'Compile options have no O2 option.');

        $Log.$assert(
          options.O1 !== true || options.O2 !== true,
          'O1 and O2 compile option cannot be used at same time.',
        );

        if (options.O1 === false && options.O2 === false) options.O1 = true;

        await fs.mkdir(path.join(CACHE_DIR), { recursive: true })

        let cacheHit = false

        const cacheFile = await fs.exists(path.join(CACHE_DIR, `cache.bin`))
        if (cacheFile) {
          const cache = Bun.file(path.join(CACHE_DIR, "cache.bin"));
          const buf = await cache.bytes()
          let parts = []
          let currentPart = []

          for (const byte of buf) {
            if (byte === 0) {
              if (currentPart.length > 0) {
                parts.push(new Uint8Array(currentPart));
                currentPart = []
              }
            } else {
              currentPart.push(byte)
            }
          }

          if (currentPart.length > 0) {
            parts.push(new Uint8Array(currentPart))
          }


          const writer = cache.writer();
          const hasher = await XXHash()
          const fileNameHash = hasher.h64ToString(path.resolve(inputPath))

          const content = Bun.mmap(path.resolve(inputPath))
          const text = new TextDecoder("utf8").decode(content)

          if (parts.length === 0) {
            writer.write(Buffer.from(fileNameHash + "\x00", "utf-8"))
            writer.write(Buffer.from(hasher.h64ToString(text), "utf-8"))
            writer.write(Buffer.from("\x00", "utf8"))
            writer.end()

          } else {
            const files = new Map<string, string>();
            for (let i = 0; i < parts.length; i += 2) {
              const nameHash = parts[i]
              const contentHash = parts[i + 1]

              const decoder = new TextDecoder()
              if (decoder.decode(nameHash) === fileNameHash && decoder.decode(contentHash) == hasher.h64ToString(text)) {

                $Log.$info("COMPILE", `not compiling file '${path.relative(process.cwd(), inputPath)}', cache hit.`)

                cacheHit = true
                break
              }
            }

          }
        } else {

          Bun.write(path.join(CACHE_DIR, "cache.bin"), Buffer.from("").toString("binary"), { createPath: true })
        }


        SCLexer.level = options.O1 ? 'Debug' : 'Release';
        parserInstance.level = options.O1 ? 'Debug' : 'Release';
        SemanticAnalyzer.level = options.O1 ? 'Debug' : 'Release';

        if (options.verbose) $Log.$level(LEVEL.DEBUG);
        if (options.quiet) $Log.$level(LEVEL.ERR);

        if (cacheHit) return

        return compile(inputPath);
      })
      .option('-O1', 'Make the compiler compile with the debug level', false)
      .option('-O2', 'Make the compiler compile with the release level', false)
      .option('-v, --verbose', 'Make compiler emit verbose logs.', false)
      .option('-q, --quiet', 'Make compiler only emit error logs.', false),
} satisfies ICommand;
