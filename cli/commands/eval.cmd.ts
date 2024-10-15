import type { ICommand } from "../utils/command-file";
import readline from "readline";
import crypto from "node:crypto"
import { compileSourceFile } from "../../compiler";

export default {
  name: "eval",
  description: "REPL for the SC programming language",
  context: (builder) => builder.action(() => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "sc-repl> " })
    rl.prompt();

    const file = Bun.file(".repl-" + crypto.randomBytes(6).toString("hex") + ".out")
    const writer = file.writer({ highWaterMark: 1024 * 1024 })

    let multiInput = "";

    rl.on("line", async (line) => {
      const input = line.trim()

      if (input.endsWith("\\")) {
        multiInput += input.slice(0, -1) + "\n"
        rl.setPrompt("...>")
        rl.prompt()
      } else {
        if (input === "exit()") {
          rl.close();
          return
        }

        multiInput += input

        writer.write(multiInput + "\n")
        await writer.flush()

        await compileSourceFile(file.name!)

        multiInput = ""
        rl.setPrompt("sc-repl> ")
        rl.prompt()
      }
    })


    rl.on("close", () => {
      writer.end();

      Bun.spawnSync({
        cmd: ["rm", "-f", file.name!]
      })

      console.log("Goodbye!");
      process.exit()

    })


  })
} satisfies ICommand
