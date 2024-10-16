import { cliProgram } from "../common";
import type { IFile } from "../types";
import { getSourceFiles } from "../path-utils";
import { $Log } from "../../compiler/utils/logger";

import SmartCode from "tree-sitter-smartcode";
import Parser from "tree-sitter";
import { FormatVisitor } from "../format-visitor";

async function handleCompileCommand(inputs: string[]) {
  const files: IFile[] = await getSourceFiles(inputs);
}

export function formatCommand() {
  cliProgram
    .command("format <inputs...>")
    .description("Formats the inputs")
    .action((inputs) => {
      // handleCompileCommand(inputs);
      $Log.$fatal(`FORMATTER`, "Not implemented yet.");
    });
}
