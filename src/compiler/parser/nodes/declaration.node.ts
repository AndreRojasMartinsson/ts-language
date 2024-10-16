import { ASTNode, DataTypeNode, ExpressionNode, IdentifierNode } from '.';
import type { Range } from '../../lib/range';
import type { BlockNode, ParameterListNode } from './general.node';

export class DeclarationNode extends ASTNode {}

export class VariableDeclarationNode extends DeclarationNode {
	constructor(
		public mutable: boolean,
		public type: DataTypeNode | IdentifierNode,
		public ident: IdentifierNode,
		public uninitialized: boolean,
		span: Range,
		public expr?: ExpressionNode,
	) {
		super('VariableDeclaration', span);
	}
}

export class FnDeclarationNode extends DeclarationNode {
	constructor(
		public type: DataTypeNode | IdentifierNode,
		public ident: IdentifierNode,
		public parameterList: ParameterListNode,
		public body: BlockNode,
		span: Range,
	) {
		super('FnDeclaration', span);
	}
}
