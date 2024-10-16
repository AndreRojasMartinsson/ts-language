import { cliProgram } from "../common";
import type { IFile, IOptions } from "../types";
import fs from "node:fs/promises";
import { cacheFile, CacheStore, getCacheFile, isFileCached } from "../cache";
import { compileFile } from "../../compiler";
import { getSourceFiles } from "../path-utils";

function getOptimizationLevel(options: IOptions) {
  if (options.O2) return 2;

  return 1;
}

async function handleCompileCommand(inputs: string[], options: IOptions) {
  // const { OPT_LEVEL } = EnvSchema.parse(process.env);
  let files: IFile[] = await getSourceFiles(inputs);

  if (options.force) {
    for await (const file of files) await compileFile(file);

    return;
  }

  if (options.force === false && !(await fs.exists(getCacheFile()))) {
    await Bun.write(getCacheFile(), "\x00", {
      createPath: true,
    });
  }

  files = files.filter((file) => {
    if (options.force) return true;

    if (!isFileCached(file.path)) {
      console.log(`Cache miss (${file.name}) compiling...`);
      cacheFile(file);
      return true;
    }

    console.log(`Cache hit (${file.name}) not compiling...`);

    return false;
  });

  if (files.length === 0) {
    // No changes
    console.log("No changes found. Skipping compilation...");
    process.exit(0);
  }

  if (!options.force) CacheStore.commit();

  for await (const file of files) await compileFile(file);
}

export function compileCommand() {
  cliProgram
    .command("build <inputs...>")
    .description("Builds the inputs into executables that can be ran")
    .option("-O1", "Use optimization level 1", true)
    .option("-O2", "Use optimization level 2", false)
    .option("-f, --force", "Forces files to compile, skipping caching", false)
    .action((inputs, options: IOptions) => {
      const optimizationLevel = getOptimizationLevel(options);
      process.env.SC_SKIP_CACHE = options.force;
      process.env.OPT_LEVEL = String(optimizationLevel);

      handleCompileCommand(inputs, options);
    });
}
