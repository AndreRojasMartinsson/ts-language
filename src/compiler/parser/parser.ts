import { type IToken, type TokenType } from "chevrotain";
import { Range } from "../lib/range";
import { Token } from "../lexer/tokens";
import { tokenStructuredMatcher } from "./token-matcher";
import { getPrecedence, isRightAssociative } from "./precedence";
import {
  ArgumentListNode,
  ArgumentNode,
  ArrayLiteralNode,
  ArrayMemberNode,
  ArrayMembersNode,
  AssignmentExpressionNode,
  ASTNode,
  BinaryExpressionNode,
  BlockNode,
  CallExpressionNode,
  DataTypeNode,
  DirectiveNode,
  ExpressionNode,
  FnDeclarationNode,
  ForStatementNode,
  IdentifierNode,
  IfStatementNode,
  IncludeDirectiveNode,
  LiteralNode,
  MemberExpressionNode,
  ParameterListNode,
  ParameterNode,
  PostfixExpressionNode,
  PrefixExpressionNode,
  PubDirectiveNode,
  ReturnStatementNode,
  SourceFileNode,
  UnaryExpressionNode,
  VariableDeclarationNode,
  WhileStatementNode,
} from "./nodes";
import { BaseParser } from ".";
import { SymbolTable } from "../lib/symbol-table";
import { log } from "console";

const SYMBOLS = {
  ["std"]: [
    "std:log",
    "std:string",
    "std:number",
    "std:number:parse_float",
    "std:number:parse_int",
    "std:number:is_finite",
    "std:number:is_nan",
    "std:path:join",
    "std:path:resolve",
    "std:path:parse",
    "std:path:relative",
    "std:fs:read_dir",
    "std:fs:append_file",
    "std:fs:chown",
    "std:fs:close",
    "std:fs:copy_file",
    "std:fs:cp",
    "std:fs:read_stream",
    "std:fs:write_stream",
    "std:fs:exists",
    "std:fs:glob",
    "std:fs:mkdir",
    "std:fs:mkdtemp",
    "std:fs:read_file",
    "std:fs:write_file",
    "std:fs:rename",
    "std:fs:rm_dir",
    "std:fs:rm",
    "std:fs:stat",
    "std:proc:env",
    "std:proc:cwd",
    "std:proc:exit",
    "std:proc:kill",
    "std:proc:abort",
    "std:proc:umask",
    "std:proc:uptime",
    "std:proc:load_env_file",
    "std:proc:available_memory",
    "std:proc:pid",
    "std:proc:arch",
    "std:proc:argv",
    "std:proc:ppid",
    "std:proc:argv0",
    "std:proc:stdin",
    "std:proc:title",
    "std:proc:exit_code",
    "std:proc:hrtime",
    "std:proc:stderr",
    "std:proc:stdout",
    "std:proc:exec_path",
    "std:server:http",
    "std:server:net",
    "std:array",
    "std:array:int8",
    "std:array:uint8",
    "std:array:int16",
    "std:array:uint16",
    "std:array:int32",
    "std:array:uint32",
    "std:array:float32",
    "std:array:float64",
    "std:constants::INF",
    "std:map:create",
    "std:map:weak:create",
    "std:set:create",
    "std:set:weak:create",
    "std:math:E",
    "std:math:LN10",
    "std:math:LN2",
    "std:math:LOG10E",
    "std:math:LOG2E",
    "std:math:PI",
    "std:math:SQRT1_2",
    "std:math:SQRT2",
    "std:math:imul",
    "std:math:sign",
    "std:math:log10",
    "std:math:log2",
    "std:math:log1p",
    "std:math:expm1",
    "std:math:cosh",
    "std:math:sinh",
    "std:math:tanh",
    "std:math:acosh",
    "std:math:asinh",
    "std:math:atanh",
    "std:math:hypot",
    "std:math:trunc",
    "std:math:fround",
    "std:math:cbrt",
    "std:math:abs",
    "std:math:acos",
    "std:math:asin",
    "std:math:atan",
    "std:math:atan2",
    "std:math:ceil",
    "std:math:cos",
    "std:math:exp",
    "std:math:floor",
    "std:math:log",
    "std:math:max",
    "std:math:min",
    "std:math:pow",
    "std:math:random",
    "std:math:round",
    "std:math:sin",
    "std:math:sqrt",
    "std:math:tan",
  ],
  ["std/log"]: ["log"],
  ["std/number"]: [
    "number",
    "number:parse_float",
    "number:parse_int",
    "number:is_finite",
    "number:is_nan",
  ],
  ["std/string"]: ["string"],
  ["std/path"]: ["path:join", "path:resolve", "path:parse", "path:relative"],
  ["std/fs"]: [
    "fs:read_dir",
    "fs:append_file",
    "fs:chown",
    "fs:close",
    "fs:copy_file",
    "fs:cp",
    "fs:read_stream",
    "fs:write_stream",
    "fs:exists",
    "fs:glob",
    "fs:mkdir",
    "fs:mkdtemp",
    "fs:read_file",
    "fs:write_file",
    "fs:rename",
    "fs:rm_dir",
    "fs:rm",
    "fs:stat",
  ],
  ["std/proc"]: [
    "proc:env",
    "proc:cwd",
    "proc:exit",
    "proc:kill",
    "proc:abort",
    "proc:umask",
    "proc:uptime",
    "proc:load_env_file",
    "proc:available_memory",
    "proc:pid",
    "proc:arch",
    "proc:argv",
    "proc:ppid",
    "proc:argv0",
    "proc:stdin",
    "proc:title",
    "proc:exit_code",
    "proc:hrtime",
    "proc:stderr",
    "proc:stdout",
    "proc:exec_path",
  ],
  ["std/server"]: ["server:http", "server:net"],
  ["std/array"]: [
    "array:int8",
    "array:uint8",
    "array:int16",
    "array:uint16",
    "array:int32",
    "array:uint32",
    "array:float32",
    "array:float64",
  ],
  ["std/constants"]: ["constants:INF"],
  ["std/map"]: ["map:create", "map:weak:create"],
  ["std/set"]: ["set:create", "set:weak:create"],
  ["std/math"]: [
    "math:E",
    "math:LN10",
    "math:LN2",
    "math:LOG10E",
    "math:LOG2E",
    "math:PI",
    "math:SQRT1_2",
    "math:SQRT2",
    "math:imul",
    "math:sign",
    "math:log10",
    "math:log2",
    "math:log1p",
    "math:expm1",
    "math:cosh",
    "math:sinh",
    "math:tanh",
    "math:acosh",
    "math:asinh",
    "math:atanh",
    "math:hypot",
    "math:trunc",
    "math:fround",
    "math:cbrt",
    "math:abs",
    "math:acos",
    "math:asin",
    "math:atan",
    "math:atan2",
    "math:ceil",
    "math:cos",
    "math:exp",
    "math:floor",
    "math:log",
    "math:max",
    "math:min",
    "math:pow",
    "math:random",
    "math:round",
    "math:sin",
    "math:sqrt",
    "math:tan",
  ],
};

const STD_NAMESPACES = {
  ["std/log"]: `
  export function log(...text: string[]) {
    console.log(...text)
  }

`,
  ["std/number"]: `

  export const number: any = (value?: any) => Number(value);
  number.parse_float = parseFloat
  number.parse_int = parseInt
  number.is_finite = isFinite
  number.is_nan = isNaN
`,
  ["std/string"]: `

  export const string = String
`,

  ["std/fs"]: `
  export namespace fs {
    export const read_dir = __FS.readDirSync
    export const append_file = __FS.appendFileSync
    export const chown = __FS.chownSync
    export const close = __FS.closeSync
    export const copy_file = __FS.copyFileSync
    export const cp = __FS.cpSync
    export const read_stream = __FS.createReadStream
    export const write_stream = __FS.createWriteStream
    export const exists = __FS.existsSync
    export const glob = __FS.globSync
    export const mkdir = __FS.mkdirSync
    export const mkdtemp = __FS.mkdtempSync
    export const read_file = __FS.readFileSync
    export const write_file = __FS.writeFileSync
    export const rename = __FS.renameSync
    export const rm_dir = __FS.rmdirSync
    export const rm = __FS.rmSync
    export const stat = __FS.statSync
  }
`,
  ["std/path"]: `
  export namespace path {
    export const join = __PATH.join
    export const resolve = __PATH.resolve
    export const parse = __PATH.parse
    export const relative = __PATH.relative
  }


`,
  ["std/proc"]: `
  export namespace proc {
    export const env = process.env
    export const cwd = process.cwd
    export const exit = process.exit
    export const kill = process.kill
    export const abort = process.abort
    export const umask = process.umask
    export const uptime = process.uptime
    export const load_env_file = process.loadEnvFile
    export const available_memory = process.availableMemory
    export const pid = process.pid
    export const arch = process.arch
    export const argv = process.argv
    export const ppid = process.ppid
    export const argv0 = process.argv0
    export const stdin = process.stdin
    export const title = process.title
    export const exit_code = process.exitCode
    export const hrtime = process.hrtime
    export const stderr = process.stderr
    export const stdout = process.stdout
    export const exec_path = process.execPath
  }

`,
  ["std/server"]: `
  export namespace server {
    export function http(callback: (req: any, res: any) => void) {
      return __HTTP.createServer((req, res) => {
        res.End = res.end
        return callback(req, res)
      })
    }
    
    export function net() {
      return __NET.createServer()
    }
  }
`,
  ["std/constants"]: `
  export namespace constants {
    export const INF = Infinity
  }
`,
  ["std/map"]: `
  export namespace map {
    export const create = () => new Map()

    export const weak = {
      create: () => new WeakMap()
    }
  }

 `,
  ["std/set"]: `
 export namespace set {
    export const create = () => new Set()
    
    export const weak = {
      create: () => new WeakSet()
    }
  }

 
`,
  ["std/math"]: `
 export namespace math {
    export const E: Readonly<number> = Math.E 
    export const LN10: Readonly<number> = Math.LN10 
    export const LN2: Readonly<number> = Math.LN2
    export const LOG10E: Readonly<number> = Math.LOG10E 
    export const LOG2E: Readonly<number> = Math.LOG2E
    export const PI: Readonly<number> = Math.PI
    export const SQRT1_2: Readonly<number> = Math.SQRT1_2 
    export const SQRT2: Readonly<number> = Math.SQRT2

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
`,
  ["std"]: `
  export namespace std {
  export function log(...text: string[]) {
    console.log(...text)
  }

  export const string = String

  export const number: any = (value?: any) => Number(value);
  number.parse_float = parseFloat
  number.parse_int = parseInt
  number.is_finite = isFinite
  number.is_nan = isNaN

  export namespace fs {
    export const read_dir = __FS.readDirSync
    export const append_file = __FS.appendFileSync
    export const chown = __FS.chownSync
    export const close = __FS.closeSync
    export const copy_file = __FS.copyFileSync
    export const cp = __FS.cpSync
    export const read_stream = __FS.createReadStream
    export const write_stream = __FS.createWriteStream
    export const exists = __FS.existsSync
    export const glob = __FS.globSync
    export const mkdir = __FS.mkdirSync
    export const mkdtemp = __FS.mkdtempSync
    export const read_file = __FS.readFileSync
    export const write_file = __FS.writeFileSync
    export const rename = __FS.renameSync
    export const rm_dir = __FS.rmdirSync
    export const rm = __FS.rmSync
    export const stat = __FS.statSync
  }

  export namespace path {
    export const join = __PATH.join
    export const resolve = __PATH.resolve
    export const parse = __PATH.parse
    export const relative = __PATH.relative
  }

  // export const fs = __FS


  export namespace proc {
    export const env = process.env
    export const cwd = process.cwd
    export const exit = process.exit
    export const kill = process.kill
    export const abort = process.abort
    export const umask = process.umask
    export const uptime = process.uptime
    export const load_env_file = process.loadEnvFile
    export const available_memory = process.availableMemory
    export const pid = process.pid
    export const arch = process.arch
    export const argv = process.argv
    export const ppid = process.ppid
    export const argv0 = process.argv0
    export const stdin = process.stdin
    export const title = process.title
    export const exit_code = process.exitCode
    export const hrtime = process.hrtime
    export const stderr = process.stderr
    export const stdout = process.stdout
    export const exec_path = process.execPath
  }
  
  export namespace server {
    export function http(callback: (req: any, res: any) => void) {
      return __HTTP.createServer((req, res) => {
        res.End = res.end
        return callback(req, res)
      })
    }
    
    export function net() {
      return __NET.createServer()
    }
  }
  


  // export namespace number {
  //   export const self = Number  
  //   export const float = parseFloat()
  //   export const int = parseInt()
  //   export const IsFinite = isFinite
  //   export const IsNaN = isNaN
  // }

  export const array: any = (len?: number) => new Array(len) 
  array.int8 = Int8Array
  array.uint8 = Uint8Array
  array.int16 = Int8Array
  array.uint16 = Uint16Array
  array.int32 = Int32Array
  array.uint32 = Uint32Array
  array.float32 = Float32Array
  array.float64 = Float64Array

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
    export const INF = Infinity
  }

  export namespace map {
    export const create = () => new Map()

    export const weak = {
      create: () => new WeakMap()
    }
  }

  export namespace set {
    export const create = () => new Set()
    
    export const weak = {
      create: () => new WeakSet()
    }
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
`,
};

class SCParser extends BaseParser {
  private symbols: SymbolTable[] = [];
  public namespacesToInject: string[] = [];

  private static RESERVED_KEYWORDS: string[] = [
    "pub",
    "while",
    "if",
    "else",
    "fn",
    "end",
    "do",
    "float",
    "uint",
    "int",
    "bool",
    "str",
    "return",
    "mut",
  ];

  constructor() {
    super();
  }

  public set input(data: { source: string; tokens: IToken[]; fileId: string }) {
    super.input = data;
    this.symbols = [new SymbolTable()];
    this.namespacesToInject = [];
  }

  public override parse(): SourceFileNode {
    const body: (FnDeclarationNode | DirectiveNode)[] = [];
    const lastTok = this.stream.last();

    // for (const str of FULL_STD_SYMBOLS) {
    //   this.scope().insert(str, {
    //     kind: "std",
    //   });
    // }

    // const tble: any[] = [];
    // let ptr = 0;

    // const traverse = (node) => {
    //   // ptr++;
    //   tble[ptr] ??= [];
    //
    //   for (const [key, value] of Object.entries(node)) {
    //     if ("properties" in value) {
    //       // lfg
    //       for (const prop of value.properties) {
    //         tble[ptr].push(key + ":" + prop);
    //       }
    //     }
    //
    //     for (const [prop, val] of Object.entries(value)) {
    //       if (prop === "properties") continue;
    //
    //       ptr++;
    //       tble[ptr] ??= [];
    //       tble[ptr].push(key);
    //       traverse({ [prop]: val });
    //     }
    //   }
    //
    //   if ("properties" in node) {
    //     // lfg
    //   }
    // };
    //
    // traverse(STD_SYMS);
    // console.log(tble);

    // console.log(this.stream.current());

    while (!this.stream.atEndOfStream()) {
      // const lookahead_1 = this.stream.peek();
      //
      // if (
      //   this.stream.match(Token.Identifier, Token.DataType) &&
      //   this.tokMatch(lookahead_1, Token.LBracket)
      // ) {
      //   body.push(this.parseFnDeclaration());
      // }

      // if (
      //   this.stream.match(Token.Identifier, Token.DataType) &&
      //   this.tokMatch(lookahead_1, Token.Colon)
      // ) {
      //   body.push(this.parseFnDeclaration());
      // }

      // if (this.stream.match(Token.At)) {
      //   body.push(this.parseDirective());
      // }

      if (this.stream.match(Token.DataType)) {
        body.push(this.parseFnDeclaration());
        continue;
      }

      if (this.stream.match(Token.At)) {
        body.push(this.parseDirective());
        continue;
      }
      //
      // if (this.stream.match(Token.DataType, Token.Identifier)) {
      //   body.push(this.parseFnDeclaration());
      // } else if (this.stream.match(Token.At)) {
      //   body.push(this.parseDirective());
      // }

      // console.log(this.stream.current());
    }

    return new SourceFileNode(
      body,
      this.symbols[0],
      new Range(0, lastTok.endOffset! + 1),
    );
  }

  private parseDirective(): DirectiveNode {
    const tok = this.stream.consume(Token.At);

    const ident = this.stream.consume(Token.Identifier);

    switch (ident.image) {
      case "incl":
        return this.parseIncludeDirective(tok);
      case "pub":
        return this.parsePubDirective();
      default:
        throw new Error(`Unexpected directive '${ident.image}'`);
    }
  }

  private parsePubDirective(): PubDirectiveNode {
    const ident = this.parseIdentifier();

    return new PubDirectiveNode(ident, ident.span);
  }

  private parseIncludeDirective(at: IToken): IncludeDirectiveNode {
    const identifiers: any[] = [];

    if (this.stream.match(Token.StringLiteral)) {
      const literal = this.stream.consume(Token.StringLiteral);
      return new IncludeDirectiveNode(
        this.parseLiteral(literal),
        new Range(at.startOffset, literal.endOffset! + 1),
      );
    }

    while (
      this.stream.match(
        Token.RBrace,
        Token.LBrace,
        Token.Identifier,
        Token.Divide,
      )
    ) {
      if (this.stream.match(Token.LBrace)) break;

      identifiers.push(this.stream.consume(Token.Identifier));
      if (this.stream.match(Token.Divide)) {
        this.stream.consume(Token.Divide);
      }

      if (this.stream.match(Token.LBrace)) break;
    }

    const fullPath = identifiers.map((ident) => ident.image);

    const pth = fullPath.join("/");

    const namespaceStr = STD_NAMESPACES[pth];

    if (namespaceStr) {
      this.namespacesToInject.push(namespaceStr);
    }

    const symbols = SYMBOLS[pth];
    if (symbols) {
      for (const symbol of symbols) {
        this.scope().insert(symbol, { kind: "import" });
      }
    }

    //
    // let entries: any[] = [];
    //
    // for (const [key, value] of Object.entries(STD_SYMS.std)) {
    //   if (key === "properties") continue;
    //
    //   console.log(key, value);
    // }
    //
    // console.log(fullPath, subPath, name);

    //console.log(fullPath, subPath, name);

    // const _path = fullPath.join(":");
    //
    // const arr = FULL_STD_SYMBOLS.filter((sym) => sym.includes(_path));
    //
    // console.log(arr);
    //
    // for (const str of arr) {
    //   this.scope().insert(str, {
    //     kind: "std",
    //   });
    // }
    //
    // if (this.symbols[0].lookup(name)) {
    //   const lastIdent = identifiers.at(-1)!;
    //   const data = this.symbols[0].get(name, "loc")!;
    //
    //   this.raiseDuplicateVariableError(
    //     name,
    //     data,
    //     new Range(lastIdent.startOffset, lastIdent.endOffset! + 1),
    //     "import",
    //   );
    // }

    const lastIdent = identifiers.at(-1)!;
    //this.symbols[0].insert(name, {
    //  kind: "import",
    //  loc: new Range(lastIdent.startOffset, lastIdent.endOffset! + 1),
    //  path: subPath,
    //});

    //this.symbols[0].insert(fullPath.join(":"), {
    //  kind: "import",
    //  loc: new Range(identifiers[0].startOffset, lastIdent.endOffset! + 1),
    //});

    let currentNode: any = this.parseIdentifier(identifiers[0]);

    for (let i = 1; i < identifiers.length; ++i) {
      currentNode = {
        kind: "ImportPath",
        ref: currentNode,
        importees: this.parseIdentifier(identifiers[i]),
      };
    }

    const startOffset = identifiers[0].startOffset;
    const endOffset =
      identifiers.at(-1)!.endOffset ?? this.stream.current().endOffset!;

    if (this.stream.match(Token.LBrace)) {
      const group = this.parseIncludeGroup({
        path: fullPath.join(":"),
        start: startOffset,
      });
      this.stream.consume(Token.RBrace);

      return new IncludeDirectiveNode(
        currentNode,
        new Range(startOffset, endOffset + 1),
        group,
      );
    }

    return new IncludeDirectiveNode(
      currentNode,
      new Range(startOffset, endOffset + 1),
    );
  }

  private parseIncludeGroup(data: {
    path: string;
    start: number;
  }): ExpressionNode[] {
    this.stream.consume(Token.LBrace);

    const elements = [];

    while (!this.stream.match(Token.RBrace)) {
      elements.push(this.parseIdentifier());
      if (this.stream.match(Token.Comma)) {
        this.stream.consume(Token.Comma);
      }
    }
    for (const element of elements) {
      this.symbols[0].insert(element.image, {
        kind: "import",
        loc: element.span,
      });

      if (data) {
        this.symbols[0].insert(`${data.path}:${element.image}`, {
          kind: "import",
          loc: new Range(data.start, element.span.end),
        });
      }
    }

    return elements;
  }

  private parseFnDeclaration(): FnDeclarationNode {
    let returnType;
    let ident;
    let parameters;
    let body;

    returnType = this.parseDataType();

    // returnType = this.stream.consume(Token.DataType, Token.Identifier);

    this.stream.consumeSeq([Token.Colon, Token.FnKw]);
    ident = this.stream.consume(Token.Identifier);

    if (this.scope().lookup(ident.image, true)) {
      const data = this.scope().get(ident.image, "loc");

      this.raiseDuplicateVariableError(
        ident.image,
        data,
        new Range(ident.startOffset, ident.endOffset! + 1),
        "function",
      );
    }

    this.scope().insert(ident.image, {
      kind: "Function",
      returnType: returnType.image,
      loc: new Range(ident.startOffset, ident.endOffset! + 1),
    });

    this.stream.consume(Token.LParen);

    this.pushScope();

    parameters = this.parseParameterList();

    this.stream.consume(Token.DoKw);

    body = this.parseBlock();

    body.symbols = this.popScope();

    this.stream.consume(Token.EndKw);
    return new FnDeclarationNode(
      this.parseDataType(returnType),
      this.parseIdentifier(ident),
      parameters,
      body,
      new Range(returnType.startOffset, body.span.end),
    );
  }

  private parseBlock(): BlockNode {
    const startTok = this.stream.current();

    const body = [];

    while (!this.stream.match(Token.EndKw, Token.ElseKw, Token.ElseIfKw)) {
      const lookahead_1 = this.stream.peek();
      const lookahead_2 = this.stream.peek(1);
      const lookahead_3 = this.stream.peek(2);
      // console.log(
      //   "Eh",
      //   this.stream.current(),
      //   this.stream.peek(),
      //   this.stream.peek(1),
      // );

      if (
        this.stream.match(Token.Identifier) &&
        this.tokMatch(lookahead_1, Token.Colon) &&
        this.tokMatch(lookahead_2, Token.MutKw, Token.Identifier) &&
        !this.tokMatch(lookahead_3, Token.Colon, Token.LParen, Token.LBracket)
      ) {
        body.push(this.parseVariableDeclaration());
      }

      if (this.stream.match(Token.Identifier, Token.PrefixOperator)) {
        body.push(this.parseExpression());
      }

      if (this.stream.match(Token.DataType)) {
        body.push(this.parseVariableDeclaration());
      }
      if (this.stream.match(Token.ReturnKw))
        body.push(this.parseReturnStatement());
      if (this.stream.match(Token.WhileKw))
        body.push(this.parseWhileStatement());
      // if (this.stream.match(Token.DataType))
      // body.push(this.parseVariableDeclaration());
      if (this.stream.match(Token.ForKw)) body.push(this.parseForStatement());
      if (this.stream.match(Token.IfKw)) body.push(this.parseIfStatement());
      if (this.stream.match(Token.ElseKw)) break;
      if (this.stream.match(Token.DoKw)) {
        this.stream.consume(Token.DoKw);

        this.pushScope();

        const block = this.parseBlock();

        this.stream.consume(Token.EndKw);

        block.symbols = this.popScope();
        body.push(body);
      }
    }

    return new BlockNode(
      body,
      undefined as any,
      this.getTokenSpanRange(startTok, startTok),
    );
  }

  private parseForStatement() {
    const startTok = this.stream.consume(Token.ForKw);
    this.stream.consume(Token.Colon);

    const startExpr = this.parseExpression();
    this.stream.consume(Token.Comma);

    const conditionExpr = this.parseExpression();
    this.stream.consume(Token.Comma);

    const operationExpr = this.parseExpression();
    this.stream.consume(Token.DoKw);

    const body: any = this.parseBlock();

    this.stream.consume(Token.EndKw);

    return new ForStatementNode(
      startExpr,
      conditionExpr,
      operationExpr,
      body,
      new Range(startTok.startOffset, body.span.end),
    );
  }

  private parseVariableDeclaration(): VariableDeclarationNode {
    const dataType = this.parseDataType();
    let ident;
    let mutable = false;
    let expr;

    this.stream.consume(Token.Colon);
    if (this.stream.match(Token.MutKw)) {
      mutable = true;
      this.stream.consume(Token.MutKw);
    }

    ident = this.stream.consume(Token.Identifier);

    if (SCParser.RESERVED_KEYWORDS.includes(ident.image)) {
      this.raiseUseOfReservedKeywordsError([
        {
          rangeStart: ident.startOffset,
          rangeEnd: ident.endOffset! + 1,
          style: "primary",
          fileId: this.fileId,
          message: `keyword used here`,
        },
      ]);
    }

    if (this.scope().lookup(ident.image, false)) {
      const data = this.scope().get(ident.image, "loc");

      // this.raiseDuplicateVariableError(
      //   ident.image,
      //   data,
      //   new Range(ident.startOffset, ident.endOffset! + 1),
      //   "variable",
      // );
    }

    this.scope().insert(ident.image, {
      kind: "Variable",
      type: dataType.image,
      mutable,
      loc: new Range(ident.startOffset, ident.endOffset! + 1),
    });

    if (this.stream.match(Token.Assign)) {
      this.stream.consume(Token.Assign);
      expr = this.parseExpression();
      this.scope().set(ident.image, "uninitialized", false);
      this.scope().set(ident.image, "value", expr);
    }

    if (expr === undefined) {
      this.scope().set(ident.image, "uninitialized", true);
    }

    const endOffset = expr ? expr.span.end : ident.endOffset! + 1;

    return new VariableDeclarationNode(
      mutable,
      // this.parseDataType(dataType),
      dataType,
      this.parseIdentifier(ident),
      expr === undefined,
      new Range(dataType.span.start, endOffset),
      expr,
    );
  }

  private parseWhileStatement(): WhileStatementNode {
    const startTok = this.stream.consume(Token.WhileKw);
    this.stream.consume(Token.Colon);

    const expr = this.parseExpression();

    this.stream.consume(Token.DoKw);

    const body: any = this.parseBlock();

    this.stream.consume(Token.EndKw);

    return new WhileStatementNode(
      expr,
      body,
      new Range(startTok.startOffset, body.span.end),
    );
  }

  private parseIfStatement(): IfStatementNode {
    const startTok = this.stream.consume(Token.IfKw);
    this.stream.consume(Token.Colon);

    const expr = this.parseExpression();
    this.stream.consume(Token.DoKw);

    const block: any = this.parseBlock();

    if (this.stream.match(Token.ElseKw)) {
      this.stream.consume(Token.ElseKw);

      if (this.stream.match(Token.Colon)) {
        this.stream.consume(Token.Colon);
        // this.stream.consumeSeq([Token.Colon, Token.DoKw]);

        const alternateBlock = this.parseBlock();

        this.stream.consume(Token.EndKw);

        // TODO: FIX SPAN
        return new IfStatementNode(expr, block, alternateBlock, block.span);
      }

      if (this.stream.match(Token.IfKw)) {
        const alternate = this.parseIfStatement();

        // TODO: FIX SPAN
        return new IfStatementNode(expr, block, alternate, block.span);
      }
    }

    this.stream.consume(Token.EndKw);

    // TODO: FIX SPAWN
    return new IfStatementNode(expr, block, undefined, block.span);
  }

  private parseReturnStatement(): ReturnStatementNode {
    const retKw = this.stream.consume(Token.ReturnKw);

    const expr = this.parseExpression();

    return new ReturnStatementNode(
      expr,
      new Range(retKw.startOffset, expr.span.end),
    );
  }

  private parseExpression(hasParen = false): ExpressionNode {
    const expr: any = this.parseExpression_1(this.parsePrimary(), 0);

    if (!(expr instanceof ASTNode) && typeof expr === "object") {
      switch (expr.kind) {
        case "BinaryExpression":
          return new BinaryExpressionNode(
            expr.lhs,
            expr.operator,
            expr.rhs,
            expr.span,
            hasParen,
          );
        case "AssignmentExpression":
          return new AssignmentExpressionNode(
            expr.lhs,
            expr.operator,
            expr.rhs,
            expr.span,
          );
        case "UnaryExpression":
          return new UnaryExpressionNode(
            expr.operator,
            expr.operand,
            expr.span,
          );
        case "PrefixExpression":
          return new PrefixExpressionNode(
            expr.operator,
            expr.operand,
            expr.span,
          );
        case "PostfixExpression":
          return new PostfixExpressionNode(
            expr.operator,
            expr.operand,
            expr.span,
          );
        case "CallExpression":
          return new CallExpressionNode(
            expr.callee,
            expr.argumentList,
            expr.span,
          );
        case "MemberExpression":
          return new MemberExpressionNode(
            expr.object,
            expr.property,
            expr.span,
          );
        case "Identifier":
          return new IdentifierNode(expr.image, expr.span);
        case "Literal":
          return new LiteralNode(expr.image, expr.span);
        case "ArrayLiteral":
          return new ArrayLiteralNode(expr.body, expr.span);
        default:
          throw new Error(`Unexpected expression kind '${expr.kind}'`);
      }
    }

    return expr as ExpressionNode;
  }

  private parseExpression_1(lhs: any, minPrecedence: number): ExpressionNode {
    let lookahead = this.stream.current();

    while (
      this.tokMatch(lookahead, Token.Operator) &&
      getPrecedence(lookahead) >= minPrecedence
    ) {
      let operator = this.stream.consume(Token.Operator);
      let operatorPrecedence = getPrecedence(operator);

      let rhs = this.parsePrimary();
      lookahead = this.stream.current();

      while (
        this.tokMatch(lookahead, Token.Operator) &&
        (getPrecedence(lookahead) > operatorPrecedence ||
          (isRightAssociative(lookahead) &&
            getPrecedence(lookahead) === operatorPrecedence))
      ) {
        const precedenceAddition =
          getPrecedence(lookahead) > operatorPrecedence ? 1 : 0;

        rhs = this.parseExpression_1(
          rhs,
          operatorPrecedence + precedenceAddition,
        );
        lookahead = this.stream.current();
      }

      lhs = {
        kind: this.tokMatch(operator, Token.Assign)
          ? "AssignmentExpression"
          : "BinaryExpression",
        lhs,
        operator: this.parseIdentifier(operator),
        rhs,
        span: new Range(lhs.span.start, rhs.span.end),
      };
    }

    return lhs;
  }

  private parsePrimary(): ExpressionNode {
    if (this.stream.match(Token.UnaryOperator)) {
      const operator = this.stream.consume(Token.UnaryOperator);
      const operand = this.parsePrimary();

      return new UnaryExpressionNode(
        this.parseIdentifier(operator),
        operand,
        new Range(operator.startOffset, operand.span.end),
      );
    }

    if (this.stream.match(Token.PrefixOperator)) {
      const operator = this.stream.consume(Token.PrefixOperator);
      const operand: any = this.parsePrimary();

      return new PrefixExpressionNode(
        this.parseIdentifier(operator),
        operand,
        new Range(operator.startOffset, operand.span.end),
      );
    }

    if (this.stream.match(Token.LBracket)) {
      return this.parseArrayLiteral();
    } else if (this.stream.match(Token.Literal)) {
      return this.parseLiteral();
    } else if (this.stream.match(Token.LParen)) {
      this.stream.consume(Token.LParen);
      const expr: any = this.parseExpression(true);

      if (!this.stream.match(Token.RParen)) {
        this.raiseUnclosedParenthesisError([
          {
            message: "parenthesis opens here",
            fileId: this.fileId,
            rangeStart: expr.span.start - 1,
            rangeEnd: expr.span.start,
            style: "secondary",
          },
          {
            message: "opening parenthesis not closed",
            fileId: this.fileId,
            rangeStart: expr.span.end,
            rangeEnd: expr.span.end + 1,
            style: "primary",
          },
        ]);
        process.exit(1);
      }

      this.stream.consume(Token.RParen);
      return expr;
    } else if (this.stream.match(Token.Identifier)) {
      let ident = this.stream.consume(Token.Identifier);

      if (this.stream.match(Token.LParen)) {
        return this.parseCallExpression(ident);
      } else if (this.stream.match(Token.Colon, Token.LBracket)) {
        const memberExpression = this.parseMemberExpression(ident);
        // const memExpr = this.parseMemberExpression(ident);

        // console.log("J", memberExpression);
        let identifier;

        if (memberExpression instanceof CallExpressionNode) {
          identifier = memberExpression.callee;
        } else {
          identifier = memberExpression;
        }

        if (identifier instanceof MemberExpressionNode) {
          let innerMostOffset = 0;
          const parts: string[] = [];

          const traverse = (node: MemberExpressionNode | IdentifierNode) => {
            if (node instanceof IdentifierNode) {
              parts.push(node.image);
              innerMostOffset = node.span.start;
            } else if (node instanceof MemberExpressionNode) {
              traverse(node.object as MemberExpressionNode);

              parts.push((node.property as IdentifierNode).image);
            }
          };

          traverse(identifier);

          // if (!this.scope().lookup(parts.join(":"))) {
          //   const prop = identifier.property;
          //
          //   if (prop instanceof IdentifierNode) {
          //     this.raiseUndefinedVariableError(
          //       parts.join(":"),
          //       new Range(innerMostOffset, prop.span.end),
          //     );
          //   }
          // }
        }

        // const newExpr = this.parseMemberExpression(ident);

        // let innerMostOffset = 0;
        // const parts: string[] = [];
        //
        // const traverse = (node: MemberExpressionNode | IdentifierNode) => {
        //   if (node instanceof IdentifierNode) {
        //     parts.push(node.image);
        //
        //     innerMostOffset = node.span.start;
        //   } else if (node instanceof MemberExpressionNode) {
        //     traverse(node.object as MemberExpressionNode);
        //
        //     parts.push((node.property as IdentifierNode).image);
        //   }
        // };
        //
        // traverse(memExpr);
        // const identifier = memExpr.property;
        //
        // if (identifier === undefined) {
        //   // console.log("Hhg", memExpr);
        // }
        //
        // if (!this.scope().lookup(parts.join(":"))) {
        //   if (ident instanceof IdentifierNode) {
        //     console.log("EHEHE");
        //
        //     this.raiseUndefinedVariableError(identifier.image, identifier.span);
        //   } else {
        //     console.log("NONONONOONONO", identifier);
        //
        //     // this.raiseUndefinedVariableError(
        //     //   parts.join(":"),
        //     //   new Range(innerMostOffset, identifier.span.end),
        //     // );
        //   }
        // }

        return memberExpression;
      }

      let expr = this.parseIdentifier(ident);
      if (this.stream.match(Token.PostfixOperator)) {
        const operator = this.stream.consume(Token.PostfixOperator);

        return new PostfixExpressionNode(
          this.parseIdentifier(operator),
          expr,
          new Range(expr.span.start, operator.endOffset! + 1),
        );
      }

      if (!this.scope().lookup(ident.image)) {
        this.raiseUndefinedVariableError(
          ident.image,
          new Range(ident.startOffset, ident.endOffset! + 1),
        );
      }

      return this.parseIdentifier(ident);
    } else {
      throw new Error("Unexpected token in primary expression");
    }
  }

  private parseArrayLiteral(): ArrayLiteralNode {
    const start = this.stream.consume(Token.LBracket);

    const members = this.parseArrayMembers();

    const endToken = this.stream.consume(Token.RBracket);

    return new ArrayLiteralNode(
      members,
      new Range(start.startOffset, endToken.endOffset! + 1),
    );
  }

  private parseArrayMembers(): ArrayMembersNode {
    let members: ArrayMemberNode[] = [];

    while (this.stream.match(Token.Comma, Token.Literal, Token.Identifier)) {
      const expr = this.parseExpression();
      if (this.stream.match(Token.Comma)) this.stream.consume(Token.Comma);

      members.push(new ArrayMemberNode(expr, new Range(0, 0)));
    }

    return new ArrayMembersNode(members, new Range(0, 0));
  }

  private parseCallExpression(ident?: IToken | any): CallExpressionNode {
    ident ??= this.stream.consume(Token.Identifier);
    this.stream.consume(Token.LParen);

    const args = this.parseArgumentList();

    const isToken = "tokenType" in ident;

    if (isToken) {
      if (!this.scope().lookup(ident.image)) {
        this.raiseUndefinedVariableError(
          ident.image,
          new Range(ident.startOffset, ident.endOffset! + 1),
        );
      }
    } else {
      let identifier = ident.property;
      let innerMostOffset = 0;
      const parts: string[] = [];

      const traverse = (node: MemberExpressionNode | IdentifierNode) => {
        if (node instanceof IdentifierNode) {
          parts.push(node.image);
          innerMostOffset = node.span.start;
        } else if (node instanceof MemberExpressionNode) {
          traverse(node.object as MemberExpressionNode);

          parts.push((node.property as IdentifierNode).image);
        }
      };

      traverse(ident);

      if (this.scope().lookup(parts.join(":")) === undefined) {
        // if (ident instanceof IdentifierNode) {
        //   this.raiseUndefinedVariableError(identifier.image, identifier.span);
        // } else {
        //   this.raiseUndefinedVariableError(
        //     parts.join(":"),
        //     new Range(innerMostOffset, identifier.span.end),
        //   );
        // }
      } else {
        // if (!this.scope().lookup(parts[0])) {
        //   if (ident instanceof IdentifierNode) {
        //     this.raiseUndefinedVariableError(identifier.image, identifier.span);
        //   } else {
        //     this.raiseUndefinedVariableError(
        //       parts.join(":"),
        //       new Range(innerMostOffset, identifier.span.end),
        //     );
        //   }
        // }
      }

      // if (!this.scope().lookup(parts[0])) {
      //   if (ident instanceof IdentifierNode) {
      //     this.raiseUndefinedVariableError(identifier.image, identifier.span);
      //   } else {
      //     this.raiseUndefinedVariableError(
      //       parts.join(":"),
      //       new Range(innerMostOffset, identifier.span.end),
      //     );
      //   }
      //   //
      //   // if (
      //   //   !this.scope().lookup(parts.join(":")) &&
      //   //   !this.scope().lookup(identifier.image)
      //   // ) {
      //   //
      //   // }
      // } else {
      //   const data = this.scope().lookup(parts[0]);
      //
      //   // if (data!.attributes.kind !== "import") {
      //   //   if (ident instanceof IdentifierNode) {
      //   //     this.raiseUndefinedVariableError(identifier.image, identifier.span);
      //   //   } else {
      //   //     this.raiseUndefinedVariableError(
      //   //       parts.join(":"),
      //   //       new Range(innerMostOffset, identifier.span.end),
      //   //     );
      //   //   }
      //   // }
      // }
    }

    return new CallExpressionNode(
      isToken ? this.parseIdentifier(ident) : ident,
      args,
      new Range(isToken ? ident.startOffset : ident.span.start, args.span.end),
    );
  }

  private parseMemberExpression(
    ident: any,
  ): MemberExpressionNode | CallExpressionNode {
    const identifiers = [ident];
    let endToken = ident;

    if (this.stream.match(Token.LBracket)) {
      this.stream.consume(Token.LBracket);
      const prop = this.parseExpression();
      this.stream.consume(Token.RBracket);

      return new MemberExpressionNode(
        this.parseIdentifier(identifiers[0]),
        prop,
        new Range(identifiers[0].startOffset, prop.span.end),
        true,
      );
    }

    while (this.stream.match(Token.Colon)) {
      this.stream.consume(Token.Colon);
      const nextIdent = this.stream.consume(Token.Identifier);
      identifiers.push(nextIdent);
      endToken = nextIdent;
    }

    let currentNode: any = this.parseIdentifier(identifiers[0]);
    let memberSpan = this.getTokenSpanRange(identifiers[0], endToken);

    for (let i = 1; i < identifiers.length; ++i) {
      currentNode = new MemberExpressionNode(
        currentNode,
        this.parseIdentifier(identifiers[i]),
        memberSpan,
      );
      memberSpan = this.getTokenSpanRange(identifiers[0], identifiers[i]);
    }

    if (this.stream.match(Token.LParen)) {
      return this.parseCallExpression(currentNode);
    }

    return currentNode;
  }

  private parseArgumentList(): ArgumentListNode {
    let args: ArgumentNode[] = [];
    let startTok = this.stream.current();

    while (!this.stream.match(Token.RParen, Token.DoKw)) {
      args.push(this.parseArgument());
      if (this.stream.match(Token.Comma)) this.stream.consume(Token.Comma);
    }

    if (!this.stream.match(Token.RParen)) {
      this.raiseUnclosedParenthesisError([
        {
          message: "parenthesis opens here",
          fileId: this.fileId,
          rangeStart: startTok.startOffset - 1,
          rangeEnd: startTok.startOffset,
          style: "secondary",
        },
        {
          message: "opening parenthesis not closed",
          fileId: this.fileId,
          rangeStart: this.stream.current().endOffset! - 3,
          rangeEnd: this.stream.current().endOffset! - 2,
          style: "primary",
        },
      ]);
      process.exit(1);
    }

    const endTok = this.stream.consume(Token.RParen);

    return new ArgumentListNode(args, this.getTokenSpanRange(startTok, endTok));
  }

  private parseArgument(): ArgumentNode {
    const ident = this.parseExpression();

    if (ident instanceof IdentifierNode) {
      if (!this.scope().lookup(ident.image)) {
        this.raiseUndefinedVariableError(ident.image, ident.span);
      }
    }

    return new ArgumentNode(ident, ident.span);
  }

  private parseLiteral(token?: IToken): LiteralNode {
    const tok = token ?? this.stream.consume(Token.Literal);

    return new LiteralNode(tok.image, this.getTokenRange(tok));
  }

  private parseParameterList(): ParameterListNode {
    let parameters: ParameterNode[] = [];
    let startTok = this.stream.current();

    if (!this.stream.match(Token.Void)) {
      while (!this.stream.match(Token.RParen, Token.DoKw)) {
        parameters.push(this.parseParameter());
        if (this.stream.match(Token.Comma)) this.stream.consume(Token.Comma);
      }
    } else {
      this.stream.consume(Token.Void);
    }

    if (!this.stream.match(Token.RParen)) {
      this.raiseUnclosedParenthesisError([
        {
          message: "parenthesis opens here",
          fileId: this.fileId,
          rangeStart: startTok.startOffset - 1,
          rangeEnd: startTok.startOffset,
          style: "secondary",
        },
        {
          message: "opening parenthesis not closed",
          fileId: this.fileId,
          rangeStart: this.stream.current().endOffset! - 3,
          rangeEnd: this.stream.current().endOffset! - 2,
          style: "primary",
        },
      ]);
      process.exit(1);
    }

    const endTok = this.stream.consume(Token.RParen);

    return new ParameterListNode(
      parameters,
      this.getTokenSpanRange(startTok, endTok),
    );
  }

  private parseParameter(): ParameterNode {
    const type = this.parseDataType();
    this.stream.consume(Token.Colon);
    const ident = this.parseIdentifier();

    if (this.scope().lookup(ident.image, false)) {
      const data = this.scope().get(ident.image, "loc");

      this.raiseDuplicateVariableError(
        ident.image,
        data,
        ident.span,
        "variable",
      );
    }

    this.scope().insert(ident.image, {
      kind: "Variable",
      type: type.image ?? type.ident?.image!,
      loc: ident.span,
    });

    return new ParameterNode(
      type,
      ident,
      new Range(type.span.start, ident.span.end),
    );
  }

  private parseDataType(token?: IToken): DataTypeNode {
    const tok = token ?? this.stream.consume(Token.Identifier, Token.DataType);

    if (tok.tokenType === Token.Identifier) {
      if (!this.stream.atEndOfStream() && this.stream.match(Token.LBracket)) {
        this.stream.consume(Token.LBracket);

        if (this.stream.match(Token.RBracket)) {
          this.stream.consume(Token.RBracket);
          const range = this.getTokenRange(tok);
          const o = this.parseIdentifier(tok);
          o.image = `${o.image}[]`;
          return new DataTypeNode(o, new Range(range.start, range.end + 2));
        }
      }

      return new DataTypeNode(
        this.parseIdentifier(tok),
        this.getTokenRange(tok),
      );
    }

    if (!this.stream.atEndOfStream() && this.stream.match(Token.LBracket)) {
      this.stream.consume(Token.LBracket);

      if (this.stream.match(Token.RBracket)) {
        this.stream.consume(Token.RBracket);
        const range = this.getTokenRange(tok);
        const o = this.parseIdentifier(tok);
        o.image = `${o.image}[]`;
        return new DataTypeNode(
          o.image,
          true,
          new Range(range.start, range.end + 2),
        );
      }
    }

    return new DataTypeNode(tok.image, true, this.getTokenRange(tok));
  }

  private parseIdentifier(tok?: IToken): IdentifierNode {
    const ident = tok ?? this.stream.consume(Token.Identifier);

    return new IdentifierNode(ident.image, this.getTokenRange(ident));
  }

  /////////////////////////////////////////////////////////////////////////////////////
  private tokMatch(tok: IToken, ...expected: TokenType[]): boolean {
    return expected.some((token) => tokenStructuredMatcher(tok, token));
  }

  private consumeWhile(...tokens: TokenType[]) {
    const startTok = this.stream.current();
    const tokensConsumed: IToken[] = [];

    while (this.stream.match(...tokens)) {
      tokensConsumed.push(this.stream.consume(...tokens)!);
    }

    return {
      consumed: tokensConsumed,
      span: this.getTokenSpanRange(startTok, tokensConsumed.at(-1)!),
    };
  }

  private getTokenSpanRange(startToken: IToken, endToken: IToken) {
    return new Range(startToken.startOffset, endToken.endOffset! + 1);
  }

  private getTokenRange(tok: IToken) {
    return new Range(tok.startOffset, tok.endOffset! + 1);
  }

  private pushScope() {
    const symbolTable = this.scope().allocate();
    this.symbols.push(symbolTable);
    return symbolTable;
  }

  private scope() {
    return this.symbols.at(-1)!;
  }

  private popScope() {
    return this.symbols.pop()!;
  }
}

export const parserInstance = new SCParser();
