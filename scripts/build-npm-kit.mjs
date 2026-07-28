import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destination = path.join(root, "dist");

const payload = [
  ".codex/config.toml",
  "AGENTS.md",
  "KE-HELP.md",
  "examples/sample-data",
  "platform/ke-kintone-mcp/.env.example",
  "platform/ke-kintone-mcp/attachments/.gitkeep",
  "platform/ke-kintone-mcp/package-lock.json",
  "platform/ke-kintone-mcp/package.json",
  "platform/ke-kintone-mcp/scripts",
  "projects/_template",
  "scripts/export-markdown-html.mjs",
  "scripts/init-customer-project.ps1",
  "skills",
];

async function filesBelow(absolutePath, relativePath) {
  const result = [];
  for (const entry of await readdir(absolutePath, { withFileTypes: true })) {
    const absolute = path.join(absolutePath, entry.name);
    const relative = path.posix.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await filesBelow(absolute, relative)));
    } else {
      result.push({ absolute, relative });
    }
  }
  return result;
}

const payloadFiles = [];
for (const relativePath of payload) {
  const absolutePath = path.join(root, relativePath);
  if ((await stat(absolutePath)).isDirectory()) {
    payloadFiles.push(
      ...(await filesBelow(
        absolutePath,
        relativePath.split(path.sep).join("/"),
      )),
    );
  } else {
    payloadFiles.push({
      absolute: absolutePath,
      relative: relativePath.split(path.sep).join("/"),
    });
  }
}

payloadFiles.push({
  absolute: path.join(root, ".gitignore"),
  relative: "gitignore.template",
});
payloadFiles.sort((left, right) => left.relative.localeCompare(right.relative));

const records = await Promise.all(
  payloadFiles.map(async ({ absolute, relative }) => ({
    path: relative,
    content: (await readFile(absolute)).toString("base64"),
  })),
);
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const payloadBase64 = gzipSync(Buffer.from(JSON.stringify(records))).toString("base64");
const cliTemplate = await readFile(path.join(root, "cli", "ke-installer.mjs"), "utf8");
const cli = cliTemplate
  .replace("__KE_PACKAGE_NAME__", packageJson.name)
  .replace("__KE_PACKAGE_VERSION__", packageJson.version)
  .replace("__KE_PAYLOAD_BASE64__", payloadBase64);

if (cli.includes("__KE_PAYLOAD_BASE64__")) {
  throw new Error("Failed to embed the KE payload in the installer.");
}

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await writeFile(path.join(destination, "ke-installer.mjs"), cli, {
  encoding: "utf8",
  mode: 0o755,
});

console.log(
  `Built one-file KE installer (${records.length} files, ${payloadBase64.length} embedded bytes).`,
);
