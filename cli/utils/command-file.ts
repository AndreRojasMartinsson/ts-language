import { Command, program } from "commander";
import { z } from "zod";

export interface IOptions {
  [option: string]: unknown;
}

export interface ICommand {
  name: string;
  args?: string;
  description: string;
  context: (builder: Command) => void;
}

export const CommandSchema = z.strictObject({
  name: z.string(),
  args: z.string().optional(),
  description: z.string(),
  context: z.function(),
});
