import type { ChalkInstance } from 'chalk';
import chalk from 'chalk';
import chalkTemplate from 'chalk-template';
import type { ICommand } from '../../cli/utils/command-file';
import assert from 'node:assert/strict';
import { inspect } from 'bun';

export const enum LEVEL {
	DEBUG,
	INFO,
	WARN,
	ERR,
	FATAL,
}

const LEVEL_NAMES: Record<LEVEL, string> = {
	[LEVEL.DEBUG]: 'DEBUG',
	[LEVEL.INFO]: 'INFO',
	[LEVEL.WARN]: 'WARNING',
	[LEVEL.ERR]: 'ERROR',
	[LEVEL.FATAL]: 'FATAL',
};

class Logger {
	private static logger: Logger;

	public static get instance() {
		if (this.logger === undefined) {
			this.logger = new Logger();
		}

		return this.logger;
	}

	private constructor() {}

	private minLevel: LEVEL = LEVEL.INFO;

	set level(logLevel: LEVEL) {
		this.minLevel = logLevel;
	}

	private getColorOfLevel(level: LEVEL): ChalkInstance {
		switch (level) {
			case LEVEL.INFO:
				return chalk.bgGray.whiteBright;
			case LEVEL.DEBUG:
				return chalk.bgBlueBright.whiteBright;
			case LEVEL.WARN:
				return chalk.bgHex('#F98129').whiteBright.italic;
			case LEVEL.ERR:
				return chalk.bgRedBright.whiteBright.bold;
			case LEVEL.FATAL:
				return chalk.bgHex('#670178').whiteBright.bold.italic;
		}
	}

	format(level: LEVEL, label: string, ...text: any[]) {
		if (level < this.minLevel) return;

		const prefix = this.getColorOfLevel(level)(` ${LEVEL_NAMES[level]} `);

		if (level > LEVEL.WARN) {
			text.push('\n' + new Error().stack?.split('\n').slice(4).join('\n'));
		}

		text = text.map(t => {
			return typeof t === 'object' ? inspect(t, { depth: 15, colors: true }) : t;
		});

		return chalkTemplate` ${prefix} {bgBlack.yellowBright [${label}]:} ${text.join(' ')}`;
	}
}

function log(level: LEVEL, label: string, ...text: any[]) {
	const message = Logger.instance.format(level, label, ...text);
	if (message === undefined) return;

	if (level > LEVEL.WARN) {
		console.error(message);
	} else {
		console.log(message);
	}
}

export namespace $Log {
	export const $level = (level: LEVEL) => (Logger.instance.level = level);
	export const $debug = (label: string, ...text: any[]) =>
		log(LEVEL.DEBUG, label, ...text);
	export const $info = (label: string, ...text: any[]) => log(LEVEL.INFO, label, ...text);
	export const $warn = (label: string, ...text: any[]) => log(LEVEL.WARN, label, ...text);
	export const $err = (label: string, ...text: any[]) => log(LEVEL.ERR, label, ...text);
	export const $fatal = (label: string, ...text: any[]): never => {
		log(LEVEL.FATAL, label, ...text);
		process.exit(1);
	};

	export const $assert: ICallableObject = function (value: unknown, message: string) {
		try {
			assert(value, message);
		} catch {
			return $fatal('ASSERTION', message);
		}
	} as ICallableObject;

	$assert.equal = (actual, expected, message) => {
		try {
			assert.equal(actual, expected, message);
		} catch {
			return $fatal(
				'ASSERTION:EQ',
				message,
				`(LEFT === ${expected}, RIGHT === ${actual})`,
			);
		}
	};

	$assert.notEqual = (actual, expected, message) => {
		try {
			assert.notEqual(actual, expected, message);
		} catch {
			return $fatal(
				'ASSERTION:NEQ',
				message,
				`(LEFT === ${expected}, RIGHT === ${actual})`,
			);
		}
	};
	$assert.deepEqual = (actual, expected, message) => {
		try {
			assert.equal(actual, expected, message);
		} catch {
			return $fatal(
				'ASSERTION:DEQ',
				message,
				`(LEFT === ${expected}, RIGHT === ${actual})`,
			);
		}
	};

	$assert.notDeepEqual = (actual, expected, message) => {
		try {
			assert.equal(actual, expected, message);
		} catch {
			return $fatal(
				'ASSERTION:NDEQ',
				message,
				`(LEFT === ${expected}, RIGHT === ${actual})`,
			);
		}
	};
}

interface ICallableObject {
	(value: unknown, message: string): void;
	equal(actual: unknown, expected: unknown, message: string): void;
	notEqual(actual: unknown, expected: unknown, message: string): void;
	deepEqual(actual: unknown, expected: unknown, message: string): void;
	notDeepEqual(actual: unknown, expected: unknown, message: string): void;
}
