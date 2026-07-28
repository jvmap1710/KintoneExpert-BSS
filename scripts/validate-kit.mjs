import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

async function exists(relativePath) {
  try {
    await stat(path.join(repositoryRoot, relativePath));
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function requirePath(relativePath) {
  if (!(await exists(relativePath))) failures.push(`Missing: ${relativePath}`);
}

async function readText(relativePath) {
  return readFile(path.join(repositoryRoot, relativePath), "utf8");
}

for (const required of [
  "AGENTS.md",
  "README.md",
  "package.json",
  "cli/ke-installer.mjs",
  ".codex/config.toml",
  "projects/_template/PROJECT.md",
  "projects/_template/input/.gitkeep",
  "projects/_template/private/.gitkeep",
  "output/.gitkeep",
  "examples/sample-data/survey-responses.csv",
  "examples/sample-data/purchase-requests.csv",
  "scripts/init-customer-project.ps1",
  "scripts/export-markdown-html.mjs",
  "scripts/build-npm-kit.mjs",
  "scripts/setup.mjs",
]) {
  await requirePath(required);
}

const skillRoot = path.join(repositoryRoot, "skills");
const skillDirectories = (await readdir(skillRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const config = await readText(".codex/config.toml");

for (const skillName of skillDirectories) {
  const skillFile = `skills/${skillName}/SKILL.md`;
  const agentFile = `skills/${skillName}/agents/openai.yaml`;
  await requirePath(skillFile);
  await requirePath(agentFile);
  if (!(await exists(skillFile)) || !(await exists(agentFile))) continue;

  const skill = await readText(skillFile);
  const agent = await readText(agentFile);
  if (!skill.startsWith("---\n")) failures.push(`${skillFile}: missing YAML frontmatter`);
  if (!new RegExp(`^name: ${skillName}$`, "mu").test(skill)) {
    failures.push(`${skillFile}: name must match folder`);
  }
  if (!/^description:\s*".+"/mu.test(skill)) {
    failures.push(`${skillFile}: quoted description is required`);
  }
  if (!agent.includes(`$${skillName}`)) {
    failures.push(`${agentFile}: default prompt must mention $${skillName}`);
  }
  if (!config.includes(`path = "skills/${skillName}"`)) {
    failures.push(`.codex/config.toml: ${skillName} is not registered`);
  }
}

const templateDirectories = (
  await readdir(path.join(repositoryRoot, "projects", "_template"), {
    withFileTypes: true,
  })
)
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
if (templateDirectories.join(",") !== "input,private") {
  failures.push(
    `projects/_template: expected only input,private; found ${templateDirectories.join(",")}`,
  );
}

const gitignore = await readText(".gitignore");
for (const rule of ["projects/*", "!projects/_template/**", "output/*", "!output/.gitkeep"]) {
  if (!gitignore.includes(rule)) failures.push(`.gitignore: missing ${rule}`);
}

const packageJson = JSON.parse(await readText("platform/ke-kintone-mcp/package.json"));
if (packageJson.scripts?.["customize:ot"]) {
  failures.push("package.json: trial customize:ot script must not be published");
}
if (await exists("platform/ke-kintone-mcp/scripts/upload-ot-customization.mjs")) {
  failures.push("OT trial uploader must not be published");
}

const rootPackageJson = JSON.parse(await readText("package.json"));
if (rootPackageJson.private) failures.push("Root npm installer package must be publishable");
if (rootPackageJson.bin?.["kintone-expert-bss"] !== "cli/ke-installer.mjs") {
  failures.push("Root npm installer package must expose the kintone-expert-bss CLI");
}

const textExtensions = new Set([
  ".md",
  ".yaml",
  ".yml",
  ".toml",
  ".json",
  ".js",
  ".mjs",
  ".ps1",
]);
const excludedDirectories = new Set([".git", "node_modules", "attachments", "output"]);

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await scan(absolute);
      continue;
    }
    if (!textExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    if (entry.name === ".env") continue;
    const relative = path.relative(repositoryRoot, absolute).split(path.sep).join("/");
    const content = await readFile(absolute, "utf8");
    if (/[\u00c3\u00c6]|\u00e2[\u0080-\u00bf]/u.test(content)) {
      failures.push(`${relative}: possible mojibake`);
    }
    if (
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u.test(content) ||
      /KINTONE_(?:PASSWORD|API_TOKEN)=\S+/u.test(content)
    ) {
      failures.push(`${relative}: possible populated secret`);
    }
  }
}

await scan(repositoryRoot);

if (failures.length) {
  console.error("KE Kit validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `KE Kit validation passed (${skillDirectories.length} skills, minimal project template, protected output).`,
);
