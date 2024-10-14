import path from "node:path";
import { $ } from "bun";

const TARGETS = [
  "bun-linux-x64-modern",
  "bun-linux-arm64",
  "bun-windows-x64-modern",
  "bun-darwin-arm64",
  "bun-darwin-x64",
];

for (const target of TARGETS) {
  await $`bun build --compile --minify --sourcemap --bytecode cli/main.ts --target=${target} --outfile dist/${target.split("-").slice(1).join("-")}`;
}
