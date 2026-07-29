import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  access,
  appendFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const tempParent = path.join(repositoryRoot, ".tmp");
const powershell = process.platform === "win32" ? "powershell.exe" : "pwsh";
const expectedDirectories = ["analysis", "history", "input", "output", "private"];
const routeCases = [
  ["discovery", "analysis", "discovery-intake", "Discovery Intake", "Analysis"],
  ["context", "analysis", "customer-context", "Customer Context", "Analysis"],
  [
    "current",
    "analysis",
    "current-state",
    "Current-State Assessment / As-Is Analysis",
    "Analysis",
  ],
  [
    "future",
    "analysis",
    "future-state",
    "Future-State Design / To-Be Analysis",
    "Analysis",
  ],
  ["demo", "demo", "demo-fast-track", "Demo / PoC Fast Track", "Demo / PoC"],
  ["delivery", "customer", "project-delivery", "Project Delivery", "Real Project"],
  [
    "assessment",
    "assessment",
    "existing-solution",
    "Existing Solution Assessment",
    "Assessment",
  ],
  [
    "consultation",
    "analysis",
    "expert-consultation",
    "Expert Consultation / Expert Panel",
    "Analysis",
  ],
];
const defaultCases = [
  ["default-analysis", "analysis", "Discovery Intake", "Analysis"],
  ["default-demo", "demo", "Demo / PoC Fast Track", "Demo / PoC"],
  ["default-customer", "customer", "Project Delivery", "Real Project"],
  [
    "default-assessment",
    "assessment",
    "Existing Solution Assessment",
    "Assessment",
  ],
];
const checks = [];

function record(name) {
  checks.push(name);
  console.log(`PASS  ${name}`);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repositoryRoot,
      env: process.env,
      shell: false,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve({ code, stdout, stderr }));
  });
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function runInitializer(
  installedRoot,
  { slug, type, route, name = `Test ${slug}`, objective = `Objective ${slug}` },
) {
  const script = path.join(installedRoot, "scripts", "init-customer-project.ps1");
  const args = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    script,
    "-ProjectSlug",
    slug,
    "-DisplayName",
    name,
    "-ProjectType",
    type,
    "-Objective",
    objective,
  ];
  if (route) args.push("-EntryRoute", route);
  return run(powershell, args, { cwd: installedRoot });
}

async function readProject(installedRoot, slug) {
  return readFile(
    path.join(installedRoot, "projects", slug, "PROJECT.md"),
    "utf8",
  );
}

await mkdir(tempParent, { recursive: true });
const sandbox = await mkdtemp(path.join(tempParent, "kit-flow-"));
const resolvedTempParent = await realpath(tempParent);
const resolvedSandbox = await realpath(sandbox);
if (
  !resolvedSandbox.startsWith(
    `${resolvedTempParent}${path.sep}`,
  )
) {
  throw new Error(`Unsafe test sandbox: ${resolvedSandbox}`);
}

try {
  const installedRoot = path.join(sandbox, "installed");
  await mkdir(installedRoot);
  const installer = path.join(repositoryRoot, "dist", "ke-installer.mjs");
  const installResult = await run(process.execPath, [
    installer,
    "install",
    "--directory",
    installedRoot,
    "--yes",
    "--skip-deps",
    "--chat-language",
    "Vietnamese",
    "--document-languages",
    "English, Vietnamese, English",
  ]);
  assert.equal(installResult.code, 0, installResult.stderr || installResult.stdout);
  const preferences = await readFile(
    path.join(installedRoot, ".codex", "ke-preferences.toml"),
    "utf8",
  );
  assert.match(preferences, /chat_language = "Vietnamese"/u);
  assert.match(
    preferences,
    /document_languages = \["English", "Vietnamese"\]/u,
  );
  record("installer writes and deduplicates language preferences");

  const skills = (await readdir(path.join(installedRoot, "skills"))).sort();
  assert(skills.includes("ke-sa-laude"));
  assert(skills.includes("ke-engineer-leba"));
  assert(!skills.includes("ke-sa-son"));
  assert(!skills.includes("ke-engineer-binh"));
  record("installer contains only current expert identities");

  const router = await readFile(
    path.join(installedRoot, "skills", "ke-router", "SKILL.md"),
    "utf8",
  );
  const entryRouting = await readFile(
    path.join(
      installedRoot,
      "skills",
      "ke-router",
      "references",
      "entry-routing.md",
    ),
    "utf8",
  );
  for (const [, , , label] of routeCases) {
    assert(router.includes(label), `Router menu missing: ${label}`);
    assert(entryRouting.includes(label), `Routing table missing: ${label}`);
  }
  record("router and routing table expose the same eight entry routes");

  for (const [id, type, route, label, track] of routeCases) {
    const slug = `route-${id}`;
    const result = await runInitializer(installedRoot, { slug, type, route });
    assert.equal(result.code, 0, result.stderr || result.stdout);
    const project = await readProject(installedRoot, slug);
    assert(project.includes(`| Entry route | ${label} |`));
    assert(project.includes(`| Delivery track | ${track} |`));
    assert(!/\{\{[A-Z_]+\}\}/u.test(project));
    const teamNotes = await readFile(
      path.join(installedRoot, "projects", slug, "TEAM-NOTES.md"),
      "utf8",
    );
    assert(teamNotes.includes(`# Test ${slug} — Team Notes`));
    const directories = (
      await readdir(path.join(installedRoot, "projects", slug), {
        withFileTypes: true,
      })
    )
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    assert.deepEqual(directories, expectedDirectories);
  }
  record("all eight entry routes create coherent isolated workspaces");

  for (const [slug, type, label, track] of defaultCases) {
    const result = await runInitializer(installedRoot, { slug, type });
    assert.equal(result.code, 0, result.stderr || result.stdout);
    const project = await readProject(installedRoot, slug);
    assert(project.includes(`| Entry route | ${label} |`));
    assert(project.includes(`| Delivery track | ${track} |`));
  }
  record("all four project types select safe default routes");

  const collisionSlug = "placeholder-collision";
  const collisionResult = await runInitializer(installedRoot, {
    slug: collisionSlug,
    type: "analysis",
    route: "discovery-intake",
    name: "ACME | Discovery\nTeam",
    objective: "Keep literal {{ENTRY_ROUTE}} and A | B\nSecond line",
  });
  assert.equal(
    collisionResult.code,
    0,
    collisionResult.stderr || collisionResult.stdout,
  );
  const collisionProject = await readProject(installedRoot, collisionSlug);
  assert(collisionProject.includes("ACME \\| Discovery Team"));
  assert(collisionProject.includes("Keep literal {{ENTRY_ROUTE}}"));
  assert(collisionProject.includes("A \\| B Second line"));
  record("template replacement is single-pass and Markdown-safe");

  const isolatedA = path.join(
    installedRoot,
    "projects",
    "route-discovery",
    "TEAM-NOTES.md",
  );
  await appendFile(isolatedA, "\nPRIVATE-MARKER-A\n", "utf8");
  const isolatedB = await readFile(
    path.join(
      installedRoot,
      "projects",
      "route-context",
      "TEAM-NOTES.md",
    ),
    "utf8",
  );
  assert(!isolatedB.includes("PRIVATE-MARKER-A"));
  record("project context remains isolated");

  const duplicateBefore = await readProject(installedRoot, "route-discovery");
  const duplicateResult = await runInitializer(installedRoot, {
    slug: "route-discovery",
    type: "analysis",
    route: "discovery-intake",
  });
  assert.notEqual(duplicateResult.code, 0);
  assert.match(
    `${duplicateResult.stdout}\n${duplicateResult.stderr}`,
    /already exists/u,
  );
  assert.equal(
    await readProject(installedRoot, "route-discovery"),
    duplicateBefore,
  );
  record("duplicate workspace protection preserves existing content");

  const invalidSlugResult = await runInitializer(installedRoot, {
    slug: "Bad Slug",
    type: "analysis",
    route: "discovery-intake",
  });
  assert.notEqual(invalidSlugResult.code, 0);
  assert(!(await exists(path.join(installedRoot, "projects", "Bad Slug"))));
  record("invalid project slugs are rejected without residue");

  const incompatibleResult = await runInitializer(installedRoot, {
    slug: "invalid-demo-delivery",
    type: "demo",
    route: "project-delivery",
  });
  assert.notEqual(incompatibleResult.code, 0);
  assert.match(
    `${incompatibleResult.stdout}\n${incompatibleResult.stderr}`,
    /incompatible with ProjectType/u,
  );
  assert(
    !(await exists(
      path.join(installedRoot, "projects", "invalid-demo-delivery"),
    )),
  );
  record("incompatible entry-route/project-type pairs are rejected");

  const preferencesBefore = await readFile(
    path.join(installedRoot, ".codex", "ke-preferences.toml"),
    "utf8",
  );
  const reinstallResult = await run(process.execPath, [
    installer,
    "install",
    "--directory",
    installedRoot,
    "--yes",
    "--skip-deps",
  ]);
  assert.equal(
    reinstallResult.code,
    0,
    reinstallResult.stderr || reinstallResult.stdout,
  );
  assert.equal(
    await readFile(
      path.join(installedRoot, ".codex", "ke-preferences.toml"),
      "utf8",
    ),
    preferencesBefore,
  );
  record("safe reinstall preserves existing language preferences");

  const helpFile = path.join(installedRoot, "KE-HELP.md");
  await writeFile(helpFile, "LOCAL USER CONTENT\n", "utf8");
  const conflictResult = await run(process.execPath, [
    installer,
    "install",
    "--directory",
    installedRoot,
    "--yes",
    "--skip-deps",
  ]);
  assert.equal(conflictResult.code, 2);
  assert.match(conflictResult.stderr, /stopped to protect existing files/u);
  assert.equal(await readFile(helpFile, "utf8"), "LOCAL USER CONTENT\n");
  record("installer conflict protection refuses silent overwrite");

  const forceResult = await run(process.execPath, [
    installer,
    "install",
    "--directory",
    installedRoot,
    "--yes",
    "--skip-deps",
    "--force",
  ]);
  assert.equal(forceResult.code, 0, forceResult.stderr || forceResult.stdout);
  assert.notEqual(await readFile(helpFile, "utf8"), "LOCAL USER CONTENT\n");
  record("explicit force recovers a conflicting managed installation");

  console.log(`\nKE flow test passed (${checks.length} checks).`);
} finally {
  const cleanupTarget = await realpath(sandbox).catch(() => sandbox);
  if (
    cleanupTarget === resolvedTempParent ||
    !cleanupTarget.startsWith(`${resolvedTempParent}${path.sep}`)
  ) {
    throw new Error(`Refusing unsafe cleanup: ${cleanupTarget}`);
  }
  await rm(cleanupTarget, { recursive: true, force: true });
}
