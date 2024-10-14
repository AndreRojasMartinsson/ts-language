import type { Block } from 'typescript';
import type { SymbolTable } from '../lib/symbol-table';
import {
	BinaryExpressionNode,
	VariableDeclarationNode,
	type ASTNode,
	type BlockNode,
	type FnDeclarationNode,
	type IdentifierNode,
	type IncludeDirectiveNode,
	type LiteralNode,
	type PubDirectiveNode,
	type ReturnStatementNode,
	type SourceFileNode,
} from '../parser/nodes';
import { $Log } from '../utils/logger';
import { BaseVisitor } from '../visitor';

export class SemanticAnalyzer {
	private static analyzer: ASTVisitor;
	private static compileLevel: 'Debug' | 'Release' = 'Debug';

	public static set level(compileLevel: 'Debug' | 'Release') {
		$Log.$assert(
			/Debug|Release/.test(compileLevel),
			"Compile Level must be either 'Debug' or 'Release'",
		);

		this.compileLevel = compileLevel;
	}

	public static get instance(): ASTVisitor {
		$Log.$assert(
			/Debug|Release/.test(this.compileLevel),
			"Compile Level must be either 'Debug' or 'Release'",
		);

		if (this.analyzer === undefined) {
			this.analyzer = new ASTVisitor();
		}

		return this.analyzer;
	}
}

class ASTVisitor extends BaseVisitor {
	private symbols: SymbolTable[] = [];
	protected fileId: string = '';

	constructor() {
		super();
	}

	hasErrors() {
		return this._diagnostics.length > 0;
	}

	visitSourceFile(node: SourceFileNode) {
		this.visitEachChild(node);

		this.symbols = [node.symbols];

		return node;
	}

	visitIncludeDirective(node: IncludeDirectiveNode) {
		return node;
	}

	visitPubDirective(node: PubDirectiveNode) {
		return node;
	}

	visitVariableDeclaration(node: VariableDeclarationNode) {
		if (node.expr) {
			console.log('HE', this.visitNode(node.expr));
		}

		return node;
	}
	visitWhileStatement(node: VariableDeclarationNode) {
		return node;
	}
	visitForStatement(node: VariableDeclarationNode) {
		return node;
	}
	visitIfStatement(node: VariableDeclarationNode) {
		return node;
	}

	visitReturnStatement(node: ReturnStatementNode) {
		this.visitNode(node.expr);
		// console.log(this.scope());
	}

	visitIdentifier(node: IdentifierNode) {
		return node;
	}

	visitLiteral(node: LiteralNode) {
		return node;
	}

	visitBinaryExpression(node: BinaryExpressionNode) {
		const lhs = this.visitNode(node.lhs);
		const operator = node.operator.image;
		const rhs = this.visitNode(node.rhs);

		console.log('AHA', lhs, rhs);

		if (this.isIdentifier(rhs)) {
			const type = this.scope().get(rhs.image, 'type');

			if (!this.isDataTypeNumber(type)) {
				this.raiseInvalidOperandTypes(operator, [rhs, type], undefined, [
					{
						fileId: this.fileId,
						style: 'primary',
						message: `invalid type: '${type}' used in a binary operation`,
						rangeStart: rhs.span.start,
						rangeEnd: rhs.span.end,
					},
				]);
			}
		}

		if (this.isIdentifier(lhs)) {
			const type = this.scope().get(lhs.image, 'type');

			if (!this.isDataTypeNumber(type)) {
				this.raiseInvalidOperandTypes(operator, [lhs, type], undefined, [
					{
						fileId: this.fileId,
						style: 'primary',
						message: `invalid type: '${type}' used in a binary operation`,
						rangeStart: lhs.span.start,
						rangeEnd: lhs.span.end,
					},
				]);
			}
		}

		if (node.lhs && node.rhs) {
			const op = node.operator;
		}

		return new BinaryExpressionNode(
			this.visitNode(node.lhs),
			node.operator,
			this.visitNode(node.rhs),
			node.span,
		);
	}

	visitBlock(node: BlockNode) {
		this.pushScope(node.symbols);

		this.visitEachChild(node);
		this.popScope();
	}

	visitFnDeclaration(node: FnDeclarationNode) {
		let returnType;
		if (this.isDataType(node.type)) {
			const typeNode = node.type;
			if (typeNode.image !== undefined) returnType = typeNode.image;
			if (typeNode.ident !== undefined) returnType = typeNode.ident.image;
		}

		this.visitNode(node.body);

		return node;
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
