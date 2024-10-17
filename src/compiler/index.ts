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

// namespace std {
//   export function log(...text: string[]) {
//     console.log(...text)
//   }
//
//   export const string = String
//
//   export const number: any = (value?: any) => Number(value);
//   number.parse_float = parseFloat
//   number.parse_int = parseInt
//   number.is_finite = isFinite
//   number.is_nan = isNaN
//
//   export namespace fs {
//     export const read_dir = __FS.readDirSync
//     export const append_file = __FS.appendFileSync
//     export const chown = __FS.chownSync
//     export const close = __FS.closeSync
//     export const copy_file = __FS.copyFileSync
//     export const cp = __FS.cpSync
//     export const read_stream = __FS.createReadStream
//     export const write_stream = __FS.createWriteStream
//     export const exists = __FS.existsSync
//     export const glob = __FS.globSync
//     export const mkdir = __FS.mkdirSync
//     export const mkdtemp = __FS.mkdtempSync
//     export const read_file = __FS.readFileSync
//     export const write_file = __FS.writeFileSync
//     export const rename = __FS.renameSync
//     export const rm_dir = __FS.rmdirSync
//     export const rm = __FS.rmSync
//     export const stat = __FS.statSync
//   }
//
//   export namespace path {
//     export const join = __PATH.join
//     export const resolve = __PATH.resolve
//     export const parse = __PATH.parse
//     export const relative = __PATH.relative
//   }
//
//   // export const fs = __FS
//
//
//   export namespace proc {
//     export const env = process.env
//     export const cwd = process.cwd
//     export const exit = process.exit
//     export const kill = process.kill
//     export const abort = process.abort
//     export const umask = process.umask
//     export const uptime = process.uptime
//     export const load_env_file = process.loadEnvFile
//     export const available_memory = process.availableMemory
//     export const pid = process.pid
//     export const arch = process.arch
//     export const argv = process.argv
//     export const ppid = process.ppid
//     export const argv0 = process.argv0
//     export const stdin = process.stdin
//     export const title = process.title
//     export const exit_code = process.exitCode
//     export const hrtime = process.hrtime
//     export const stderr = process.stderr
//     export const stdout = process.stdout
//     export const exec_path = process.execPath
//   }
//
//   export namespace server {
//     export function http(callback: (req: any, res: any) => void) {
//       return __HTTP.createServer((req, res) => {
//         res.End = res.end
//         return callback(req, res)
//       })
//     }
//
//     export function net() {
//       return __NET.createServer()
//     }
//   }
//
//
//
//   // export namespace number {
//   //   export const self = Number  
//   //   export const float = parseFloat()
//   //   export const int = parseInt()
//   //   export const IsFinite = isFinite
//   //   export const IsNaN = isNaN
//   // }
//
//   export const array: any = (len?: number) => new Array(len) 
//   array.int8 = Int8Array
//   array.uint8 = Uint8Array
//   array.int16 = Int8Array
//   array.uint16 = Uint16Array
//   array.int32 = Int32Array
//   array.uint32 = Uint32Array
//   array.float32 = Float32Array
//   array.float64 = Float64Array
//
//   // export namespace arr {
//   //   export const self = Array
//   //   export const int8 = Int8Array
//   //   export const uint8 = Uint8Array
//   //   export const int16 = Int16Array
//   //   export const uint16 = Uint16Array
//   //   export const int32 = Int32Array
//   //   export const uint32 = Uint32Array
//   //
//   //   export const float16 = Float16Array
//   //   export const float32 = Float32Array
//   //   export const float64 = Float64Array
//   // }
//
//   export namespace constants {
//     export const INF = Infinity
//   }
//
//   export namespace map {
//     export const create = () => new Map()
//
//     export const weak = {
//       create: () => new WeakMap()
//     }
//   }
//
//   export namespace set {
//     export const create = () => new Set()
//
//     export const weak = {
//       create: () => new WeakSet()
//     }
//   }
//
//   export namespace math {
//     export const E: Readonly<number> = Math.E 
//     export const LN10: Readonly<number> = Math.LN10 
//     export const LN2: Readonly<number> = Math.LN2
//     export const LOG10E: Readonly<number> = Math.LOG10E 
//     export const LOG2E: Readonly<number> = Math.LOG2E
//     export const PI: Readonly<number> = Math.PI
//     export const SQRT1_2: Readonly<number> = Math.SQRT1_2 
//     export const SQRT2: Readonly<number> = Math.SQRT2
//
//     export const imul = Math.imul
//     export const sign = Math.sign
//     export const log10 = Math.log10
//     export const log2 = Math.log2
//     export const log1p = Math.log1p
//     export const expm1 = Math.expm1
//     export const cosh = Math.cosh
//     export const sinh = Math.sinh
//     export const tanh = Math.tanh
//     export const acosh = Math.acosh
//     export const asinh = Math.asinh
//     export const atanh = Math.atanh
//     export const hypot = Math.hypot
//     export const trunc = Math.trunc
//     export const fround = Math.fround
//     export const cbrt = Math.cbrt
//     export const abs = Math.abs
//     export const acos = Math.acos
//     export const asin = Math.asin
//     export const atan = Math.atan
//     export const atan2 = Math.atan2
//     export const ceil = Math.ceil
//     export const cos = Math.cos
//     export const exp = Math.exp
//     export const floor = Math.floor
//     export const log = Math.log
//     export const max = Math.max
//     export const min = Math.min
//     export const pow = Math.pow
//     export const random = Math.random
//     export const round = Math.round
//     export const sin = Math.sin
//     export const sqrt = Math.sqrt
//     export const tan = Math.tan
//   }
// }
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

  generatedCode = injectSTD(generatedCode);
  generatedCode = newGenCode + "\n\n" + generatedCode;

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
