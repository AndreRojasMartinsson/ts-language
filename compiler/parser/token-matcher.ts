import type { IToken, TokenType } from 'chevrotain';

export function tokenStructuredMatcher(
	tokenInstance: IToken,
	tokenConstructor: TokenType,
) {
	const instanceType = tokenInstance.tokenTypeIdx;
	if (instanceType === tokenConstructor.tokenTypeIdx) {
		return true;
	} else {
		return (
			// tokenConstructor.isParent === true &&
			tokenConstructor.categoryMatchesMap![instanceType] === true
		);
	}
}
