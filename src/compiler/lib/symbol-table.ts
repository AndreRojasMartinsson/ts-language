export interface ISymbol {
	[attributeKey: string]: any;
}

export class SymbolTable {
	private symbols: Map<string, Symbol>;

	constructor(public parent?: SymbolTable) {
		this.symbols = new Map();
	}

	allocate() {
		return new SymbolTable(this);
	}

	free() {
		this.symbols.clear();
	}

	insert(name: string, attributes?: ISymbol) {
		if (this.symbols.has(name)) return;

		const symbol = new Symbol(attributes);
		this.symbols.set(name, symbol);
	}

	set(name: string, key: string, value: any) {
		const symbol = this.symbols.get(name);
		if (!symbol) return;

		symbol.set(key, value);

		this.symbols.set(name, symbol);
	}
	get(name: string, key: string) {
		return this.symbols.get(name)?.get(key);
	}

	lookup(name: string, lookupParent = true): ISymbol | undefined {
		if (!lookupParent) return this.symbols.get(name);

		return this.symbols.get(name) ?? (this.parent ? this.parent.lookup(name) : undefined);
	}

	getSymbols() {
		return Object.freeze(structuredClone(this.symbols));
	}
}

export class Symbol implements ISymbol {
	constructor(private attributes: ISymbol = {}) {}

	set(key: string, value: any) {
		this.attributes[key] = value;
	}

	get(key: string) {
		return this.attributes[key];
	}

	free() {
		this.attributes = {};
	}
}
