import type { IToken, TokenType } from 'chevrotain';
import { $Log } from '../utils/logger';
import { tokenStructuredMatcher } from './token-matcher';
import type { Token } from 'typescript';

export class TokenStream {
	private tokens: IToken[];

	constructor() {
		this.tokens = [];
	}

	set input(tokens: IToken[]) {
		$Log.$assert(tokens !== undefined, 'Tokens is undefined');
		$Log.$assert(tokens.length > 0, 'Tokens is empty');

		this.tokens = tokens;
	}

	last() {
		return this.tokens.at(-1)!;
	}

	peek(n = 0) {
		$Log.$assert(
			this.tokens.length > n + 1,
			`Token Stream does not have more than ${n + 1} tokens.`,
		);

		return this.tokens.at(n + 1);
	}

	consumeSeq(tokens: TokenType[]): IToken[] {
		return tokens.map(tok => {
			return this.consume(tok);
		});
	}

	consume(...tokens: TokenType[]): IToken {
		if (!this.match(...tokens)) {
			let message;
			if (tokens.length === 1) {
				message = tokens[0].name;
			} else {
				message = `[${tokens.map(t => t.name).join(', ')}]`;
			}

			$Log.$err(
				`TokenStream::Consume`,
				`Expecting --> ${message} <-- but found --> '${this.current().image}' <--`,
			);

			process.exit(1);
		}

		return this.advance()!;
	}

	atEndOfStream() {
		return this.tokens.length < 1;
	}

	advance() {
		$Log.$assert(!this.atEndOfStream(), 'End of stream');
		return this.tokens.shift();
	}

	match(...tokens: TokenType[]) {
		$Log.$assert(this.current() !== undefined, 'End of stream');

		const tok = this.current();

		return tokens.some(token => tokenStructuredMatcher(tok, token));
	}

	current() {
		$Log.$assert(this.tokens.length > 0, 'End of stream');
		return this.tokens.at(0)!;
	}
}
