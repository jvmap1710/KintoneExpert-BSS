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
  "scripts/init-customer-project.ps1",
  "scripts/export-markdown-html.mjs",
  "scripts/build-npm-kit.mjs",
  "scripts/setup.mjs",
  "skills/ke-engineer-binh/references/javascript-customization.md",
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
  if (!/^---\r?\n/u.test(skill)) failures.push(`${skillFile}: missing YAML frontmatter`);
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
if (templateDirectories.join(",") !== "input,output,private") {
  failures.push(
    `projects/_template: expected input,output,private; found ${templateDirectories.join(",")}`,
  );
}

const projectTemplate = await readText("projects/_template/PROJECT.md");
const projectInitializer = await readText("scripts/init-customer-project.ps1");
for (const placeholder of [
  "{{PROJECT_SLUG}}",
  "{{PROJECT_TYPE}}",
  "{{DISPLAY_NAME}}",
  "{{OBJECTIVE}}",
  "{{CREATED_DATE}}",
]) {
  if (!projectTemplate.includes(placeholder)) {
    failures.push(`projects/_template/PROJECT.md: missing ${placeholder}`);
  }
  if (!projectInitializer.includes(placeholder)) {
    failures.push(`scripts/init-customer-project.ps1: does not replace ${placeholder}`);
  }
}

const gitignore = await readText(".gitignore");
for (const rule of ["projects/*", "!projects/_template/**"]) {
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
if (rootPackageJson.bin?.["kintone-expert-bss"] !== "dist/ke-installer.mjs") {
  failures.push("Root npm installer package must expose the kintone-expert-bss CLI");
}
if (rootPackageJson.bin?.ke !== "dist/ke-installer.mjs") {
  failures.push("Root npm installer package must expose the short ke CLI");
}
if (rootPackageJson.files?.join(",") !== "dist/,README.md") {
  failures.push("Root npm package must publish only dist/ and README.md");
}

const agentsRules = await readText("AGENTS.md");
const engineerSkill = await readText("skills/ke-engineer-binh/SKILL.md");
const customizationKnowledge = await readText(
  "skills/ke-engineer-binh/references/javascript-customization.md",
);
if (!agentsRules.includes("MCP is the default channel, not the exclusive channel")) {
  failures.push("AGENTS.md: MCP-first fallback contract is missing");
}
if (!engineerSkill.includes("without another channel-choice review")) {
  failures.push("ke-engineer-binh: approved REST execution contract is missing");
}
for (const statement of [
  "configuration staging area, not a second runnable App",
  "After deploy:",
  "starting a new chat will not create that tool",
]) {
  if (!customizationKnowledge.includes(statement)) {
    failures.push(`javascript-customization.md: missing contract: ${statement}`);
  }
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
const excludedDirectories = new Set([
  ".git",
  ".npm-cache",
  ".tmp",
  "attachments",
  "dist",
  "node_modules",
  "output",
]);

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
