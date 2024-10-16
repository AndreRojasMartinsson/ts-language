import { ASTNode } from ".";
import {
  ExpressionNode,
  IdentifierNode,
  LiteralNode,
  StringLiteralNode,
} from "./expression.node";
import type { Range } from "../../lib/range";

export class DirectiveNode extends ASTNode {}

export class IncludeDirectiveNode extends DirectiveNode {
  constructor(
    public ref: ImportPathNode | IdentifierNode | StringLiteralNode,
    span: Range,
    public importees?: ExpressionNode[],
  ) {
    super("IncludeDirective", span);
  }
}

export class ImportPathNode extends ASTNode {
  constructor(
    public ref: IdentifierNode | ImportPathNode,
    public importees: IdentifierNode,
    span: Range,
  ) {
    super("ImportPath", span);
  }
}

export class PubDirectiveNode extends DirectiveNode {
  constructor(
    public ident: IdentifierNode,
    span: Range,
  ) {
    super("PubDirective", span);
  }
}
