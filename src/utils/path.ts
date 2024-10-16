import path from "node:path";
import { WORKING_DIRECTORY } from "../constants";

export function join(...paths: string[]) {
  return path.join(WORKING_DIRECTORY, ...paths);
}
