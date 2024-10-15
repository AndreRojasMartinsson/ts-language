import { decompress } from "shrink-string";
import type { ICommand } from "../utils/command-file";
import path from "node:path"

export default {
  name: "run",
  args: "<file-path>",
  description: "Run a compiled SC file",
  context: (builder) => builder.action(async (inputPath: string) => {
    const fullPath = path.resolve(inputPath)
    const file = Bun.file(fullPath)

    const rawContent = await file.text();

    process.on("SIGINT", async () => {
      await Bun.write(fullPath, rawContent)
      process.exit(0)
    })

    process.on("SIGTERM", async () => {
      await Bun.write(fullPath, rawContent)
      process.exit(0)
    })

    try {
      const decompressed = await decompress(rawContent)

      await Bun.write(fullPath, decompressed)

      const { stdout, exitCode, stderr } = Bun.spawnSync({ cmd: ["bun", "run", `${fullPath}`] })

      if (exitCode === 1) {
        console.error(
          `ERROR WHILE EXECUTING CODE. RETURNED STATUS CODE 1: ${stderr.toString('utf8')}`,
        );
        process.exit(1);
      }

      const output = stdout.toString("utf-8")
      console.log(output);
    } catch (error) {
      console.error("An error occured during execution:", error)
    }
    finally {
      await Bun.write(fullPath, rawContent)
    }








    /*
        const tmpname = crypto.randomBytes(16).toString("hex")
        const tempName = `.tmp-${tmpname}.code`
    
        await Bun.write(tempName, code, { createPath: true });
    
        const { stdout, exitCode, stderr } = Bun.spawnSync({
          cmd: ['bun', 'run', `./${tempName}`],
        });
    
        if (exitCode === 1) {
          console.error(
            `ERROR WHILE EXECUTING CODE. RETURNED STATUS CODE 1: ${stderr.toString('utf8')}`,
          );
          process.exit(1);
        }
    
        const output = stdout.toString("utf-8")
        console.log(output);
    
        Bun.spawnSync({
          cmd: ["rm", "-f", tempName]
        });
    */



  })
} satisfies ICommand
