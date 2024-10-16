import type { IToken } from 'chevrotain';
import { $Log } from '../utils/logger';
import { TokenStream } from './token-stream';
import { SourceFileNode } from './nodes';
import { ErrorHandler } from './traits/error-handler';

class Parser {
	protected compileLevel: 'Debug' | 'Release' = 'Debug';
	protected stream: TokenStream;
	protected fileId: string = '';
	protected source: string = '';

	constructor() {
		this.stream = new TokenStream();
	}

	set level(compileLevel: 'Debug' | 'Release') {
		$Log.$assert(
			/Debug|Release/.test(compileLevel),
			"Compile Level must be either 'Debug' or 'Release'",
		);

		this.compileLevel = compileLevel;
	}

	public set input(data: { source: string; tokens: IToken[]; fileId: string }) {
		this.stream.input = data.tokens;
		this.source = data.source;

		this.fileId = data.fileId;
	}

	parse(): SourceFileNode {
		throw new Error('NOT IMPLEMENTED');
	}
}

export const BaseParser = ErrorHandler(Parser);

// export interface BaseParser extends ErrorHandler {}

// applyMixins(BaseParser, [ErrorHandler]);
