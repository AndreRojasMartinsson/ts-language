import { Lexer } from "chevrotain";
import { LanguageTokens } from "./tokenArray";
import { $Log } from "../utils/logger";

export class SCLexer {
  private static debugLexer: Lexer;
  private static releaseLexer: Lexer;

  private static compileLevel: "Debug" | "Release" = "Debug";

  public static set level(compileLevel: "Debug" | "Release") {
    $Log.$assert(
      /Debug|Release/.test(compileLevel),
      "Compile Level must be either 'Debug' or 'Release'",
    );

    this.compileLevel = compileLevel;
  }

  public static get instance(): Lexer {
    $Log.$assert(
      /Debug|Release/.test(this.compileLevel),
      "Compile Level must be either 'Debug' or 'Release'",
    );

    if (this.compileLevel === "Debug") {
      if (this.debugLexer === undefined) {
        this.debugLexer = new Lexer(LanguageTokens, {
          traceInitPerf: true,
          recoveryEnabled: true,
          skipValidations: false,
          ensureOptimizations: false,
          positionTracking: "full",
          deferDefinitionErrorsHandling: true,
        });
      }

      return this.debugLexer;
    } else if (this.compileLevel === "Release") {
      if (this.releaseLexer === undefined) {
        this.releaseLexer = new Lexer(LanguageTokens, {
          traceInitPerf: false,
          recoveryEnabled: true,
          skipValidations: true,
          ensureOptimizations: true,
          positionTracking: "full",
          deferDefinitionErrorsHandling: true,
        });
      }

      return this.releaseLexer;
    } else {
      throw new Error();
    }
  }
}
