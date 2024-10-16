import { z } from "zod";
import type { IEnv } from "./cli/types";

export {};

export const EnvSchema = z.object({
  VERBOSITY: z.coerce.number(),
  OPT_LEVEL: z.coerce.number(),
  SC_SKIP_CACHE: z.coerce.boolean(),
});

declare global {
  namespace NodeJS {
    interface ProcessEnv extends IEnv {}
  }
}
