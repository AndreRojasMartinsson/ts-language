import type { Block } from 'typescript';
import { ASTNode, ExpressionNode } from '.';
import { Range } from '../../lib/range';
import type { BlockNode } from './general.node';

export interface IElseClause {
	kind: 'ElseClause';
	block: BlockNode;
	expr: undefined;
}

export class StatementNode extends ASTNode {}

export class ReturnStatementNode extends StatementNode {
	constructor(
		public expr: ExpressionNode,
		span: Range,
	) {
		super('ReturnStatement', span);
	}
}

export class IfStatementNode extends StatementNode {
	constructor(
		public expr: ExpressionNode,
		public block: BlockNode,
		public alternate: BlockNode | IfStatementNode | undefined,
		span: Range,
	) {
		super('IfStatement', span);
	}
}

export class WhileStatementNode extends StatementNode {
	constructor(
		public expr: ExpressionNode,
		public body: BlockNode,
		span: Range,
	) {
		super('WhileStatement', span);
	}
}

export class ForStatementNode extends StatementNode {
	constructor(
		public initializer: ExpressionNode,
		public condition: ExpressionNode,
		public incrementor: ExpressionNode,
		public block: BlockNode,
		span: Range,
	) {
		super('ForStatement', span);
	}
}
