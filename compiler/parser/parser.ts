import { type IToken, type TokenType } from 'chevrotain';
import { Range } from '../lib/range';
import { Token } from '../lexer/tokens';
import { tokenStructuredMatcher } from './token-matcher';
import { getPrecedence, isRightAssociative } from './precedence';
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
  type IElseClause,
} from './nodes';
import { BaseParser } from '.';
import { SymbolTable } from '../lib/symbol-table';
import { inspect } from 'bun';
import { identifierToKeywordKind } from 'typescript';
import { CHARS_ASCII, emitDiagnostic } from 'codespan-wasm';

class SCParser extends BaseParser {
  private symbols: SymbolTable[] = [];

  private static RESERVED_KEYWORDS: string[] = [
    'pub',
    'while',
    'if',
    'else',
    'fn',
    'end',
    'do',
    'float',
    'uint',
    'int',
    'bool',
    'str',
    'return',
    'mut',
  ];

  constructor() {
    super();
  }

  public set input(data: { source: string; tokens: IToken[]; fileId: string }) {
    super.input = data;
    this.symbols = [new SymbolTable()];
  }

  public override parse(): SourceFileNode {
    const body: (FnDeclarationNode | DirectiveNode)[] = [];
    const lastTok = this.stream.last();

    while (!this.stream.atEndOfStream()) {
      if (this.stream.match(Token.DataType)) {
        body.push(this.parseFnDeclaration());
      } else if (this.stream.match(Token.At)) {
        body.push(this.parseDirective());
      } else {
        const tok = this.stream.current()
        console.error(
          emitDiagnostic([{ name: this.fileId, source: this.source }], {
            code: "E0X-P",
            message: "Illegal token occured in top-level scope",
            notes: [
              `Only function declarations and directives may appear at the top level.`,
              `Make sure '${tok.image}' is not supposed to go inside a function declaration.`
            ],
            labels: [{
              message: 'illegal token found here',
              fileId: this.fileId,
              style: "primary",
              rangeStart: tok.startOffset,
              rangeEnd: tok.endOffset! + 1
            }],
            severity: "error"
          }, { chars: CHARS_ASCII, tabWidth: 2, displayStyle: "rich" }, true)
        )

        process.exit(1)
      }
    }

    return new SourceFileNode(
      body,
      this.symbols[0],
      new Range(0, lastTok.endOffset! + 1),
    );
  }

  private parseDirective(): DirectiveNode {
    this.stream.consume(Token.At);

    const ident = this.stream.consume(Token.Identifier);

    switch (ident.image) {
      case 'incl':
        return this.parseIncludeDirective();
      case 'pub':
        return this.parsePubDirective();
      default:
        throw new Error(`Unexpected directive '${ident.image}'`);
    }
  }

  private parsePubDirective(): PubDirectiveNode {
    const ident = this.parseIdentifier();

    return new PubDirectiveNode(ident, ident.span);
  }

  private parseIncludeDirective(): IncludeDirectiveNode {
    const identifiers: any[] = [];

    while (
      this.stream.match(Token.RBrace, Token.LBrace, Token.Identifier, Token.Divide)
    ) {
      if (this.stream.match(Token.LBrace)) break;

      identifiers.push(this.stream.consume(Token.Identifier));
      if (this.stream.match(Token.Divide)) {
        this.stream.consume(Token.Divide);
      }

      if (this.stream.match(Token.LBrace)) break;
    }

    const fullPath = identifiers.map(ident => ident.image);
    const subPath = [...fullPath];
    const name = subPath.pop();

    if (this.symbols[0].lookup(name)) {
      const lastIdent = identifiers.at(-1)!;
      const data = this.symbols[0].get(name, 'loc')!;

      this.raiseDuplicateVariableError(
        name,
        data,
        new Range(lastIdent.startOffset, lastIdent.endOffset! + 1),
        'import',
      );
    }

    const lastIdent = identifiers.at(-1)!;
    this.symbols[0].insert(name, {
      kind: 'import',
      loc: new Range(lastIdent.startOffset, lastIdent.endOffset! + 1),
      path: subPath,
    });

    this.symbols[0].insert(fullPath.join(':'), {
      kind: 'import',
      loc: new Range(identifiers[0].startOffset, lastIdent.endOffset! + 1),
    });

    let currentNode: any = this.parseIdentifier(identifiers[0]);

    for (let i = 1; i < identifiers.length; ++i) {
      currentNode = {
        kind: 'ImportPath',
        ref: currentNode,
        importees: this.parseIdentifier(identifiers[i]),
      };
    }

    const startOffset = identifiers[0].startOffset;
    const endOffset = identifiers.at(-1)!.endOffset ?? this.stream.current().endOffset!;

    if (this.stream.match(Token.LBrace)) {
      const group = this.parseIncludeGroup({
        path: fullPath.join(':'),
        start: startOffset,
      });
      this.stream.consume(Token.RBrace);

      return new IncludeDirectiveNode(
        currentNode,
        new Range(startOffset, endOffset + 1),
        group,
      );
    }

    return new IncludeDirectiveNode(currentNode, new Range(startOffset, endOffset + 1));
  }

  private parseIncludeGroup(data: { path: string; start: number }): ExpressionNode[] {
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
        kind: 'import',
        loc: element.span,
      });

      if (data) {
        this.symbols[0].insert(`${data.path}:${element.image}`, {
          kind: 'import',
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

    returnType = this.stream.consume(Token.DataType);
    this.stream.consumeSeq([Token.Colon, Token.FnKw]);
    ident = this.stream.consume(Token.Identifier);

    if (this.scope().lookup(ident.image, true)) {
      const data = this.scope().get(ident.image, 'loc');

      this.raiseDuplicateVariableError(
        ident.image,
        data,
        new Range(ident.startOffset, ident.endOffset! + 1),
        'function',
      );
    }

    this.scope().insert(ident.image, {
      kind: 'Function',
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
      if (this.stream.match(Token.Identifier, Token.PrefixOperator)) {
        body.push(this.parseExpression());
      }
      if (this.stream.match(Token.ReturnKw)) body.push(this.parseReturnStatement());
      if (this.stream.match(Token.WhileKw)) body.push(this.parseWhileStatement());
      if (this.stream.match(Token.DataType)) body.push(this.parseVariableDeclaration());
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
          style: 'primary',
          fileId: this.fileId,
          message: `keyword used here`,
        },
      ]);
    }

    if (this.scope().lookup(ident.image, false)) {
      const data = this.scope().get(ident.image, 'loc');

      this.raiseDuplicateVariableError(
        ident.image,
        data,
        new Range(ident.startOffset, ident.endOffset! + 1),
        'variable',
      );
    }

    this.scope().insert(ident.image, {
      kind: 'Variable',
      type: dataType.image,
      mutable,
      loc: new Range(ident.startOffset, ident.endOffset! + 1),
    });

    if (this.stream.match(Token.Assign)) {
      this.stream.consume(Token.Assign);
      expr = this.parseExpression();
      this.scope().set(ident.image, 'uninitialized', false);
      this.scope().set(ident.image, 'value', expr);
    }

    if (expr === undefined) {
      this.scope().set(ident.image, 'uninitialized', true);
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

    return new ReturnStatementNode(expr, new Range(retKw.startOffset, expr.span.end));
  }

  private parseExpression(): ExpressionNode {
    const expr: any = this.parseExpression_1(this.parsePrimary(), 0);

    if (!(expr instanceof ASTNode) && typeof expr === 'object') {
      switch (expr.kind) {
        case 'BinaryExpression':
          return new BinaryExpressionNode(expr.lhs, expr.operator, expr.rhs, expr.span);
        case 'AssignmentExpression':
          return new AssignmentExpressionNode(
            expr.lhs,
            expr.operator,
            expr.rhs,
            expr.span,
          );
        case 'UnaryExpression':
          return new UnaryExpressionNode(expr.operator, expr.operand, expr.span);
        case 'PrefixExpression':
          return new PrefixExpressionNode(expr.operator, expr.operand, expr.span);
        case 'PostfixExpression':
          return new PostfixExpressionNode(expr.operator, expr.operand, expr.span);
        case 'CallExpression':
          return new CallExpressionNode(expr.callee, expr.argumentList, expr.span);
        case 'MemberExpression':
          return new MemberExpressionNode(expr.object, expr.property, expr.span);
        case 'Identifier':
          return new IdentifierNode(expr.image, expr.span);
        case 'Literal':
          return new LiteralNode(expr.image, expr.span);
        case 'ArrayLiteral':
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
        const precedenceAddition = getPrecedence(lookahead) > operatorPrecedence ? 1 : 0;

        rhs = this.parseExpression_1(rhs, operatorPrecedence + precedenceAddition);
        lookahead = this.stream.current();
      }

      lhs = {
        kind: this.tokMatch(operator, Token.Assign)
          ? 'AssignmentExpression'
          : 'BinaryExpression',
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
      const expr = this.parseExpression();

      if (!this.stream.match(Token.RParen)) {
        this.raiseUnclosedParenthesisError([
          {
            message: 'parenthesis opens here',
            fileId: this.fileId,
            rangeStart: expr.span.start - 1,
            rangeEnd: expr.span.start,
            style: 'secondary',
          },
          {
            message: 'opening parenthesis not closed',
            fileId: this.fileId,
            rangeStart: expr.span.end,
            rangeEnd: expr.span.end + 1,
            style: 'primary',
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
        return this.parseMemberExpression(ident);
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
      throw new Error('Unexpected token in primary expression');
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

    const isToken = 'tokenType' in ident;

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

      if (
        !this.scope().lookup(parts.join(':')) &&
        !this.scope().lookup(identifier.image)
      ) {
        if (ident instanceof IdentifierNode) {
          this.raiseUndefinedVariableError(identifier.image, identifier.span);
        } else {
          this.raiseUndefinedVariableError(
            parts.join(':'),
            new Range(innerMostOffset, identifier.span.end),
          );
        }
      }
    }

    return new CallExpressionNode(
      isToken ? this.parseIdentifier(ident) : ident,
      args,
      new Range(isToken ? ident.startOffset : ident.span.start, args.span.end),
    );
  }

  private parseMemberExpression(ident: any): MemberExpressionNode | CallExpressionNode {
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
          message: 'parenthesis opens here',
          fileId: this.fileId,
          rangeStart: startTok.startOffset - 1,
          rangeEnd: startTok.startOffset,
          style: 'secondary',
        },
        {
          message: 'opening parenthesis not closed',
          fileId: this.fileId,
          rangeStart: this.stream.current().endOffset! - 3,
          rangeEnd: this.stream.current().endOffset! - 2,
          style: 'primary',
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
          message: 'parenthesis opens here',
          fileId: this.fileId,
          rangeStart: startTok.startOffset - 1,
          rangeEnd: startTok.startOffset,
          style: 'secondary',
        },
        {
          message: 'opening parenthesis not closed',
          fileId: this.fileId,
          rangeStart: this.stream.current().endOffset! - 3,
          rangeEnd: this.stream.current().endOffset! - 2,
          style: 'primary',
        },
      ]);
      process.exit(1);
    }

    const endTok = this.stream.consume(Token.RParen);

    return new ParameterListNode(parameters, this.getTokenSpanRange(startTok, endTok));
  }

  private parseParameter(): ParameterNode {
    const type = this.parseDataType();
    this.stream.consume(Token.Colon);
    const ident = this.parseIdentifier();

    if (this.scope().lookup(ident.image, false)) {
      const data = this.scope().get(ident.image, 'loc');

      this.raiseDuplicateVariableError(ident.image, data, ident.span, 'variable');
    }

    this.scope().insert(ident.image, {
      kind: 'Variable',
      type: type.image ?? type.ident?.image!,
      loc: ident.span,
    });

    return new ParameterNode(type, ident, new Range(type.span.start, ident.span.end));
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

      return new DataTypeNode(this.parseIdentifier(tok), this.getTokenRange(tok));
    }

    if (!this.stream.atEndOfStream() && this.stream.match(Token.LBracket)) {
      this.stream.consume(Token.LBracket);

      if (this.stream.match(Token.RBracket)) {
        this.stream.consume(Token.RBracket);
        const range = this.getTokenRange(tok);
        const o = this.parseIdentifier(tok);
        o.image = `${o.image}[]`;
        return new DataTypeNode(o.image, true, new Range(range.start, range.end + 2));
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
    return expected.some(token => tokenStructuredMatcher(tok, token));
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
