import {
	CHARS_ASCII,
	emitDiagnostic,
	type Diagnostic,
	type File,
	type Label,
	type Severity,
} from 'codespan-wasm';
import { $Log } from '../../utils/logger';
import type { IConstructor } from '../../parser/traits/error-handler';

export function ErrorHandler<T extends IConstructor>(Base: T): T {
	return class ErrorHandler extends Base {
		private _diagnostics: Diagnostic[] = [];

		createDiagnosticBuilder() {
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
			left: string,
			right: string,
			labels: Label[],
		) {
			const diag = this.createDiagnosticBuilder()
				.withCode('E011')
				.withMessage(`Invalid operand types for operator ${operator}`)
				.withSeverity('error')
				.withNote(
					`The operator ${operator} cannot be applied to operands of type ${left} and ${right}`,
				)
				.withLabels(labels);
			this._diagnostics.push(diag.build());
		}

		raiseMissingReturnStatement(name: string, expected: string, labels: Label[]) {
			const diag = this.createDiagnosticBuilder()
				.withCode('E012')
				.withMessage(
					`Missing return statement in function '${name}' returning ${expected}`,
				)
				.withSeverity('error')
				.withNote(`All control paths must return a value of type ${expected}`)
				.withLabels(labels);
			this._diagnostics.push(diag.build());
		}

		emit(file: File) {
			console.log(this._diagnostics);

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

		_internalAddDiagnostic(diagnostic: Diagnostic) {
			return this._diagnostics.push(diagnostic);
		}
	};
}

export class rHandler {}

export class DiagnosticBuilder {
	private code?: string;
	private severity: Severity;
	private message: string;
	private notes?: string[];
	private labels?: Label[];

	constructor() {
		this.severity = 'note';
		this.message = '';
	}

	withCode(code: string) {
		this.code = code;
		return this;
	}

	withSeverity(severity: Severity) {
		this.severity = severity;
		return this;
	}

	withMessage(message: string) {
		this.message = message;
		return this;
	}

	withNote(note: string) {
		this.notes ??= [];
		this.notes.push(note);
		return this;
	}

	withLabel(label: Label) {
		this.labels ??= [];
		this.labels.push(label);
		return this;
	}

	withLabels(labels: Label[]) {
		this.labels ??= [];
		this.labels.push(...labels);
		return this;
	}

	build() {
		return {
			code: this.code,
			labels: this.labels,
			notes: this.notes,
			message: this.message,
			severity: this.severity,
		};
	}
}
