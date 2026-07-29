import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const runtimeRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const launcher = path.join(
  runtimeRoot,
  "node_modules",
  "@officecli",
  "officecli",
  "officecli.js",
);
const invocationRoot = process.env.INIT_CWD
  ? path.resolve(process.env.INIT_CWD)
  : process.cwd();

const child = spawn(process.execPath, [launcher, ...process.argv.slice(2)], {
  cwd: invocationRoot,
  env: {
    ...process.env,
    OFFICECLI_SKIP_UPDATE: "1",
  },
  stdio: "inherit",
  shell: false,
});

child.on("error", (error) => {
  console.error(`Unable to start OfficeCLI: ${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`OfficeCLI stopped by signal ${signal}.`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
