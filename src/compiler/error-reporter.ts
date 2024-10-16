import type { ILexingError } from "chevrotain";
import { CHARS_ASCII, emitDiagnostic } from "codespan-wasm";
import type { IFile } from "../cli/types";
import { $Log } from "./utils/logger";

const NOTES: string[] = [
  `This error may be due to a typo or the use of an unsupported symbol.`,
  `Ensure that only valid tokens are used according to the language syntax rules.`,
  `Check for missing or misplaced punctuation, operators, or delimiters.`,
];

export function isNumber(value: unknown): value is number {
  return !isNaN(Number(value)) && isFinite(Number(value));
}

export function isInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value);
}

function buildDiagnostic(
  file: IFile & { source: string },
  error: ILexingError,
) {
  let rangeEnd = error.offset + error.length;
  let [, , skippedLen] = error.message.split(/[^\d]+/);

  if (isInteger(skippedLen)) {
    rangeEnd += parseInt(skippedLen);
  }

  return emitDiagnostic(
    [{ name: file.name, source: file.source }],
    {
      message: "Unexpected character found",
      code: "E001L",
      severity: "error",
      notes: [
        `The character '${error.message.split(/\->|<\-/).at(1)!}' is not a valid token nor character.`,
        ...NOTES,
      ],
      labels: [
        {
          message: error.message,
          style: "primary",
          fileId: file.name,
          rangeStart: error.offset + 1,
          rangeEnd,
        },
      ],
    },
    {
      tabWidth: 2,
    },
    true,
  );
}

export function reportLexerErrors(
  file: IFile & { source: string },
  errors: ILexingError[],
) {
  return errors.forEach((error) => {
    const message = buildDiagnostic(file, error);

    $Log.$err(`LEXER`, message);
  });
}
