import type { IOptions } from "./types";
import { cliProgram } from "./common";
import { compileCommand } from "./commands/compile";
import { formatCommand } from "./commands/format";

enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR,
  FATAL,
}

function getMinLogLevel(options: IOptions): LogLevel {
  if (options.q) {
    return LogLevel.ERROR;
  } else if (options.v) {
    return LogLevel.DEBUG;
  }

  return LogLevel.WARN;
}

function parseArguments(args = process.argv) {
  // args[1] = process.execPath; // Change to actual file of executable instead of /$bunfs/root/out

  cliProgram
    .option("-q", "Tell compiler to silence output (only errors)", false)
    .option("-v", "Tell compiler to emit info", false);

  process.env.VERBOSITY = "2";

  const onVerbosityOption = function (this: any) {
    const options = this.opts() as IOptions;
    if (!options) return;

    const logLevel = getMinLogLevel(options);
    process.env.VERBOSITY = String(logLevel);
  };

  cliProgram.on("option:q", onVerbosityOption);
  cliProgram.on("option:v", onVerbosityOption);

  compileCommand();
  formatCommand();

  cliProgram.parse();
}

void parseArguments();
