import fs from "node:fs/promises"
import { $Log } from './utils/logger';
import { SCLexer } from './lexer/lexer';
import { CHARS_ASCII, emitDiagnostic, type File } from 'codespan-wasm';
import path from 'node:path';
import { parserInstance } from './parser/parser';
import { $, inspect } from 'bun';
import { compress } from "shrink-string";
import { ToTSVisitor } from "./semantic-analyzer/to-ts";

const CWD = process.cwd();

export async function compileSourceFile(filePath: string) {
  const file = Bun.file(filePath);
  const source = await file.text();

  $Log.$assert(source.length > 0, 'Source file is empty.');

  const { tokens, errors } = SCLexer.instance.tokenize(source);
  if (errors.length > 0) {
    const file: File = { name: path.relative(CWD, filePath), source };

    errors.forEach(err => {
      let rangeEnd = err.offset + err.length;
      let [, , skippedLen] = err.message.split(/[^\d]+/);

      const isNum =
        !isNaN(Number(skippedLen)) &&
        isFinite(Number(skippedLen)) &&
        Number.isInteger(Number(skippedLen));

      if (isNum) {
        rangeEnd += parseInt(skippedLen);
      }

      const message = emitDiagnostic(
        [file],
        {
          message: 'Unexpected character found',
          code: 'E000',
          severity: 'error',
          notes: [
            `The character '${err.message.split(/\->|<\-/).at(1)!}' is not a valid token nor character.`,
            `This error may be due to a typo or the use of an unsupported symbol.`,
            `Ensure that only valid tokens are used according to the language syntax rules.`,
            `Check for missing or misplaced punctuation, operators, or delimiters.`,
          ],
          labels: [
            {
              message: err.message,
              style: 'primary',
              fileId: path.relative(CWD, filePath),
              rangeStart: err.offset + 1,
              rangeEnd,
            },
          ],
        },
        {
          startContextLines: 6,
          endContextLines: 6,
          displayStyle: 'rich',
          tabWidth: 2,
          chars: CHARS_ASCII,
        },
        true,
      );

      $Log.$err(`LEXER`, message);
    });
    process.exit(1);
  }

  $Log.$debug('compileSourceFile', tokens);

  parserInstance.input = { source, tokens, fileId: path.relative(CWD, filePath) };


  const ast = parserInstance.parse();
  if (parserInstance.hasErrors()) {

    parserInstance.emit({ name: path.relative(CWD, filePath), source });
    process.exit(1);
  }

  $Log.$warn(inspect(ast, { depth: Infinity, colors: true }));


  const outPath = path.join(process.cwd(), "out/", filePath.split(".sc").join("") + ".o")
  const code = new ToTSVisitor().visitNode(ast)

  const compressed = await compress(code)

  await Bun.write(outPath, compressed, { createPath: true })

}
