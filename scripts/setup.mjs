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
  console.log("Created a local placeholder configuration from .env.example.");
}

console.log("First use:");
console.log("1. Open and trust this repository in Codex, then describe your goal in natural language.");
console.log("2. Say hello for KE's eight entry choices, or address a suitable expert directly (for example, 'Tèo, review this process').");
console.log("3. Offline advice, requirements, and architecture work do not need Kintone credentials or a browser sign-in.");
console.log("4. For persistent project work, KE will summarize a new project's identity and objective, wait for your confirmation, then create the workspace folders. A greeting or ad-hoc answer creates no project.");
console.log("5. Only when the requested task needs live Kintone access, configure credentials in platform/ke-kintone-mcp/.env and run: npm --prefix platform/ke-kintone-mcp run check");
console.log("6. A tenant connection test is a separate read. After you approve a named test plan, run:");
console.log("   npm --prefix platform/ke-kintone-mcp run test:connection -- --environment test --approved-test-plan <APPROVAL_REFERENCE> --app <APP_ID>");
console.log("   Do not run this tenant call during generic setup or for offline advice.");
console.log("7. Sign in manually only when a requested browser-based check or UI evidence requires it. OfficeCLI checks are needed only for requested Office documents.");
console.log("This setup creates no project workspace, makes no tenant request, and does not start a browser.");
