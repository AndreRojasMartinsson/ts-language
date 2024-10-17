import type { IToken } from "chevrotain";
import type { IFile } from "../cli/types";
import { reportLexerErrors } from "./error-reporter";
import { SCLexer } from "./lexer/lexer";
import { parserInstance } from "./parser/parser";
import { ToTSVisitor } from "./semantic-analyzer/to-ts";
import { $Log } from "./utils/logger";
import type { SourceFileNode } from "./parser/nodes";
import fs from "node:fs/promises";
import { join } from "../utils/path";
import path from "node:path";
import { tmpdir } from "node:os";
import crypto from "node:crypto";
import { $, inspect } from "bun";
import chalkTemplate from "chalk-template";
import { WORKING_DIRECTORY } from "../constants";
import { IOptions } from "../cli/types.ts";

export function parseFile(
  file: IFile & { source: string },
  tokens: IToken[],
): SourceFileNode {
  parserInstance.input = { source: file.source, tokens, fileId: file.name };

  const ast = parserInstance.parse();
  if (parserInstance.hasErrors()) {
    parserInstance.emit({ name: file.name, source: file.source });
    process.exit(1);
  }

  // console.log(inspect(ast, { depth: Infinity, colors: true }));

  return ast;
}

export function linkIncludes(file: IFile & { source: string }): string {
  // const result = regex.exec(file.source);
  // if (result === null) return file.source;
  // console.log(result);

  return file.source
    .split("\n")
    .map((line) => {
      const regex = new RegExp(/^@incl\s+"([^"\\]+)"/g);

      const result = regex.exec(line);
      if (result == null) return line;

      const importPath = result[1];

      const { dir } = path.parse(file.path);

      const relPath = path.resolve(dir, importPath);

      const importSourceBuf = Bun.mmap(relPath);
      const importSource = new TextDecoder("utf-8").decode(importSourceBuf);

      return `\n${importSource}\n`;
    })
    .filter((ln) => ln !== undefined)
    .join("\n");
}

export function lexFile(file: IFile & { source: string }): IToken[] {
  SCLexer.level = "Release";

  const { tokens, errors } = SCLexer.instance.tokenize(file.source);

  if (errors.length > 0) {
    reportLexerErrors(file, errors);
    process.exit(1);
  }

  return tokens;
}

function injectSTD(generatedCode: string) {
  let code = "/* COMPILED BY SC COMPILER */";
  code += `
import __HTTP from "node:http"
import __FS from "node:fs"
import __PATH from "node:path"
import __NET from "node:net"
`;

  code += "\n";
  code += generatedCode.trimStart();

  return code;
}

export async function compileFile(file: IFile, options: IOptions) {
  const bufferSource = Bun.mmap(file.path);
  const source = new TextDecoder("utf-8").decode(bufferSource);

  $Log.$assert(source.length > 0, "Source file is empty.");

  const startTime = performance.now();

  const fileWithSource = { ...file, source };
  const newSource = linkIncludes(fileWithSource);

  const tokens = lexFile({ ...file, source: newSource });
  const ast = parseFile({ ...file, source: newSource }, tokens);
  let generatedCode: string = new ToTSVisitor().visitNode(ast);

  let newGenCode = "";

  if (parserInstance.namespacesToInject.length > 0) {
    for (const str of parserInstance.namespacesToInject) {
      newGenCode += str + "\n\n";
    }
  }

  generatedCode = newGenCode + "\n\n" + generatedCode;
  generatedCode = injectSTD(generatedCode);

  // console.log("EfH", newGenCode);

  const endTime = performance.now();
  const timeElapsed = (endTime - startTime).toFixed(2);

  await fs.mkdir(join("dist"), { recursive: true });

  const { name, ext } = path.parse(file.path);

  const tmpfileName = `out-${name}${ext}-${crypto.randomBytes(8).toString("hex")}.ts`;
  const tmpfile = path.join(tmpdir(), tmpfileName);

  await Bun.write(tmpfile, generatedCode, {
    createPath: true,
  });

  if (options.verbose) console.log(generatedCode);

  // console.log(
  //   generatedCode
  //     .split("\n")
  //     .map((ln, i) => `${i + 1}: ${ln}`)
  //     .join("\n"),
  // );

  const outFile = join("dist", `${name}.o`);
  await $`bun build --compile --minify --bytecode --sourcemap ${tmpfile} --outfile ${outFile}`;
  console.log(
    chalkTemplate`{whiteBright Compiled file} {dim '${file.name}'} {whiteBright in} {blueBright.bold ${timeElapsed}ms}`,
  );

  await fs.rm(tmpfile);

  console.log(
    chalkTemplate`{whiteBright Wrote file} {dim '${path.relative(WORKING_DIRECTORY, outFile)}'}`,
  );
}
