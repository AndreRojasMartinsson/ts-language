import {
	AssignmentExpressionNode,
	ASTNode,
	BinaryExpressionNode,
	CallExpressionNode,
	DataTypeNode,
	ExpressionNode,
	IdentifierNode,
	LiteralNode,
	MemberExpressionNode,
	PostfixExpressionNode,
	PrefixExpressionNode,
	UnaryExpressionNode,
} from '../../parser/nodes';
import {
	DeclarationNode,
	FnDeclarationNode,
	VariableDeclarationNode,
} from '../../parser/nodes/declaration.node';
import {
	DirectiveNode,
	ImportPathNode,
	IncludeDirectiveNode,
	PubDirectiveNode,
} from '../../parser/nodes/directive.node';
import {
	ArgumentListNode,
	ArgumentNode,
	BlockNode,
	ListNode,
	ParameterListNode,
	ParameterNode,
	SourceFileNode,
} from '../../parser/nodes/general.node';
import {
	ForStatementNode,
	IfStatementNode,
	ReturnStatementNode,
	StatementNode,
	WhileStatementNode,
} from '../../parser/nodes/statement.node';
import type { IConstructor } from '../../parser/traits/error-handler';

export class NodeTypeGuard {
	isNode<T>(node: unknown, nodeConstructor: IConstructor<T>): node is T {
		return node instanceof ASTNode && node instanceof nodeConstructor;
	}

	isAnyNode(node: unknown): node is ASTNode {
		return node instanceof ASTNode;
	}

	isDeclaration(node: unknown): node is DeclarationNode {
		return this.isNode(node, DeclarationNode);
	}

	isSourceFile(node: unknown): node is SourceFileNode {
		return this.isNode(node, SourceFileNode);
	}
	isVariableDeclaration(node: unknown): node is VariableDeclarationNode {
		return this.isNode(node, VariableDeclarationNode);
	}

	isFnDeclaration(node: unknown): node is FnDeclarationNode {
		return this.isNode(node, FnDeclarationNode);
	}
	isDirective(node: unknown): node is DirectiveNode {
		return this.isNode(node, DirectiveNode);
	}
	isIncludeDirective(node: unknown): node is IncludeDirectiveNode {
		return this.isNode(node, IncludeDirectiveNode);
	}
	isImportPath(node: unknown): node is ImportPathNode {
		return this.isNode(node, ImportPathNode);
	}
	isPubDirective(node: unknown): node is PubDirectiveNode {
		return this.isNode(node, PubDirectiveNode);
	}
	isExpression(node: unknown): node is ExpressionNode {
		return this.isNode(node, ExpressionNode);
	}
	isAssignmentExpression(node: unknown): node is AssignmentExpressionNode {
		return this.isNode(node, AssignmentExpressionNode);
	}
	isUnaryExpression(node: unknown): node is UnaryExpressionNode {
		return this.isNode(node, UnaryExpressionNode);
	}
	isBinaryExpression(node: unknown): node is BinaryExpressionNode {
		return this.isNode(node, BinaryExpressionNode);
	}
	isPrefixExpression(node: unknown): node is PrefixExpressionNode {
		return this.isNode(node, PrefixExpressionNode);
	}
	isPostfixExpression(node: unknown): node is PostfixExpressionNode {
		return this.isNode(node, PostfixExpressionNode);
	}
	isCallExpression(node: unknown): node is CallExpressionNode {
		return this.isNode(node, CallExpressionNode);
	}
	isMemberExpression(node: unknown): node is MemberExpressionNode {
		return this.isNode(node, MemberExpressionNode);
	}
	isIdentifier(node: unknown): node is IdentifierNode {
		return this.isNode(node, IdentifierNode);
	}
	isLiteral(node: unknown): node is LiteralNode {
		return this.isNode(node, LiteralNode);
	}
	isDataType(node: unknown): node is DataTypeNode {
		return this.isNode(node, DataTypeNode);
	}
	isBlock(node: unknown): node is BlockNode {
		return this.isNode(node, BlockNode);
	}
	isList(node: unknown): node is ListNode<any> {
		return this.isNode(node, ListNode);
	}
	isArgumentList(node: unknown): node is ArgumentListNode {
		return this.isNode(node, ArgumentListNode);
	}
	isParameterList(node: unknown): node is ParameterListNode {
		return this.isNode(node, ParameterListNode);
	}
	isParameter(node: unknown): node is ParameterNode {
		return this.isNode(node, ParameterNode);
	}

	isArgument(node: unknown): node is ArgumentNode {
		return this.isNode(node, ArgumentNode);
	}
	isStatement(node: unknown): node is StatementNode {
		return this.isNode(node, StatementNode);
	}
	isReturnStatement(node: unknown): node is ReturnStatementNode {
		return this.isNode(node, ReturnStatementNode);
	}
	isIfStatement(node: unknown): node is IfStatementNode {
		return this.isNode(node, IfStatementNode);
	}
	isWhileStatement(node: unknown): node is WhileStatementNode {
		return this.isNode(node, WhileStatementNode);
	}
	isForStatement(node: unknown): node is ForStatementNode {
		return this.isNode(node, ForStatementNode);
	}
}
