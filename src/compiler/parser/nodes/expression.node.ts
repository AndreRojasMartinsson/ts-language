import { ASTNode } from "./general.node";
import { Range } from "../../lib/range";
import type { ArgumentListNode } from "./general.node";

export class ExpressionNode extends ASTNode {}

export class AssignmentExpressionNode extends ExpressionNode {
  constructor(
    public lhs: ExpressionNode,
    public operator: IdentifierNode,
    public rhs: ExpressionNode,
    span: Range,
  ) {
    super("AssignmentExpression", span);
  }
}

export class UnaryExpressionNode extends ExpressionNode {
  constructor(
    public operator: IdentifierNode,
    public operand: ExpressionNode,
    span: Range,
  ) {
    super("UnaryExpression", span);
  }
}

export class BinaryExpressionNode extends ExpressionNode {
  constructor(
    public lhs: ExpressionNode,
    public operator: IdentifierNode,
    public rhs: ExpressionNode,
    span: Range,
  ) {
    super("BinaryExpression", span);
  }
}

export class PrefixExpressionNode extends ExpressionNode {
  constructor(
    public operator: IdentifierNode,
    public operand: ExpressionNode,
    span: Range,
  ) {
    super("PrefixExpression", span);
  }
}

export class PostfixExpressionNode extends ExpressionNode {
  constructor(
    public operator: IdentifierNode,
    public operand: ExpressionNode,
    span: Range,
  ) {
    super("PostfixExpression", span);
  }
}

export class CallExpressionNode extends ExpressionNode {
  constructor(
    public callee: ExpressionNode,
    public argumentList: ArgumentListNode,
    span: Range,
  ) {
    super("CallExpression", span);
  }
}

export class MemberExpressionNode extends ExpressionNode {
  constructor(
    public object: ExpressionNode,
    public property: ExpressionNode,
    span: Range,
    public arrayAccess = false,
  ) {
    super("MemberExpression", span);
  }
}

export class IdentifierNode extends ExpressionNode {
  constructor(
    public image: string,
    span: Range,
  ) {
    super("Identifier", span);
  }
}

export class LiteralNode extends ExpressionNode {
  constructor(
    public image: string,
    span: Range,
  ) {
    super("Literal", span);
  }
}

export class StringLiteralNode extends LiteralNode {
  constructor(
    public image: string,
    span: Range,
  ) {
    super("StringLiteral", span);
  }
}

export class ArrayLiteralNode extends ExpressionNode {
  constructor(
    public members: ArrayMembersNode,
    span: Range,
  ) {
    super("ArrayLiteral", span);
  }
}

export class ArrayMembersNode extends ExpressionNode {
  constructor(
    public body: ArrayMemberNode[],
    span: Range,
  ) {
    super("ArrayMembers", span);
  }
}

export class ArrayMemberNode extends ExpressionNode {
  constructor(
    public expr: ExpressionNode,
    span: Range,
  ) {
    super("ArrayMember", span);
  }
}

export class DataTypeNode extends ExpressionNode {
  public primitive?: true | undefined;
  public image?: string;
  public ident?: IdentifierNode;

  constructor(ident: IdentifierNode, span: Range);
  constructor(image: string, primitive: true, span: Range);
  constructor(
    imageOrIdent: IdentifierNode | string,
    primitiveOrSpan: true | Range,
    span?: Range,
  ) {
    if (span) {
      super("DataType", span);
    } else {
      super("DataType", primitiveOrSpan as Range);
    }

    if (imageOrIdent instanceof IdentifierNode) {
      this.ident = imageOrIdent;
    } else {
      this.image = imageOrIdent;
    }

    if (primitiveOrSpan === true) {
      this.primitive = true;
    }
  }
}
