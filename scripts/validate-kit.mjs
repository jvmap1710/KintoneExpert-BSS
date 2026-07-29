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
  "projects/_template/TEAM-NOTES.md",
  "projects/_template/analysis/.gitkeep",
  "projects/_template/history/.gitkeep",
  "projects/_template/input/.gitkeep",
  "projects/_template/private/.gitkeep",
  "scripts/init-customer-project.ps1",
  "scripts/export-markdown-html.mjs",
  "scripts/build-npm-kit.mjs",
  "scripts/setup.mjs",
  "platform/ke-browser-mcp/package.json",
  "platform/ke-browser-mcp/package-lock.json",
  "platform/ke-office-cli/package.json",
  "platform/ke-office-cli/package-lock.json",
  "platform/ke-office-cli/scripts/run-officecli.mjs",
  "platform/ke-kintone-mcp/scripts/get-app-url.mjs",
  "platform/ke-kintone-mcp/scripts/lib/kintone-rest.mjs",
  "platform/ke-kintone-mcp/scripts/lib/customization-verification.mjs",
  "platform/ke-kintone-mcp/scripts/lib/process-management-verification.mjs",
  "platform/ke-kintone-mcp/scripts/stage-app-customization.mjs",
  "platform/ke-kintone-mcp/scripts/stage-process-management.mjs",
  "platform/ke-kintone-mcp/scripts/test-runtime-helpers.mjs",
  "skills/ke-engineer-leba/references/javascript-customization.md",
  "skills/ke-engineer-leba/references/process-management.md",
  "skills/ke-engineer-leba/references/record-query-diagnostics.md",
  "skills/ke-engineer-leba/references/build-and-deploy-template.md",
  "skills/ke-pm-ti/references/delivery-plan.md",
  "skills/ke-pm-ti/references/project-control-template.md",
  "skills/ke-pm-ti/references/handover-improvement-template.md",
  "skills/ke-ba-teo/references/intake-template.md",
  "skills/ke-ba-teo/references/discovery-analysis.md",
  "skills/ke-ba-teo/references/discovery-assessment-template.md",
  "skills/ke-ba-teo/references/requirements-catalog-template.md",
  "skills/ke-ba-teo/references/brd-outline.md",
  "skills/ke-sa-laude/references/solution-blueprint.md",
  "skills/ke-tester-mit/references/smoke-test-evidence.md",
  "skills/ke-tester-mit/references/quick-verification.md",
  "skills/ke-tester-mit/references/quick-verification-result-template.md",
  "skills/ke-tester-mit/references/test-case-template.md",
  "skills/ke-tester-mit/references/uat-release-template.md",
  "skills/ke-router/references/browser-evidence.md",
  "skills/ke-router/references/language-preferences.md",
  "skills/ke-router/references/delivery-lifecycle.md",
  "skills/ke-router/references/phase-template-index.md",
  "skills/ke-router/references/team-collaboration.md",
  "skills/ke-expert-panel-co/references/decision-record.md",
  "skills/ke-document-writer/references/user-guide.md",
  "skills/ke-document-writer/references/office-output.md",
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
if (templateDirectories.join(",") !== "analysis,history,input,output,private") {
  failures.push(
    `projects/_template: expected analysis,history,input,output,private; found ${templateDirectories.join(",")}`,
  );
}

const projectTemplate = await readText("projects/_template/PROJECT.md");
const teamNotesTemplate = await readText("projects/_template/TEAM-NOTES.md");
const projectInitializer = await readText("scripts/init-customer-project.ps1");
for (const placeholder of [
  "{{PROJECT_SLUG}}",
  "{{PROJECT_TYPE}}",
  "{{DISPLAY_NAME}}",
  "{{OBJECTIVE}}",
  "{{CREATED_DATE}}",
  "{{ENTRY_ROUTE}}",
  "{{DELIVERY_TRACK}}",
  "{{CURRENT_PHASE}}",
]) {
  if (!projectTemplate.includes(placeholder)) {
    failures.push(`projects/_template/PROJECT.md: missing ${placeholder}`);
  }
  if (!projectInitializer.includes(placeholder)) {
    failures.push(`scripts/init-customer-project.ps1: does not replace ${placeholder}`);
  }
}
for (const contract of [
  "Current gate",
  "Baseline status",
  "Open blockers",
  "Artifact index",
  "Last handoff",
  "Next action",
  "TEAM-NOTES.md",
]) {
  if (!projectTemplate.includes(contract)) {
    failures.push(`projects/_template/PROJECT.md: missing dashboard contract: ${contract}`);
  }
}
for (const contract of [
  "{{DISPLAY_NAME}}",
  "Target role",
  "Related sources",
  "Response / Resolution",
  "Finding | Question | Conflict | Assumption | Risk",
  "Open | In Review | Answered | Confirmed | Closed",
]) {
  if (!teamNotesTemplate.includes(contract)) {
    failures.push(`projects/_template/TEAM-NOTES.md: missing note contract: ${contract}`);
  }
}
for (const contract of [
  "'analysis', 'demo', 'customer', 'assessment'",
  "'discovery-intake'",
  "'customer-context'",
  "'current-state'",
  "'future-state'",
  "'demo-fast-track'",
  "'project-delivery'",
  "'existing-solution'",
  "'expert-consultation'",
  "TEAM-NOTES.md",
]) {
  if (!projectInitializer.includes(contract)) {
    failures.push(`init-customer-project.ps1: missing lifecycle option: ${contract}`);
  }
}

const gitignore = await readText(".gitignore");
for (const rule of ["projects/*", "!projects/_template/**"]) {
  if (!gitignore.includes(rule)) failures.push(`.gitignore: missing ${rule}`);
}

const packageJson = JSON.parse(await readText("platform/ke-kintone-mcp/package.json"));
if (packageJson.scripts?.["app:url"] !== "node --env-file=.env scripts/get-app-url.mjs") {
  failures.push("package.json: safe app:url command is missing");
}
if (
  packageJson.scripts?.["customization:stage"] !==
  "node --env-file=.env scripts/stage-app-customization.mjs"
) {
  failures.push("package.json: shared customization staging command is missing");
}
if (
  packageJson.scripts?.["process:stage"] !==
  "node --env-file=.env scripts/stage-process-management.mjs"
) {
  failures.push("package.json: shared Process Management staging command is missing");
}
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

const browserPackageJson = JSON.parse(
  await readText("platform/ke-browser-mcp/package.json"),
);
if (browserPackageJson.dependencies?.["@playwright/mcp"] !== "0.0.78") {
  failures.push("ke-browser-mcp: Playwright MCP version is not pinned");
}
if (browserPackageJson.dependencies?.["chrome-devtools-mcp"] !== "1.6.0") {
  failures.push("ke-browser-mcp: Chrome DevTools MCP version is not pinned");
}
if (!browserPackageJson.scripts?.["mcp:chrome-devtools"]?.includes(
  "--redact-network-headers",
)) {
  failures.push("ke-browser-mcp: Chrome DevTools network headers are not redacted");
}

const officePackageJson = JSON.parse(
  await readText("platform/ke-office-cli/package.json"),
);
if (officePackageJson.dependencies?.["@officecli/officecli"] !== "1.0.143") {
  failures.push("ke-office-cli: OfficeCLI version is not pinned");
}
if (officePackageJson.scripts?.office !== "node scripts/run-officecli.mjs") {
  failures.push("ke-office-cli: pinned OfficeCLI wrapper is missing");
}
if (rootPackageJson.scripts?.office !==
  "npm --prefix platform/ke-office-cli run office --") {
  failures.push("Root package: OfficeCLI command is missing");
}

const agentsRules = await readText("AGENTS.md");
const engineerSkill = await readText("skills/ke-engineer-leba/SKILL.md");
const customizationKnowledge = await readText(
  "skills/ke-engineer-leba/references/javascript-customization.md",
);
const processManagementKnowledge = await readText(
  "skills/ke-engineer-leba/references/process-management.md",
);
const testerSkill = await readText("skills/ke-tester-mit/SKILL.md");
const routerSkill = await readText("skills/ke-router/SKILL.md");
const pmSkill = await readText("skills/ke-pm-ti/SKILL.md");
const baSkill = await readText("skills/ke-ba-teo/SKILL.md");
const saSkill = await readText("skills/ke-sa-laude/SKILL.md");
const deliveryLifecycle = await readText(
  "skills/ke-router/references/delivery-lifecycle.md",
);
const entryRouting = await readText(
  "skills/ke-router/references/entry-routing.md",
);
const teamCollaboration = await readText(
  "skills/ke-router/references/team-collaboration.md",
);
const phaseTemplateIndex = await readText(
  "skills/ke-router/references/phase-template-index.md",
);
const smokeTestKnowledge = await readText(
  "skills/ke-tester-mit/references/smoke-test-evidence.md",
);
const quickVerificationKnowledge = await readText(
  "skills/ke-tester-mit/references/quick-verification.md",
);
const recordQueryKnowledge = await readText(
  "skills/ke-engineer-leba/references/record-query-diagnostics.md",
);
const browserEvidenceKnowledge = await readText(
  "skills/ke-router/references/browser-evidence.md",
);
const languagePreferencesKnowledge = await readText(
  "skills/ke-router/references/language-preferences.md",
);
const documentWriterSkill = await readText("skills/ke-document-writer/SKILL.md");
const userGuideKnowledge = await readText(
  "skills/ke-document-writer/references/user-guide.md",
);
const officeOutputKnowledge = await readText(
  "skills/ke-document-writer/references/office-output.md",
);
for (const [skillName, skill, references] of [
  [
    "ke-router",
    routerSkill,
    ["delivery-lifecycle.md", "phase-template-index.md", "team-collaboration.md"],
  ],
  [
    "ke-pm-ti",
    pmSkill,
    [
      "delivery-plan.md",
      "project-control-template.md",
      "handover-improvement-template.md",
    ],
  ],
  [
    "ke-ba-teo",
    baSkill,
    [
      "intake-template.md",
      "discovery-analysis.md",
      "discovery-assessment-template.md",
      "requirements-catalog-template.md",
      "brd-outline.md",
    ],
  ],
  ["ke-sa-laude", saSkill, ["solution-blueprint.md"]],
  ["ke-engineer-leba", engineerSkill, ["build-and-deploy-template.md"]],
  [
    "ke-tester-mit",
    testerSkill,
    [
      "test-case-template.md",
      "quick-verification-result-template.md",
      "uat-release-template.md",
    ],
  ],
]) {
  for (const reference of references) {
    if (!skill.includes(reference)) {
      failures.push(`${skillName}: phase template is not linked: ${reference}`);
    }
  }
}
for (const phase of [
  "Engagement Setup",
  "Discovery Intake",
  "Customer Context",
  "Current-State Assessment",
  "Future-State Design",
  "Solution Architecture",
  "Build / stage / deploy",
  "Quick Verification",
  "Smoke Test",
  "UAT / release",
  "Handover / improve",
]) {
  if (!phaseTemplateIndex.includes(phase)) {
    failures.push(`phase-template-index.md: lifecycle phase is missing: ${phase}`);
  }
}
for (const gate of ["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7"]) {
  if (!deliveryLifecycle.includes(gate) || !phaseTemplateIndex.includes(gate)) {
    failures.push(`Delivery lifecycle/template index: quality gate is missing: ${gate}`);
  }
}
for (const route of [
  "Discovery Intake",
  "Customer Context",
  "Current-State Assessment / As-Is Analysis",
  "Future-State Design / To-Be Analysis",
  "Demo / PoC Fast Track",
  "Project Delivery",
  "Existing Solution Assessment",
  "Expert Consultation / Expert Panel",
]) {
  if (!entryRouting.includes(route) || !routerSkill.includes(route)) {
    failures.push(`Router: entry route is missing: ${route}`);
  }
}
for (const contract of [
  "PROJECT.md",
  "TEAM-NOTES.md",
  "Context preflight",
  "Do not overwrite another role's statement",
  "Promote a confirmed decision",
  "Never use context from another project workspace",
]) {
  if (!teamCollaboration.includes(contract)) {
    failures.push(`team-collaboration.md: missing contract: ${contract}`);
  }
}
for (const [role, skill] of [
  ["ke-pm-ti", pmSkill],
  ["ke-ba-teo", baSkill],
  ["ke-sa-laude", saSkill],
  ["ke-engineer-leba", engineerSkill],
  ["ke-tester-mit", testerSkill],
]) {
  if (!skill.includes("team-collaboration.md")) {
    failures.push(`${role}: project context preflight is missing`);
  }
}
for (const statement of [
  "chat_language",
  "document_languages",
  "one complete standalone file per language",
  "explicit instruction in the current conversation",
]) {
  if (!languagePreferencesKnowledge.includes(statement)) {
    failures.push(`language-preferences.md: missing contract: ${statement}`);
  }
}
for (const statement of [
  "--chat-language",
  "--document-languages",
  "Preferred chat language",
  "English, Vietnamese",
  "ke-preferences.toml",
]) {
  const installer = await readText("cli/ke-installer.mjs");
  if (!installer.includes(statement)) {
    failures.push(`ke-installer.mjs: missing language option: ${statement}`);
  }
}
for (const oldIdentity of ["Sơn —", "Bình —", "Sơn/Son", "Bình/Binh"]) {
  for (const relativePath of ["AGENTS.md", "README.md", "KE-HELP.md", "skills/ke-router/SKILL.md"]) {
    if ((await readText(relativePath)).includes(oldIdentity)) {
      failures.push(`${relativePath}: old expert identity remains: ${oldIdentity}`);
    }
  }
}
for (const newIdentity of ["LauDe", "LeBa"]) {
  if (!agentsRules.includes(newIdentity)) {
    failures.push(`AGENTS.md: missing expert identity: ${newIdentity}`);
  }
}
for (const statement of [
  "HTML remains KE's default standalone format",
  "DOCX",
  "XLSX",
  "PPTX",
  "Do not offer PDF by default",
  "Office quality loop",
  "structural validation",
  "OFFICECLI_SKIP_UPDATE",
]) {
  if (!officeOutputKnowledge.includes(statement)) {
    failures.push(`office-output.md: missing contract: ${statement}`);
  }
}
for (const statement of [
  "use Playwright MCP",
  "Replay the documented critical path",
  "Embed only sanitized screenshots",
  "Rules and common error handling",
  "Scope and support",
  "not deleted without confirmation",
  "Verified:",
  "Observed:",
  "Draft:",
]) {
  if (!userGuideKnowledge.includes(statement)) {
    failures.push(`user-guide.md: missing contract: ${statement}`);
  }
}
if (!documentWriterSkill.includes("follow `references/user-guide.md`")) {
  failures.push("ke-document-writer: Playwright user-guide workflow is missing");
}
for (const statement of [
  "Playwright MCP is KE's primary browser channel",
  "Chrome DevTools MCP is KE's diagnostic microscope",
  "Re-run the user-visible path with Playwright",
  "never read, request, type, expose",
]) {
  if (!browserEvidenceKnowledge.includes(statement)) {
    failures.push(`browser-evidence.md: missing contract: ${statement}`);
  }
}
for (const server of ["playwright", "chrome-devtools"]) {
  if (!config.includes(`[mcp_servers.${server}]`)) {
    failures.push(`.codex/config.toml: ${server} MCP is not registered`);
  }
}
if (!agentsRules.includes("MCP is the default channel, not the exclusive channel")) {
  failures.push("AGENTS.md: MCP-first fallback contract is missing");
}
if (!engineerSkill.includes("without another channel-choice review")) {
  failures.push("ke-engineer-leba: approved REST execution contract is missing");
}
if (!engineerSkill.includes("supported channel per operation")) {
  failures.push("ke-engineer-leba: hybrid MCP/REST orchestration is missing");
}
if (!engineerSkill.includes("run app:url -- --app <APP_ID>")) {
  failures.push("ke-engineer-leba: post-deploy App URL contract is missing");
}
if (!engineerSkill.includes("Never infer missing permissions")) {
  failures.push("ke-engineer-leba: empty-query diagnostic guardrail is missing");
}
for (const statement of [
  "no visible record",
  "successful unfiltered response with zero rows is inconclusive",
  "confirmation before writing",
]) {
  if (!recordQueryKnowledge.includes(statement)) {
    failures.push(`record-query-diagnostics.md: missing contract: ${statement}`);
  }
}
for (const statement of [
  "create 5–10 marked synthetic records",
  "always publish a standalone HTML test report",
  "configuration inspection a smoke test",
]) {
  if (!testerSkill.includes(statement)) {
    failures.push(`ke-tester-mit: missing smoke-test contract: ${statement}`);
  }
}
for (const statement of [
  "mandatory change-level QA gate",
  "before KE gives the task's final completion response",
  "Select 1–3 checks",
  "Do not create records",
  "On `FAIL`, hand the defect back to LeBa",
  "Do not start the 5–10 case/record smoke test automatically",
  "user explicitly says `OK`",
]) {
  if (!quickVerificationKnowledge.includes(statement)) {
    failures.push(`quick-verification.md: missing contract: ${statement}`);
  }
}
for (const statement of [
  "Mandatory Mít quick-verification gate",
  "LeBa hand-off → Mít Quick Verification",
  "Do not give the task's final completion response",
]) {
  if (!engineerSkill.includes(statement)) {
    failures.push(`ke-engineer-leba: missing quick-verification contract: ${statement}`);
  }
}
for (const statement of [
  "run the mandatory targeted",
  "Do not label this gate a smoke test",
  "user explicitly says `OK`",
]) {
  if (!testerSkill.includes(statement)) {
    failures.push(`ke-tester-mit: missing verification gate: ${statement}`);
  }
}
for (const statement of [
  "Configuration verification",
  "API functional test",
  "Browser runtime test",
  "Never write `smoke test PASS`",
  "Never delete them without",
  "Mandatory HTML report",
]) {
  if (!smokeTestKnowledge.includes(statement)) {
    failures.push(`smoke-test-evidence.md: missing contract: ${statement}`);
  }
}
for (const statement of [
  "configuration staging area, not a second runnable App",
  "After deploy:",
  "starting a new chat will not create that tool",
  "Do not require the temporary Upload File",
  "X-Cybozu-Authorization",
  "Never deploy an unverified preview revision",
]) {
  if (!customizationKnowledge.includes(statement)) {
    failures.push(`javascript-customization.md: missing contract: ${statement}`);
  }
}
for (const statement of [
  "capability gap",
  "complete replacement sets",
  "process:stage",
  "separate deployment confirmation",
  "do not guess a localized",
  "--allow-removals",
  "against the pre-live form",
]) {
  if (!processManagementKnowledge.includes(statement)) {
    failures.push(`process-management.md: missing contract: ${statement}`);
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
  `KE Kit validation passed (${skillDirectories.length} skills, lifecycle project template, protected output).`,
);
