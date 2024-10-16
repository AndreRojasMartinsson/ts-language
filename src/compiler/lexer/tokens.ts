import {
  createToken,
  Lexer,
  type ITokenConfig,
  type TokenType,
} from "chevrotain";

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function $TOKEN(
  name: string,
  pattern: RegExp | string,
  options?: Omit<ITokenConfig, "name" | "pattern">,
) {
  if (pattern instanceof RegExp)
    return createToken({ name, pattern, ...(options ?? {}) });

  return createToken({
    name,
    pattern: new RegExp(escapeRegExp(pattern)),
    ...(options ?? {}),
  });
}

function $CATEGORY(name: string, categories?: TokenType[] | TokenType) {
  return createToken({ name, pattern: Lexer.NA, categories: categories ?? [] });
}

function $SKIP(name: string, pattern: RegExp | string) {
  if (pattern instanceof RegExp)
    return createToken({ name, pattern, group: Lexer.SKIPPED });

  return createToken({
    name,
    pattern: new RegExp(escapeRegExp(pattern)),
    group: Lexer.SKIPPED,
  });
}

export namespace Token {
  export const DataType = $CATEGORY("DataType");
  export const Literal = $CATEGORY("Literal");

  export const Operator = $CATEGORY("Operator");
  export const LogicalOperator = $CATEGORY("LogicalOperator", Operator);
  export const AdditiveOperator = $CATEGORY("AdditiveOperator", Operator);
  export const PostfixOperator = $CATEGORY("PostfixOperator", Operator);
  export const PrefixOperator = $CATEGORY("PrefixOperator", Operator);
  export const UnaryOperator = $CATEGORY("UnaryOperator", Operator);
  export const MultiplicativeOperator = $CATEGORY(
    "MultiplicativeOperator",
    Operator,
  );
  export const ExponentialOperator = $CATEGORY("ExponentialOperator", Operator);
  export const EqualityOperator = $CATEGORY("EqualityOperator", Operator);
  export const RelationalOperator = $CATEGORY("RelationalOperator", Operator);

  export const Whitespace = $SKIP(
    "Whitespace",
    /[ \t\n\r\u000B\u000C\u0085\u200E\u200F\u2028\u2029]+/,
  );

  export const SingleLineComment = $SKIP("SingleLineComment", /\/\/[^\r\n]*/);
  export const MultiLineComment = $SKIP("MultiLineComment", /\/\*[^\*]*\*\//);
  export const DocComment = $SKIP("DocComment", /\/\#\#([^]*?)\#\//);
  export const Semicolon = $SKIP("Semicolon", ";");

  export const Void = $TOKEN("Void", "void", { categories: DataType });
  export const Identifier = $TOKEN("Identifier", /[_a-zA-Z][_a-zA-Z0-9]*/, {
    // categories: DataType,
  });
  export const StringLiteral = $TOKEN(
    "StringLiteral",
    /"(?:[^\\"]|\\(?:[bfnrtv"\\/]|u[0-9a-fA-F]{4}))*"/,
    { categories: Literal },
  );
  export const RawStringLiteral = $TOKEN("RawStringLiteral", /r#"([^]*?)\#/, {
    categories: [Literal, StringLiteral],
  });

  export const IntLiteral = $TOKEN("IntLiteral", /-?(?:0|[1-9]\d*)/, {
    categories: Literal,
  });

  export const FloatLiteral = $TOKEN(
    "FloatLiteral",
    /-?(0|[1-9]\d*)(\.\d+)?([ee][+-]?\d+)?/,
    { categories: Literal },
  );

  export const BoolLiteral = $TOKEN("BoolLiteral", /true|false/, {
    categories: Literal,
  });

  export const PrimitiveType = $TOKEN("PrimitiveType", /u?int|bool|str|float/, {
    categories: DataType,
    longer_alt: Identifier,
  });

  export const LParen = $TOKEN("LParen", "(");
  export const RParen = $TOKEN("RParen", ")");
  export const LBrace = $TOKEN("LBrace", "{");
  export const RBrace = $TOKEN("RBrace", "}");
  export const LBracket = $TOKEN("LBracket", "[");
  export const RBracket = $TOKEN("RBracket", "]");
  export const Period = $TOKEN("Period", ".");
  export const Comma = $TOKEN("Comma", ",");
  export const Colon = $TOKEN("Colon", ":");
  export const At = $TOKEN("At", "@");
  export const Dollar = $TOKEN("Dollar", "$");
  export const Octothorpe = $TOKEN("Octothorpe", "#");
  export const Question = $TOKEN("Question", "?");

  export const Add = $TOKEN("Add", "+", {
    categories: [AdditiveOperator, UnaryOperator],
  });
  export const Increment = $TOKEN("Increment", "++", {
    categories: [PostfixOperator, PrefixOperator],
  });
  export const Minus = $TOKEN("Minus", "-", {
    categories: [AdditiveOperator, UnaryOperator],
  });
  export const Decrement = $TOKEN("Decrement", "--", {
    categories: [PostfixOperator, PrefixOperator],
  });
  export const Multiply = $TOKEN("Multiply", "*", {
    categories: MultiplicativeOperator,
  });
  export const Exponent = $TOKEN("Exponent", "^", {
    categories: ExponentialOperator,
  });
  export const Divide = $TOKEN("Divide", "/", {
    categories: MultiplicativeOperator,
  });
  export const Modulus = $TOKEN("Modulus", "%", {
    categories: MultiplicativeOperator,
  });
  export const Bang = $TOKEN("Bang", "!", { categories: UnaryOperator });
  export const LogicalAnd = $TOKEN("LogicalAnd", "&&", {
    categories: LogicalOperator,
  });
  export const LogicalOr = $TOKEN("LogicalOr", "||", {
    categories: LogicalOperator,
  });

  export const LT = $TOKEN("LT", "<", { categories: RelationalOperator });
  export const GT = $TOKEN("GT", ">", { categories: RelationalOperator });
  export const LTE = $TOKEN("LTE", "<=", { categories: RelationalOperator });
  export const GTE = $TOKEN("GTE", ">=", { categories: RelationalOperator });

  export const NotEqual = $TOKEN("NotEqual", "!=", {
    categories: EqualityOperator,
  });
  export const Equal = $TOKEN("Equal", "==", { categories: EqualityOperator });
  export const Assign = $TOKEN("Assign", "=", { categories: EqualityOperator });

  export const FnKw = $TOKEN("FnKw", "fn", { longer_alt: Identifier });
  export const ReturnKw = $TOKEN("ReturnKw", "return", {
    longer_alt: Identifier,
  });
  export const IfKw = $TOKEN("IfKw", "if", { longer_alt: Identifier });
  export const MutKw = $TOKEN("MutKw", "mut", { longer_alt: Identifier });
  export const WhileKw = $TOKEN("WhileKw", "while", { longer_alt: Identifier });
  export const ForKw = $TOKEN("ForKw", "for", { longer_alt: Identifier });
  export const EndKw = $TOKEN("EndKw", "end", { longer_alt: Identifier });
  export const DoKw = $TOKEN("DoKw", "do", { longer_alt: Identifier });
  export const ElseKw = $TOKEN("ElseKw", "else", { longer_alt: Identifier });
  export const ElseIfKw = $TOKEN("ElseIfKw", "elseif", {
    longer_alt: Identifier,
  });
}
