import type { IToken } from 'chevrotain';
import { Token } from '../lexer/tokens';
import { $Log } from '../utils/logger';
import { tokenStructuredMatcher } from './token-matcher';

const PRECEDENCE_MATRIX = [
	[Token.Assign],
	[Token.LogicalOr],
	[Token.LogicalAnd],
	[Token.EqualityOperator],
	[Token.RelationalOperator],
	[Token.AdditiveOperator],
	[Token.MultiplicativeOperator],
	[Token.ExponentialOperator],
	[Token.UnaryOperator, Token.PrefixOperator],
	[Token.PostfixOperator],
];

export const OPERATORS = [
	Token.Assign,
	Token.EqualityOperator,
	Token.LogicalOperator,
	Token.RelationalOperator,
	Token.AdditiveOperator,
	Token.MultiplicativeOperator,
	Token.ExponentialOperator,
	Token.UnaryOperator,
	Token.PrefixOperator,
	Token.PostfixOperator,
	// Token.Add,
];

const RIGHT_ASSOCIATIVE_TOKENS = [
	Token.UnaryOperator,
	Token.PrefixOperator,
	Token.ExponentialOperator,
];

export function getPrecedence(token: IToken): number {
	const precedence = PRECEDENCE_MATRIX.findIndex(tokenTypes => {
		return tokenTypes.some(tokenConstructor =>
			tokenStructuredMatcher(token, tokenConstructor),
		);
	});

	// const precedence = PRECEDENCE_MATRIX.findIndex(arr => arr.includes(token.tokenType));

	$Log.$assert(precedence >= 0, 'Invalid operator');

	return precedence;
}

export function isRightAssociative(token: IToken) {
	return RIGHT_ASSOCIATIVE_TOKENS.some(tok => tokenStructuredMatcher(token, tok));
}
