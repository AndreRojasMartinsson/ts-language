import { inspect } from 'bun';
import type { ASTNode, IdentifierNode } from '../parser/nodes';
import { DiagnosticBuilder, ErrorHandler } from './traits/error-handler';
import { NodeTypeGuard } from './traits/node-typeguard';
import { $Log } from '../utils/logger';
import { applyMixins } from '../utils/mixins';
import {
	CHARS_ASCII,
	emitDiagnostic,
	type Diagnostic,
	type File,
	type Label,
} from 'codespan-wasm';

export class BaseVisitor {
	protected _diagnostics: Diagnostic[] = [];
	protected fileId: string = '';
	protected source: string = '';

	protected createDiagnosticBuilder() {
		return new DiagnosticBuilder();
	}

	raiseUndefinedVariableError(labels: Label[]) {
		const diag = this.createDiagnosticBuilder()
			.withCode('E001')
			.withSeverity('error')
			.withNote('A variable must be declared before being used.')
			.withNote('Ensure the variable is properly defined.')
			.withMessage('Use of undefined variable')
			.withLabels(labels);
		this._diagnostics.push(diag.build());
	}

	raiseTypeMismatchError(expected: string, actual: string, labels: Label[]) {
		const diag = this.createDiagnosticBuilder()
			.withCode('E002')
			.withMessage(`Type mismatch: expected ${expected}, found ${actual}`)
			.withSeverity('error')
			.withNote('Check the type of the variable or expression.')
			.withNote('Ensure consistent types are used.')
			.withLabels(labels);
		this._diagnostics.push(diag.build());
	}

	raiseFunctionArityError(expected: string, actual: string, labels: Label[]) {
		const diag = this.createDiagnosticBuilder()
			.withCode('E003')
			.withMessage(`Function called with wrong number of arguments.`)
			.withSeverity('error')
			.withNote(
				`This function requires ${expected} arguments, but ${actual} were provided.`,
			)
			.withLabels(labels);
		this._diagnostics.push(diag.build());
	}

	raiseReturnTypeMismatchError(
		funcName: string,
		expected: string,
		actual: string,
		labels: Label[],
	) {
		const diag = this.createDiagnosticBuilder()
			.withCode('E004')
			.withMessage(`Return type mismatch: expected ${expected}, found ${actual}`)
			.withSeverity('error')
			.withNote(
				`Check the return type of the function '${funcName}' and ensure it matches the function's declared return type.`,
			)
			.withLabels(labels);
		this._diagnostics.push(diag.build());
	}

	raiseDuplicateVariableError(name: string, labels: Label[]) {
		const diag = this.createDiagnosticBuilder()
			.withCode('E005')
			.withMessage(`Duplicate variable declaration`)
			.withSeverity('error')
			.withNote(`Variable ${name} has already been declared in this scope.`)
			.withLabels(labels);
		this._diagnostics.push(diag.build());
	}

	raiseUnreachableCodeError(labels: Label[]) {
		const diag = this.createDiagnosticBuilder()
			.withCode('E006')
			.withMessage(`Unreachable code detected.`)
			.withSeverity('warning')
			.withNote('The code after this point will never be executed.')
			.withLabels(labels);
		this._diagnostics.push(diag.build());
	}

	raiseUseOfUninitializedVariableError(name: string, labels: Label[]) {
		const diag = this.createDiagnosticBuilder()
			.withCode('E007')
			.withMessage(`Variable ${name} used before being initialized`)
			.withSeverity('error')
			.withNote('Ensure the variable is assigned a value before using it.')
			.withLabels(labels);
		this._diagnostics.push(diag.build());
	}

	raiseImutableReassignmentError(name: string, labels: Label[]) {
		const diag = this.createDiagnosticBuilder()
			.withCode('E008')
			.withMessage(`Cannot reassign immutable variable ${name}`)
			.withSeverity('error')
			.withNote(`The variable ${name} is declared as imutable and cannot be modified.`)
			.withLabels(labels);
		this._diagnostics.push(diag.build());
	}

	raiseDivisionByZeroError(labels: Label[]) {
		const diag = this.createDiagnosticBuilder()
			.withCode('E009')
			.withMessage(`Division by zero detected.`)
			.withSeverity('bug')
			.withNote(`Ensure the denominator in the division is not zero.`)
			.withLabels(labels);
		this._diagnostics.push(diag.build());
	}

	raiseIntegerOverflowError(labels: Label[]) {
		const diag = this.createDiagnosticBuilder()
			.withCode('E009')
			.withMessage(`Integer literal exceeds maximum allowed size.`)
			.withSeverity('bug')
			.withNote(`Ensure the integer fits within the allowed range.`)
			.withNote(`Unsigned integers cannot be negative.`)
			.withNote(`Signed integers can be both positive and negative.`)
			.withNote(`Max safe unsigned integer limit is [0..4294967295]`)
			.withNote(`Max safe signed integer limit is [-2147483648..2147483647]`)
			.withLabels(labels);
		this._diagnostics.push(diag.build());
	}

	raiseInfiniteLoopDetected(labels: Label[]) {
		const diag = this.createDiagnosticBuilder()
			.withCode('E010')
			.withMessage(`Potential infinite loop detected.`)
			.withSeverity('warning')
			.withNote(
				'The loop condition does not appear to change, which may result in an infinite loop.',
			)
			.withLabels(labels);
		this._diagnostics.push(diag.build());
	}

	raiseInvalidOperandTypes(
		operator: string,
		left: [IdentifierNode, string],
		right?: [IdentifierNode, string],
		labels: Label[] = [],
	) {
		const diag = this.createDiagnosticBuilder()
			.withCode('E011')
			.withMessage(`Invalid operand types for operator '${operator}'`)
			.withSeverity('error')
			.withNote(
				`The operator ${operator} cannot be applied to operands of type '${left[0].image}' (${left[1]}) ${right === undefined ? '' : "and '" + right + "'"}`,
			)
			.withLabels(labels);
		this._diagnostics.push(diag.build());
	}

	raiseMissingReturnStatement(name: string, expected: string, labels: Label[]) {
		const diag = this.createDiagnosticBuilder()
			.withCode('E012')
			.withMessage(`Missing return statement in function '${name}' returning ${expected}`)
			.withSeverity('error')
			.withNote(`All control paths must return a value of type ${expected}`)
			.withLabels(labels);
		this._diagnostics.push(diag.build());
	}

	emit(file: File) {
		return this._diagnostics.forEach(diag => {
			const err = diag.severity === 'error';
			const warn = diag.severity === 'warning';

			const message = emitDiagnostic(
				[file],
				diag,
				{
					chars: CHARS_ASCII,
					tabWidth: 2,
					displayStyle: 'rich',
					endContextLines: 5,
					startContextLines: 5,
				},
				true,
			);

			if (err) return $Log.$err(`SEMANTICS`, message);
			if (warn) return $Log.$warn(`SEMANTICS`, message);

			return $Log.$info(`SEMANTICS`, message);
		});
	}

	constructor() {}

	set file(file: [fileId: string, source: string]) {
		this.source = file[1];
		this.fileId = file[0];
	}

	visitNode(node: ASTNode): any {
		// if (node.kind === undefined) return;

		const method = this.getVisitMethod(node)!;
		// console.log(node.kind, node);

		$Log.$assert(method !== undefined, `Unhandled visit method found '${node.kind}'`);

		return method.bind(this, node)();
	}

	protected visitNodeCustom<T extends ASTNode>(node: T, visitor: (node: T) => T) {
		return visitor(node);
	}

	private hasVisitMethod(node: ASTNode) {
		const methodName = `visit${node.kind}`;
		return methodName in this && typeof (this as any)[methodName] === 'function';
	}

	private getVisitMethod(node: ASTNode) {
		const methodName = `visit${node.kind}`;
		if (!this.hasVisitMethod(node)) return;

		return (this as any)[methodName] as Function;
	}

	visitEachChild(node: ASTNode) {
		if ('children' in node && Array.isArray(node.children)) {
			return node.children.map(child => this.visitNode(child));
		}

		if ('body' in node && Array.isArray(node.body)) {
			return node.body.map(child => this.visitNode(child));
		}

		throw new Error(
			`Unexpected node when calling visitEachChild, '${inspect(node, { depth: Infinity, colors: true })}'`,
		);
	}
}

export interface BaseVisitor extends NodeTypeGuard {}

applyMixins(BaseVisitor, [NodeTypeGuard]);

/////////////////////////////////////////////////////////////////////////
