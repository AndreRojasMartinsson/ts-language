import type { SymbolTable } from '../lib/symbol-table';
import {
  ArgumentListNode,
  ArgumentNode,
  ArrayLiteralNode,
  ArrayMemberNode,
  AssignmentExpressionNode,
  BinaryExpressionNode,
  BlockNode,
  CallExpressionNode,
  DataTypeNode,
  ForStatementNode,
  IdentifierNode,
  IfStatementNode,
  MemberExpressionNode,
  ParameterListNode,
  ParameterNode,
  PostfixExpressionNode,
  PrefixExpressionNode,
  VariableDeclarationNode,
  WhileStatementNode,
  type FnDeclarationNode,
  type IncludeDirectiveNode,
  type LiteralNode,
  type PubDirectiveNode,
  type ReturnStatementNode,
  type SourceFileNode,
} from '../parser/nodes';
import { BaseVisitor } from '../visitor';

export class ToTSVisitor extends BaseVisitor {
  private symbols: SymbolTable[] = [];
  protected fileId: string = '';

  constructor() {
    super();
  }

  hasErrors() {
    return this._diagnostics.length > 0;
  }

  visitSourceFile(node: SourceFileNode) {
    this.symbols = [node.symbols];

    const prefix = `
type uint = number
type int = number
type bool = boolean
type str = string
type float = number
`;
    return (
      prefix +
      this.visitEachChild(node).join('\n\n') +
      '\nprocess.exit(main(process.argv))'
    );
  }

  visitFnDeclaration(node: FnDeclarationNode) {
    let returnType;
    if (this.isDataType(node.type)) {
      const typeNode = node.type;
      if (typeNode.image !== undefined) returnType = typeNode.image;
      if (typeNode.ident !== undefined) returnType = typeNode.ident.image;
    }

    let stack: string[] = [];
    stack.push(`function ${node.ident.image}(`);

    stack.push(this.visitNode(node.parameterList));
    stack.push(`): ${returnType} {\n`);
    stack.push(this.visitNode(node.body));
    stack.push(`}\n`);

    return stack.join('');
  }

  visitParameterList(node: ParameterListNode) {
    return this.visitEachChild(node).join(', ');
  }

  visitParameter(node: ParameterNode) {
    return `${node.ident.image}: ${node.type.image}`;
  }

  visitArgumentList(node: ArgumentListNode) {
    return this.visitEachChild(node).join(', ');
  }

  visitArgument(node: ArgumentNode) {
    return `${this.visitNode(node.ident)}`;
  }

  visitIncludeDirective(node: IncludeDirectiveNode) {
    return '';
  }

  visitPubDirective(node: PubDirectiveNode) {
    return '';
  }

  visitVariableDeclaration(node: VariableDeclarationNode) {
    const stack: string[] = [];
    stack.push(node.mutable ? 'let' : 'const');
    stack.push(`${node.ident.image}: ${this.visitNode(node.type)}`);

    if (!node.uninitialized) {
      stack.push(`= ${this.visitNode(node.expr!)}`);
    }

    return stack.join(' ');
  }

  visitDataType(node: DataTypeNode) {
    if (node.image) return node.image;

    if (node.ident) return node.ident.image;

    throw new Error(`Invalid data type ${node}`);
  }

  visitWhileStatement(node: WhileStatementNode) {
    const stack: string[] = [];

    stack.push(`while (${this.visitNode(node.expr)}) {\n`);
    stack.push('  ' + this.visitEachChild(node.body).join('\n  '));
    stack.push(`\n  }\n`);

    return stack.join(' ');
  }

  visitPostfixExpression(node: PostfixExpressionNode) {
    return `${this.visitNode(node.operand)}${node.operator.image}`;
  }

  visitPrefixExpression(node: PrefixExpressionNode) {
    return `${this.visitNode(node.operator)}${this.visitNode(node.operand)}`;
  }

  visitForStatement(node: ForStatementNode) {
    const stack: string[] = [];

    stack.push(
      `for (${this.visitNode(node.initializer)}; ${this.visitNode(node.condition)}; ${this.visitNode(node.incrementor)}) {\n`,
    );
    stack.push('  ' + this.visitEachChild(node.block).join(`\n  `));
    stack.push('\n  }\n');

    return stack.join(' ');
  }

  visitIfStatement(node: IfStatementNode) {
    const stack: string[] = [];

    stack.push(`if (${this.visitNode(node.expr)}) {\n`);
    stack.push('   ' + this.visitEachChild(node.block).join('\n  '));
    stack.push('\n  }');
    if (node.alternate) {
      stack.push(`else`);
      if (node.alternate instanceof BlockNode) {
        stack.push('{\n    ' + this.visitEachChild(node.block).join('\n  '));
        stack.push(`\n  }\n`);
      } else if (node.alternate instanceof IfStatementNode) {
        stack.push(this.visitNode(node.alternate));
      }
    }

    return stack.join(' ');
  }

  visitArrayLiteral(node: ArrayLiteralNode) {
    const stack: string[] = [];

    stack.push(`[`);

    stack.push(this.visitEachChild(node.members).join(', '));
    stack.push(`]\n`);

    return stack.join(' ');
  }

  visitArrayMember(node: ArrayMemberNode) {
    return this.visitNode(node.expr);
  }

  visitMemberExpression(node: MemberExpressionNode) {
    const parts: string[] = [];

    const traverse = (node: MemberExpressionNode | IdentifierNode) => {
      if (node instanceof IdentifierNode) {
        parts.push(node.image);
      } else if (node instanceof MemberExpressionNode) {
        traverse(node.object as MemberExpressionNode);

        parts.push((node.property as IdentifierNode).image);
      }
    };

    traverse(node);

    if (node.arrayAccess) {
      return `${this.visitNode(node.object)}[${this.visitNode(node.property)}]`;
    }

    return parts.join('.');
  }

  visitAssignmentExpression(node: AssignmentExpressionNode) {
    return `${this.visitNode(node.lhs)} = ${this.visitNode(node.rhs)}`;
  }

  visitReturnStatement(node: ReturnStatementNode) {
    return `return ${this.visitNode(node.expr)}`;
  }

  visitIdentifier(node: IdentifierNode) {
    if (node.image === 'log') {
      return `console.log`;
    }

    return node.image;
  }

  visitLiteral(node: LiteralNode) {
    return node.image;
  }

  visitCallExpression(node: CallExpressionNode) {
    return `${this.visitNode(node.callee)}(${this.visitNode(node.argumentList)})`;
  }

  visitBinaryExpression(node: BinaryExpressionNode) {
    const lhs = this.visitNode(node.lhs);
    const operator = node.operator.image;
    const rhs = this.visitNode(node.rhs);

    return `${lhs} ${operator} ${rhs}`;
  }

  visitBlock(node: BlockNode) {
    return '  ' + this.visitEachChild(node).join('\n  ') + '\n';
  }

  isDataTypeNumber(image: string) {
    return ['float', 'uint', 'int'].includes(image);
  }

  scope() {
    return this.symbols.at(-1)!;
  }

  pushScope(scope: SymbolTable) {
    this.symbols.push(scope);
  }
  popScope() {
    return this.symbols.pop()!;
  }
}
