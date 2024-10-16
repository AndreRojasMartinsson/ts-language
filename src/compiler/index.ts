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
import { $ } from "bun";
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
      console.log(relPath);

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
namespace std {
  export function log(...text: string[]) {
    console.log(...text)
  }

  export const string = String

  export const number: any = (value?: any) => Number(value);
  number.ParseFloat = parseFloat
  number.ParseInt = parseInt
  number.IsFinite = isFinite
  number.IsNaN = isNaN


  export namespace proc {
    export const Env = process.env
    export const Cwd = process.cwd
    export const Exit = process.exit
    export const Kill = process.kill
    export const Abort = process.abort
    export const Umask = process.umask
    export const Uptime = process.uptime
    export const LoadEnvFile = process.loadEnvFile
    export const AvailableMemory = process.availableMemory
    export const Pid = process.pid
    export const Arch = process.arch
    export const Argv = process.argv
    export const Ppid = process.ppid
    export const Argv0 = process.argv0
    export const Stdin = process.stdin
    export const Title = process.title
    export const Hrtime = process.hrtime
    export const Stderr = process.stderr
    export const Stdout = process.stdout
    export const ExecPath = process.execPath
  }


  


  // export namespace number {
  //   export const self = Number  
  //   export const float = parseFloat()
  //   export const int = parseInt()
  //   export const IsFinite = isFinite
  //   export const IsNaN = isNaN
  // }

  export const arr: any = (len?: number) => new Array(len) 
  arr.int8 = Int8Array
  arr.uint8 = Uint8Array
  arr.int16 = Int8Array
  arr.uint16 = Uint16Array
  arr.int32 = Int32Array
  arr.uint32 = Uint32Array
  arr.float32 = Float32Array
  arr.float64 = Float64Array

  // export namespace arr {
  //   export const self = Array
  //   export const int8 = Int8Array
  //   export const uint8 = Uint8Array
  //   export const int16 = Int16Array
  //   export const uint16 = Uint16Array
  //   export const int32 = Int32Array
  //   export const uint32 = Uint32Array
  //
  //   export const float16 = Float16Array
  //   export const float32 = Float32Array
  //   export const float64 = Float64Array
  // }

  export namespace constants {
    export const Inf = Infinity
  }

  export namespace map {
    export const self = Map
    export const weak = WeakMap
  }

  export namespace set {
    export const self = Set
    export const weak = WeakSet
  }

  export namespace math {
    export const E: Readonly<number> = Math.E 
    export const LN10: Readonly<number> = Math.LN10 
    export const LN2: Readonly<number> = Math.LN2
    export const LOG10E: Readonly<number> = Math.LOG10E 
    export const LOG2E: Readonly<number> = Math.LOG2E
    export const PI: Readonly<number> = Math.PI
    export const SQRT1_2: Readonly<number> = Math.SQRT1_2 
    export const SQRT2: Readonly<number> = Math.SQRT2

    export const clz32 = Math.clz32
    export const imul = Math.imul
    export const sign = Math.sign
    export const log10 = Math.log10
    export const log2 = Math.log2
    export const log1p = Math.log1p
    export const expm1 = Math.expm1
    export const cosh = Math.cosh
    export const sinh = Math.sinh
    export const tanh = Math.tanh
    export const acosh = Math.acosh
    export const asinh = Math.asinh
    export const atanh = Math.atanh
    export const hypot = Math.hypot
    export const trunc = Math.trunc
    export const fround = Math.fround
    export const cbrt = Math.cbrt
    export const abs = Math.abs
    export const acos = Math.acos
    export const asin = Math.asin
    export const atan = Math.atan
    export const atan2 = Math.atan2
    export const ceil = Math.ceil
    export const cos = Math.cos
    export const exp = Math.exp
    export const floor = Math.floor
    export const log = Math.log
    export const max = Math.max
    export const min = Math.min
    export const pow = Math.pow
    export const random = Math.random
    export const round = Math.round
    export const sin = Math.sin
    export const sqrt = Math.sqrt
    export const tan = Math.tan
  }
}
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

  generatedCode = injectSTD(generatedCode);

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
