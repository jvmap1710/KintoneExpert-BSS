import { copyFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";

const runtimeDir = path.join(process.cwd(), "platform", "ke-kintone-mcp");
const examplePath = path.join(runtimeDir, ".env.example");
const envPath = path.join(runtimeDir, ".env");

await access(examplePath, constants.R_OK);

try {
  await access(envPath, constants.F_OK);
  console.log("Local Kintone configuration already exists; .env was not overwritten.");
} catch {
  await copyFile(examplePath, envPath, constants.COPYFILE_EXCL);
  console.log("Created platform/ke-kintone-mcp/.env from .env.example.");
}

console.log("Next:");
console.log("1. Add the customer-specific Kintone credentials to the local .env file.");
console.log("2. Run: npm run kintone:check");
console.log("3. Run: npm run kintone:test");
console.log("4. Reopen this repository in Codex and trust the project.");
console.log("5. Let Playwright open Chrome and sign in to Kintone once when asked.");
console.log("6. Start a new chat and say: hello");
