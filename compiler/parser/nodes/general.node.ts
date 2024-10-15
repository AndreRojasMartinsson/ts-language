import {
	DataTypeNode,
	DirectiveNode,
	ExpressionNode,
	FnDeclarationNode,
	IdentifierNode,
} from '.';
import type { Range } from '../../lib/range';
import type { SymbolTable } from '../../lib/symbol-table';

export interface INode {
	kind: string;
	span: Range;

	[key: string]: any;
}

export class ASTNode implements INode {
	constructor(
		public readonly kind: string,
		public readonly span: Range,
	) {}
}

export class SourceFileNode extends ASTNode {
	constructor(
		public body: (FnDeclarationNode | DirectiveNode)[],
		public symbols: SymbolTable,
		span: Range,
	) {
		super('SourceFile', span);
	}
}

export class BlockNode extends ASTNode {
	constructor(
		public body: any[],
		public symbols: SymbolTable,
		span: Range,
	) {
		super('Block', span);
	}
}

export class ListNode<T> extends ASTNode {
	constructor(
		kind: string,
		public body: T[],
		span: Range,
	) {
		super(kind, span);
	}
}

export class ArgumentListNode extends ListNode<ArgumentNode> {
	constructor(body: ArgumentNode[], span: Range) {
		super('ArgumentList', body, span);
	}
}

export class ParameterListNode extends ListNode<ParameterNode> {
	constructor(body: ParameterNode[], span: Range) {
		super('ParameterList', body, span);
	}
}

export class ParameterNode extends ASTNode {
	constructor(
		public type: DataTypeNode | IdentifierNode,
		public ident: IdentifierNode,
		span: Range,
	) {
		super('Parameter', span);
	}
}

export class ArgumentNode extends ASTNode {
	constructor(
		public ident: ExpressionNode,
		span: Range,
	) {
		super('Argument', span);
	}
}
