import { program } from 'commander';
import packageJson from '../package.json';
import figlet from 'figlet';
import path from 'node:path';
import fs from 'node:fs/promises';
import { CommandSchema, type ICommand } from './utils/command-file';
import { $Log } from '../compiler/utils/logger';

function registerCommands(commands: ICommand[]) {
	for (const { name, description, context, args = '' } of commands) {
		const cmd = program.command(`${name} ${args}`).description(description);
		context(cmd);
	}
}

async function loadCommands(): Promise<ICommand[]> {
	const commandsDirectory = path.resolve('./cli/commands');

	let commandFiles: string[] = [];

	try {
		commandFiles = await fs.readdir(commandsDirectory, {
			recursive: false,
		});
	} catch (err) {
		return $Log.$fatal('LOAD_COMMANDS', err);
	}

	const commands: ICommand[] = [];

	for (const commandFile of commandFiles) {
		const file = await import(path.join(commandsDirectory, commandFile));
		if (!('default' in file)) {
			continue;
		}

		try {
			await CommandSchema.parseAsync(file.default);
			commands.push(file.default);
		} catch (err) {
			return $Log.$fatal('LOAD_COMMANDS', err);
		}
	}

	return commands;
}

async function initProgram() {
	program
		.name('sc')
		.description('CLI for the SC (SmartCode) language.')
		.version(packageJson.version)
		.addHelpText('beforeAll', figlet.textSync('SMARTCODE'))
		.addHelpText('before', ' For the Smarter Developer\n\n');

	const commands = await loadCommands();

	registerCommands(commands);

	program.parse(process.argv);
}

try {
	await initProgram();
} catch (err) {
	$Log.$fatal('MAIN', err);
}
