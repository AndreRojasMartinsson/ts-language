import {
	CHARS_ASCII,
	emitDiagnostic,
	type Diagnostic,
	type File,
	type Label,
	type Severity,
} from 'codespan-wasm';
import { $Log } from '../../utils/logger';
import type { IToken, TokenType } from 'chevrotain';
import type { Range } from '../../lib/range';

export type IConstructor<T = {}> = new (...args: any[]) => T;

export function ErrorHandler<T extends IConstructor>(Base: T) {
	return class ErrorHandler extends Base {
		private _diagnostics: Diagnostic[] = [];
		protected fileId: string = '';
		protected source: string = '';

		createDiagnosticBuilder() {
			return new DiagnosticBuilder();
		}

		// raiseSyntaxError(token: IToken, expected: TokenType, labels: Label[]) {
		// 	const diag = this.createDiagnosticBuilder()
		// 		.withCode('E001')
		// 		.withSeverity('error')
		// 		.withNote('Ensure your syntax follows correct grammar rules.')
		// 		.withMessage(
		// 			`Unexpected token '${token.image}' found, expected '${expected.name}'.`,
		// 		)
		// 		.withLabels(labels)
		// 		.build();
		// 	this._diagnostics.push(diag);
		// }

		hasErrors() {
			return this._diagnostics.length > 0;
		}

		raiseUnclosedParenthesisError(labels: Label[]) {
			const diag = this.createDiagnosticBuilder()
				.withCode('E002')
				.withMessage(`Unclosed parenthesis detected.`)
				.withSeverity('error')
				.withNote('Make sure all opened parenthesis are properly closed.')
				.withLabels(labels)
				.build();

			$Log.$err(
				'PARSER',
				emitDiagnostic(
					[{ name: this.fileId, source: this.source }],
					diag,
					{ chars: CHARS_ASCII, tabWidth: 2, endContextLines: 6, startContextLines: 6 },
					true,
				),
			);
		}

		raiseUndefinedVariableError(variable: string, loc: Range) {
			const diag = this.createDiagnosticBuilder()
				.withCode('E004')
				.withMessage(`Use of undefined variable ${variable}`)
				.withSeverity('error')
				.withNote(`Make sure that the variable is declared before it is used.`)

				.withLabel({
					fileId: this.fileId,
					message: `${variable} is not declared`,
					style: 'primary',
					rangeStart: loc.start,
					rangeEnd: loc.end,
				})

				.build();
			this._diagnostics.push(diag);
		}

		raiseDuplicateVariableError(
			name: string,
			originalDeclaration: Range,
			loc: Range,
			type: string,
			// labels: Label[],
		) {
			const diag = this.createDiagnosticBuilder()
				.withCode('E005')
				.withMessage(`${type} '${name}' is declared multiple times in the same scope.`)
				.withSeverity('error')
				.withNote(`${type} names must be unique within the same scope.`)
				.withNote(
					`TIP: You can use variable scope shadowing to use a variable name same as a variable above scope.`,
				)
				.withLabel({
					fileId: this.fileId,
					message: `originally declared here`,
					style: 'secondary',
					rangeStart: originalDeclaration.start,
					rangeEnd: originalDeclaration.end,
				})
				.withLabel({
					fileId: this.fileId,
					message: `redefinition of ${type}`,
					style: 'primary',
					rangeStart: loc.start,
					rangeEnd: loc.end,
				})
				.build();
			this._diagnostics.push(diag);
		}

		raiseUseOfReservedKeywordsError(labels: Label[]) {
			const diag = this.createDiagnosticBuilder()
				.withCode('E006')
				.withMessage(`Reserved keyword used as identifier.`)
				.withSeverity('error')
				.withNote(
					`Keywords are reserved and cannot be used as variable or function names.`,
				)
				.withLabels(labels)
				.build();
			this._diagnostics.push(diag);
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

		_internalAddDiagnostic(diagnostic: Diagnostic) {
			return this._diagnostics.push(diagnostic);
		}
	};
}

export class Erandler {
	private _diagnostics: Diagnostic[] = [];

	constructor() {
		this._diagnostics = [];
	}

	createDiagnosticBuilder() {
		return new DiagnosticBuilder();
	}

	raiseSyntaxError(token: IToken, expected: TokenType, labels: Label[]) {
		return this.createDiagnosticBuilder()
			.withCode('E001')
			.withSeverity('error')
			.withNote('Ensure your syntax follows correct grammar rules.')
			.withMessage(
				`Unexpected token '${token.image}' found, expected '${expected.name}'.`,
			)
			.withLabels(labels);
	}

	raiseUnclosedParenthesisError(labels: Label[]) {
		return this.createDiagnosticBuilder()
			.withCode('E002')
			.withMessage(`Unclosed parenthesis detected.`)
			.withSeverity('error')
			.withNote('Make sure all opened parenthesis are properly closed.')
			.withLabels(labels);
	}

	raiseInvalidOperatorUsageError(labels: Label[]) {
		return this.createDiagnosticBuilder()
			.withCode('E003')
			.withMessage(`Invalid use of operator.`)
			.withSeverity('error')
			.withNote(`Ensure that the operator is applied to the correct types.`)
			.withLabels(labels);
	}

	raiseUndefinedVariableError(variable: string, labels: Label[]) {
		return this.createDiagnosticBuilder()
			.withCode('E004')
			.withMessage(`Use of undefined variable ${variable}`)
			.withSeverity('error')
			.withNote(`Make sure that the variable is declared before it is used.`)
			.withLabels(labels);
	}

	raiseDuplicateVariableError(name: string, labels: Label[]) {
		return this.createDiagnosticBuilder()
			.withCode('E005')
			.withMessage(`Variable is declared multiple times in the same scope.`)
			.withSeverity('error')
			.withNote(`Variable names must be unique within the same scope.`)
			.withNote(
				`TIP: You can use variable scope shadowing to use a variable name same as a variable above scope.`,
			)
			.withLabels(labels);
	}

	raiseUseOfReservedKeywordsError(labels: Label[]) {
		return this.createDiagnosticBuilder()
			.withCode('E006')
			.withMessage(`Reserved keyword used as identifier.`)
			.withSeverity('error')
			.withNote(`Keywords are reserved and cannot be used as variable or function names.`)
			.withLabels(labels);
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

	_internalAddDiagnostic(diagnostic: Diagnostic) {
		return this._diagnostics.push(diagnostic);
	}
}

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
