import { program } from "commander";
import figlet from "figlet";

export const cliProgram = program
  .name("sc")
  .description("CLI Utility Tool for the SmartCode (SC) language")
  .addHelpText("beforeAll", figlet.textSync("SmartCode"))
  .addHelpText("before", "  For the smarter programmer");
