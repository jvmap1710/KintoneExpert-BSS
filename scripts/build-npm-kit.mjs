import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destination = path.join(root, "npm-kit");

const payload = [
  ".codex/config.toml",
  "AGENTS.md",
  "KE-HELP.md",
  "examples/sample-data",
  "output/.gitkeep",
  "platform/ke-kintone-mcp/.env.example",
  "platform/ke-kintone-mcp/attachments/.gitkeep",
  "platform/ke-kintone-mcp/package-lock.json",
  "platform/ke-kintone-mcp/package.json",
  "platform/ke-kintone-mcp/scripts",
  "projects/_template",
  "scripts/export-markdown-html.mjs",
  "scripts/init-customer-project.ps1",
  "scripts/validate-kit.mjs",
  "skills",
];

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });

for (const relativePath of payload) {
  await cp(path.join(root, relativePath), path.join(destination, relativePath), {
    recursive: true,
    force: false,
    errorOnExist: true,
  });
}

await cp(path.join(root, ".gitignore"), path.join(destination, "gitignore.template"), {
  force: false,
  errorOnExist: true,
});

console.log(`Built npm installer payload (${payload.length} managed entries).`);
