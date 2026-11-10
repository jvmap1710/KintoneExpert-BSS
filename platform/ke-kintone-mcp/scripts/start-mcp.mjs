import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertSecureTls,
  loadEffectiveConfig,
  reportConfigConflicts,
} from "./lib/kintone-rest.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = await loadEffectiveConfig({
  envFilePath: path.join(packageRoot, ".env"),
});
reportConfigConflicts(config);
try {
  assertSecureTls(config.values);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const serverPath = path.join(
  packageRoot,
  "node_modules",
  "@kintone",
  "mcp-server",
  "dist",
  "index.js",
);
const child = spawn(process.execPath, [serverPath], {
  cwd: packageRoot,
  env: config.values,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", (error) => {
  console.error(`Unable to start the Kintone MCP server: ${error.message}`);
  process.exitCode = 1;
});
child.on("close", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
