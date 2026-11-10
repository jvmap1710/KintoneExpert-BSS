#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8"));
const installerTemplate = await readFile(path.join(repositoryRoot, "cli", "ke-installer.mjs"), "utf8");
const tempRoot = await mkdtemp(path.join(tmpdir(), "ke-installer-hardening-"));
let checks = 0;

async function filesBelow(root, relative = "") {
  const files = [];
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...(await filesBelow(root, child)));
    else files.push(child);
  }
  return files;
}

async function makePayload({ omitNotesTemplate = false, failMigrationLate = false } = {}) {
  const payload = [
    ["AGENTS.md", "# KE instructions\n"],
    ["KE-HELP.md", "KE help payload\n"],
    ["gitignore.template", "# KE ignore rules\n"],
    [".codex/config.toml", [
      "[mcp_servers.kintone]",
      'command = "npm.cmd"',
      'args = ["--prefix", "platform/ke-kintone-mcp", "run", "mcp:kintone"]',
      "[[skills.config]]",
      'path = "skills/ke-router"',
      "enabled = true",
      "[[skills.config]]",
      'path = "skills/ke-pm-ti"',
      "enabled = true",
      "",
    ].join("\n")],
    ["platform/ke-kintone-mcp/.env.example", "KINTONE_BASE_URL=\n"],
    ["projects/_template/TEAM-NOTES.md", await readFile(path.join(repositoryRoot, "projects", "_template", "TEAM-NOTES.md"), "utf8")],
  ];
  for (const platform of ["platform/ke-kintone-mcp", "platform/ke-browser-mcp", "platform/ke-office-cli"]) {
    payload.push([`${platform}/package.json`, JSON.stringify({ name: "ke-installer-fixture", version: "1.0.0" })]);
    payload.push([`${platform}/package-lock.json`, JSON.stringify({ lockfileVersion: 3, requires: true, packages: { "": { name: "ke-installer-fixture", version: "1.0.0" } } })]);
  }
  payload.push(["scripts/migrate-projects.mjs", await readFile(path.join(repositoryRoot, "scripts", "migrate-projects.mjs"), "utf8")]);
  for (const relative of await filesBelow(repositoryRoot, "scripts/lib")) {
    payload.push([relative.replaceAll("\\", "/"), await readFile(path.join(repositoryRoot, relative), "utf8")]);
  }
  if (omitNotesTemplate) {
    const index = payload.findIndex(([relative]) => relative === "projects/_template/TEAM-NOTES.md");
    payload.splice(index, 1);
  }
  if (failMigrationLate) {
    const index = payload.findIndex(([relative]) => relative === "scripts/migrate-projects.mjs");
    payload[index][1] += '\nif (!args.includes("--dry-run") && process.env.KE_TEST_FAIL_MIGRATION === "1") throw new Error("Injected late migration failure");\n';
  }
  return payload
    .map(([relative, content]) => ({ path: relative.replaceAll("\\", "/"), content: Buffer.from(content).toString("base64") }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

async function buildInstaller(name, options) {
  const records = await makePayload(options);
  const compressed = gzipSync(Buffer.from(JSON.stringify(records))).toString("base64");
  const source = installerTemplate
    .replace("__KE_PACKAGE_NAME__", packageJson.name)
    .replace("__KE_PACKAGE_VERSION__", packageJson.version)
    .replace("__KE_PAYLOAD_BASE64__", compressed);
  const installer = path.join(tempRoot, `${name}.mjs`);
  await writeFile(installer, source, "utf8");
  return { installer, payload: records.map((record) => record.path) };
}

function runInstaller(installer, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [installer, ...args], {
      cwd: tempRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("exit", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

async function writeFixtureManifest(target, files, { schemaVersion = 1, version = "1.0.21" } = {}) {
  await mkdir(path.join(target, ".codex"), { recursive: true });
  await writeFile(path.join(target, ".codex", "ke-kit-manifest.json"), `${JSON.stringify({
    schemaVersion,
    package: packageJson.name,
    version,
    files: files.map((file) => file === "gitignore.template" ? ".gitignore" : file),
  }, null, 2)}\n`, "utf8");
}

async function writeLegacyProject(target) {
  const project = path.join(target, "projects", "legacy-assessment");
  await mkdir(path.join(project, "input"), { recursive: true });
  await writeFile(path.join(project, "customer-source.csv"), "customer data stays\n", "utf8");
  await writeFile(path.join(project, "input", "evidence.txt"), "evidence stays\n", "utf8");
  const markdown = [
    "# Legacy Assessment",
    "",
    "| Property | Value |",
    "| --- | --- |",
    "| Engagement type | Existing solution assessment |",
    "| Display name | Legacy Assessment |",
    "| Objective | Preserve this late-phase work |",
    "| Entry route | Current-State Assessment / As-Is Analysis |",
    "| Delivery track | Assessment |",
    "| Current phase | Legacy phase after approval |",
    "| Current gate | Legacy gate 2 |",
    "| Active owner | Legacy analyst |",
    "| Last handoff | Legacy handoff |",
    "| Next action | Resume customer interview |",
    "| Next owner | Legacy BA |",
    "",
  ].join("\n");
  await writeFile(path.join(project, "PROJECT.md"), markdown, "utf8");
  await writeFile(path.join(project, "TEAM-NOTES.md"), "# Legacy notes\n", "utf8");
  return { project, markdown };
}

async function assertNoTransactionJournal(target) {
  await assert.rejects(readFile(path.join(target, ".codex", "ke-install-transaction.json")));
}

async function createRecoveryFixture(name, { includeBackup = true } = {}) {
  const target = path.join(tempRoot, name);
  const backupRootRelative = ".codex/ke-backups/recovery-fixture";
  const stagingRoot = ".codex/.ke-install-stage-11111111-1111-4111-8111-111111111111";
  const backupRoot = path.join(target, backupRootRelative);
  const journalPath = path.join(target, ".codex", "ke-install-transaction.json");
  const stagePath = path.join(target, stagingRoot);
  const emptyCreatedDirectory = path.join(target, "projects", "recovery-empty");
  await mkdir(path.join(backupRoot, "rollback"), { recursive: true });
  await mkdir(stagePath, { recursive: true });
  await mkdir(emptyCreatedDirectory, { recursive: true });
  await writeFile(path.join(target, "KE-HELP.md"), "current managed content\n", "utf8");
  await writeFile(path.join(stagePath, "stage-sentinel.txt"), "staging remains until recovery succeeds\n", "utf8");
  if (includeBackup) {
    await writeFile(path.join(backupRoot, "rollback", "KE-HELP.md"), "original managed content\n", "utf8");
  }
  const journal = {
    schemaVersion: 1,
    state: "in-progress",
    action: "upgrade",
    backupRoot: backupRootRelative,
    fileSnapshots: [{ relative: "KE-HELP.md", hadOriginal: true, backupRelative: "rollback/KE-HELP.md" }],
    createdDirectories: ["projects/recovery-empty"],
    dependencies: [],
    stagingRoot,
    targetExisted: true,
    createdAt: new Date().toISOString(),
  };
  const journalBytes = `${JSON.stringify(journal, null, 2)}\n`;
  await writeFile(journalPath, journalBytes, "utf8");
  return { target, backupRoot, emptyCreatedDirectory, journal, journalBytes, journalPath, stagePath };
}

try {
  const normal = await buildInstaller("normal", {});
  const lateFailure = await buildInstaller("late-migration-failure", { failMigrationLate: true });
  const absentTarget = path.join(tempRoot, "dryrun-absent");
  const absentPlan = await runInstaller(normal.installer, ["install", "--dry-run", "--directory", absentTarget]);
  assert.equal(absentPlan.code, 0, absentPlan.stderr);
  assert.equal(await exists(absentTarget), false, "install dry-run must not create a missing target");
  checks += 1;

  const validConfigTarget = path.join(tempRoot, "valid-user-config");
  await mkdir(path.join(validConfigTarget, ".codex"), { recursive: true });
  const validUserConfig = [
    '["organization"."custom settings"]',
    "values = [",
    '  "one",',
    '  "two # still a string",',
    "]",
    'note = """',
    "[mcp_servers.kintone]",
    'command = "this is a multiline string, not a table"',
    '"""',
    "",
  ].join("\n");
  await writeFile(path.join(validConfigTarget, ".codex", "config.toml"), validUserConfig, "utf8");
  const validPlan = await runInstaller(normal.installer, ["install", "--dry-run", "--directory", validConfigTarget]);
  assert.equal(validPlan.code, 0, validPlan.stderr);
  assert.equal(await readFile(path.join(validConfigTarget, ".codex", "config.toml"), "utf8"), validUserConfig);
  checks += 1;

  for (const [name, config] of [
    ["duplicate-section", '[mcp_servers.kintone]\ncommand = "custom"\n'],
    ["quoted-ke-section", '["mcp_servers"."kintone"]\ncommand = "custom"\n'],
    ["table-array-collision", '[[mcp_servers.kintone]]\ncommand = "custom"\n'],
    ["dotted-ke-collision", '[mcp_servers.kintone.custom]\nvalue = true\n'],
    ["malformed-markers", "# >>> KE KIT: CODEX CONFIG >>>\n[mcp_servers.user]\ncommand = \"x\"\n"],
  ]) {
    const target = path.join(tempRoot, name);
    await mkdir(path.join(target, ".codex"), { recursive: true });
    await writeFile(path.join(target, ".codex", "config.toml"), config, "utf8");
    const before = await readFile(path.join(target, ".codex", "config.toml"), "utf8");
    const result = await runInstaller(normal.installer, ["install", "--dry-run", "--directory", target]);
    assert.notEqual(result.code, 0, `${name} must fail closed`);
    assert.equal(await readFile(path.join(target, ".codex", "config.toml"), "utf8"), before);
    assert.equal((await readdir(target)).length, 1, `${name} preflight must not write payload files`);
    checks += 1;
  }

  const legacyTarget = path.join(tempRoot, "legacy-upgrade");
  const legacy = await writeLegacyProject(legacyTarget);
  await writeFile(path.join(legacy.project, ".ke-project.json"), `${JSON.stringify({
    schemaVersion: 1,
    projectSlug: "legacy-assessment",
    projectType: "assessment",
    displayName: "Legacy Assessment",
    objective: "Preserve this late-phase work",
    entryRoute: "current-state",
    deliveryTrack: "Assessment",
    currentPhase: "Legacy phase after approval",
    currentGate: "Legacy gate 2",
    gateStatus: "pending",
    gateEvidence: null,
    gateApprover: null,
    gateApprovalAuthenticated: false,
    activeOwner: "Legacy analyst",
    lastHandoff: "Legacy handoff",
    nextAction: "Resume customer interview",
    nextOwner: "Legacy BA",
    revision: 2,
    updatedAt: "2026-01-01T00:00:00.000Z",
  }, null, 2)}\n`, "utf8");
  await writeFixtureManifest(legacyTarget, normal.payload);
  await mkdir(path.join(legacyTarget, ".codex"), { recursive: true });
  await writeFile(path.join(legacyTarget, ".codex", "ke-preferences.toml"), [
    "# local note",
    'chat_language = "Vietnamese #literal"',
    'document_languages = ["English #keep", "Japanese"] # trailing comment',
    "keep_setting = 7",
    "",
  ].join("\n"), "utf8");
  await mkdir(path.join(legacyTarget, "platform", "ke-kintone-mcp"), { recursive: true });
  await writeFile(path.join(legacyTarget, "platform", "ke-kintone-mcp", ".env"), "KINTONE_BASE_URL=https://private.invalid\n", "utf8");
  const preservedEnv = await readFile(path.join(legacyTarget, "platform", "ke-kintone-mcp", ".env"), "utf8");
  const preservedDocuments = 'document_languages = ["English #keep", "Japanese"] # trailing comment';
  const dryrunBefore = await readFile(path.join(legacyTarget, ".codex", "ke-kit-manifest.json"), "utf8");
  const migrationPlan = await runInstaller(normal.installer, ["upgrade", "--dry-run", "--directory", legacyTarget]);
  assert.equal(migrationPlan.code, 0, migrationPlan.stderr);
  assert.match(migrationPlan.stdout, /would-migrate|migration/u);
  assert.equal(await readFile(path.join(legacyTarget, ".codex", "ke-kit-manifest.json"), "utf8"), dryrunBefore);
  await assert.rejects(readFile(path.join(legacyTarget, ".codex", "ke-last-migration.json")));
  checks += 1;

  const upgraded = await runInstaller(normal.installer, ["upgrade", "--yes", "--skip-deps", "--directory", legacyTarget, "--chat-language", "English"]);
  assert.equal(upgraded.code, 0, upgraded.stderr);
  const migratedState = JSON.parse(await readFile(path.join(legacy.project, ".ke-project.json"), "utf8"));
  assert.equal(migratedState.entryRoute, "current-state");
  assert.equal(migratedState.currentPhase, "Legacy phase after approval");
  assert.equal(migratedState.currentGate, "Legacy gate 2");
  assert.equal(migratedState.activeOwner, "Legacy analyst");
  assert.equal(migratedState.lastHandoff, "Legacy handoff");
  assert.equal(migratedState.nextAction, "Resume customer interview");
  assert.equal(migratedState.nextOwner, "Legacy BA");
  assert.equal(await readFile(path.join(legacy.project, "customer-source.csv"), "utf8"), "customer data stays\n");
  assert.equal(await readFile(path.join(legacy.project, "input", "evidence.txt"), "utf8"), "evidence stays\n");
  assert.equal(await readFile(path.join(legacyTarget, "platform", "ke-kintone-mcp", ".env"), "utf8"), preservedEnv);
  const preferenceAfter = await readFile(path.join(legacyTarget, ".codex", "ke-preferences.toml"), "utf8");
  assert.match(preferenceAfter, /^chat_language = "English"$/mu);
  assert.ok(preferenceAfter.includes(preservedDocuments), "changing chat language must preserve document languages verbatim");
  assert.ok(preferenceAfter.includes("keep_setting = 7"), "unrelated preference settings must remain byte-preserved");
  const configAfter = await readFile(path.join(legacyTarget, ".codex", "config.toml"), "utf8");
  assert.ok(configAfter.includes('command = "npm.cmd"') === (process.platform === "win32"));
  assert.ok(configAfter.includes('command = "npm"') === (process.platform !== "win32"));
  const currentManifest = JSON.parse(await readFile(path.join(legacyTarget, ".codex", "ke-kit-manifest.json"), "utf8"));
  assert.equal(currentManifest.dependencies, "skipped");
  assert.equal(currentManifest.version, packageJson.version);
  await assertNoTransactionJournal(legacyTarget);
  checks += 1;

  const helpTarget = path.join(tempRoot, "force-upgrade");
  const initialInstall = await runInstaller(normal.installer, ["install", "--yes", "--skip-deps", "--directory", helpTarget]);
  assert.equal(initialInstall.code, 0, initialInstall.stderr);
  assert.match(initialInstall.stdout, /test:connection -- --environment test --approved-test-plan <APPROVAL_REFERENCE> --app <APP_ID>/u);
  assert.match(initialInstall.stdout, /hello.*hi.*xin chào/u);
  assert.match(initialInstall.stdout, /greeting and route menu need no Kintone configuration/u);
  assert.match(initialInstall.stdout, /browser sign-in is deferred/u);
  await writeFile(path.join(helpTarget, "KE-HELP.md"), "customer changed this\n", "utf8");
  const protectedUpgrade = await runInstaller(normal.installer, ["upgrade", "--yes", "--skip-deps", "--directory", helpTarget]);
  assert.notEqual(protectedUpgrade.code, 0);
  assert.match(protectedUpgrade.stderr, /stopped to protect existing files/u);
  assert.equal(await readFile(path.join(helpTarget, "KE-HELP.md"), "utf8"), "customer changed this\n");
  const forcedUpgrade = await runInstaller(normal.installer, ["upgrade", "--yes", "--skip-deps", "--force", "--directory", helpTarget]);
  assert.equal(forcedUpgrade.code, 0, forcedUpgrade.stderr);
  assert.equal(await readFile(path.join(helpTarget, "KE-HELP.md"), "utf8"), "KE help payload\n");
  const forcedManifest = JSON.parse(await readFile(path.join(helpTarget, ".codex", "ke-kit-manifest.json"), "utf8"));
  const backedUpHelp = await readFile(path.join(helpTarget, forcedManifest.backupRoot, "rollback", "KE-HELP.md"), "utf8");
  assert.equal(backedUpHelp, "customer changed this\n");
  checks += 1;

  const schemaManifestPath = path.join(helpTarget, ".codex", "ke-kit-manifest.json");
  const currentManifestBytes = await readFile(schemaManifestPath, "utf8");
  const manifestForReject = JSON.parse(currentManifestBytes);
  manifestForReject.schemaVersion = 999;
  await writeFile(schemaManifestPath, `${JSON.stringify(manifestForReject)}\n`, "utf8");
  const unknownManifest = await runInstaller(normal.installer, ["upgrade", "--dry-run", "--directory", helpTarget]);
  assert.notEqual(unknownManifest.code, 0);
  assert.match(unknownManifest.stderr, /manifest schema 999/u);
  manifestForReject.schemaVersion = 2;
  manifestForReject.version = "99.0.0";
  await writeFile(schemaManifestPath, `${JSON.stringify(manifestForReject)}\n`, "utf8");
  const downgrade = await runInstaller(normal.installer, ["upgrade", "--dry-run", "--directory", helpTarget]);
  assert.notEqual(downgrade.code, 0);
  assert.match(downgrade.stderr, /Cannot downgrade/u);
  await writeFile(schemaManifestPath, currentManifestBytes, "utf8");
  checks += 1;

  const futureTarget = path.join(tempRoot, "future-project-schema");
  const futureProject = path.join(futureTarget, "projects", "future");
  await mkdir(path.join(futureProject, "output"), { recursive: true });
  await writeFixtureManifest(futureTarget, normal.payload);
  await writeFile(path.join(futureProject, ".ke-project.json"), JSON.stringify({ schemaVersion: 999 }), "utf8");
  const futureBytes = await readFile(path.join(futureProject, ".ke-project.json"), "utf8");
  const futureUpgrade = await runInstaller(normal.installer, ["upgrade", "--yes", "--skip-deps", "--directory", futureTarget]);
  assert.notEqual(futureUpgrade.code, 0);
  assert.match(futureUpgrade.stderr, /unknown project schema 999/u);
  assert.equal(await readFile(path.join(futureProject, ".ke-project.json"), "utf8"), futureBytes);
  await assert.rejects(readFile(path.join(futureTarget, "KE-HELP.md")));
  checks += 1;

  const symlinkTarget = path.join(tempRoot, "symlink-project");
  const linkedProjects = path.join(symlinkTarget, "projects");
  const externalProject = path.join(tempRoot, "outside-target-project");
  await mkdir(linkedProjects, { recursive: true });
  await mkdir(externalProject, { recursive: true });
  await writeFixtureManifest(symlinkTarget, normal.payload);
  await symlink(externalProject, path.join(linkedProjects, "linked"), "junction");
  const symlinkPreflight = await runInstaller(normal.installer, [
    "upgrade", "--dry-run", "--directory", symlinkTarget,
  ]);
  assert.notEqual(symlinkPreflight.code, 0);
  assert.match(symlinkPreflight.stderr, /symlink or junction/u);
  assert.deepEqual(await readdir(externalProject), [], "preflight must not follow project junctions");
  checks += 1;

  const invalidRecovery = await createRecoveryFixture("invalid-recovery-journal");
  invalidRecovery.journal.fileSnapshots[0].relative = "../outside.txt";
  const invalidRecoveryBytes = `${JSON.stringify(invalidRecovery.journal, null, 2)}\n`;
  await writeFile(invalidRecovery.journalPath, invalidRecoveryBytes, "utf8");
  const invalidRecoveryResult = await runInstaller(normal.installer, ["recover", "--directory", invalidRecovery.target]);
  assert.notEqual(invalidRecoveryResult.code, 0);
  assert.match(invalidRecoveryResult.stderr, /Cannot recover|Unsafe transaction path/u);
  assert.equal(await readFile(invalidRecovery.journalPath, "utf8"), invalidRecoveryBytes);
  assert.equal(await readFile(path.join(invalidRecovery.target, "KE-HELP.md"), "utf8"), "current managed content\n");
  assert.equal(await readFile(path.join(invalidRecovery.stagePath, "stage-sentinel.txt"), "utf8"), "staging remains until recovery succeeds\n");
  assert.deepEqual(await readdir(invalidRecovery.emptyCreatedDirectory), []);
  checks += 1;

  const validRecovery = await createRecoveryFixture("valid-recovery");
  const validRecoveryResult = await runInstaller(normal.installer, ["recover", "--directory", validRecovery.target]);
  assert.equal(validRecoveryResult.code, 0, validRecoveryResult.stderr);
  assert.equal(await readFile(path.join(validRecovery.target, "KE-HELP.md"), "utf8"), "original managed content\n");
  await assertNoTransactionJournal(validRecovery.target);
  assert.equal(await exists(validRecovery.stagePath), false);
  assert.equal(await readFile(path.join(validRecovery.backupRoot, "failed-current", "KE-HELP.md"), "utf8"), "current managed content\n");
  checks += 1;

  const junctionRecovery = await createRecoveryFixture("junction-recovery-path");
  const externalRecovery = path.join(tempRoot, "outside-recovery-preservation");
  await mkdir(externalRecovery, { recursive: true });
  await symlink(externalRecovery, path.join(junctionRecovery.backupRoot, "failed-current"), "junction");
  const junctionRecoveryResult = await runInstaller(normal.installer, ["recover", "--directory", junctionRecovery.target]);
  assert.notEqual(junctionRecoveryResult.code, 0);
  assert.match(junctionRecoveryResult.stderr, /symlink or junction/u);
  assert.equal(await readFile(junctionRecovery.journalPath, "utf8"), junctionRecovery.journalBytes);
  assert.equal(await readFile(path.join(junctionRecovery.target, "KE-HELP.md"), "utf8"), "current managed content\n");
  assert.equal(await readFile(path.join(junctionRecovery.stagePath, "stage-sentinel.txt"), "utf8"), "staging remains until recovery succeeds\n");
  assert.deepEqual(await readdir(externalRecovery), [], "recovery must not write failed-state preservation through a junction");
  checks += 1;

  const missingBackupRecovery = await createRecoveryFixture("missing-recovery-backup", { includeBackup: false });
  const missingBackupResult = await runInstaller(normal.installer, ["recover", "--directory", missingBackupRecovery.target]);
  assert.notEqual(missingBackupResult.code, 0);
  assert.match(missingBackupResult.stderr, /original backup is missing/u);
  assert.equal(await readFile(missingBackupRecovery.journalPath, "utf8"), missingBackupRecovery.journalBytes);
  assert.equal(await readFile(path.join(missingBackupRecovery.target, "KE-HELP.md"), "utf8"), "current managed content\n");
  assert.equal(await readFile(path.join(missingBackupRecovery.stagePath, "stage-sentinel.txt"), "utf8"), "staging remains until recovery succeeds\n");
  assert.deepEqual(await readdir(missingBackupRecovery.emptyCreatedDirectory), []);
  checks += 1;

  const missingDependencyBackup = await createRecoveryFixture("missing-dependency-backup");
  const dependencyRelative = "platform/ke-kintone-mcp";
  const dependencyModules = path.join(missingDependencyBackup.target, dependencyRelative, "node_modules");
  await mkdir(dependencyModules, { recursive: true });
  await writeFile(path.join(dependencyModules, "customer-module-sentinel.txt"), "preserve current modules\n", "utf8");
  missingDependencyBackup.journal.dependencies = [{
    relative: dependencyRelative,
    hadOriginal: true,
    backupRelative: "dependencies/platform/ke-kintone-mcp/node_modules",
  }];
  const missingDependencyJournalBytes = `${JSON.stringify(missingDependencyBackup.journal, null, 2)}\n`;
  await writeFile(missingDependencyBackup.journalPath, missingDependencyJournalBytes, "utf8");
  const missingDependencyResult = await runInstaller(normal.installer, ["recover", "--directory", missingDependencyBackup.target]);
  assert.notEqual(missingDependencyResult.code, 0);
  assert.match(missingDependencyResult.stderr, /original dependency backup is missing/u);
  assert.equal(await readFile(missingDependencyBackup.journalPath, "utf8"), missingDependencyJournalBytes);
  assert.equal(await readFile(path.join(dependencyModules, "customer-module-sentinel.txt"), "utf8"), "preserve current modules\n");
  assert.equal(await readFile(path.join(missingDependencyBackup.target, "KE-HELP.md"), "utf8"), "current managed content\n");
  assert.equal(await readFile(path.join(missingDependencyBackup.stagePath, "stage-sentinel.txt"), "utf8"), "staging remains until recovery succeeds\n");
  checks += 1;

  const migrationFailTarget = path.join(tempRoot, "migration-failure");
  const failLegacy = await writeLegacyProject(migrationFailTarget);
  await writeFixtureManifest(migrationFailTarget, lateFailure.payload);
  await mkdir(path.join(migrationFailTarget, ".codex"), { recursive: true });
  const originalPreferences = 'chat_language = "Thai"\ndocument_languages = ["Vietnamese"]\n';
  await writeFile(path.join(migrationFailTarget, ".codex", "ke-preferences.toml"), originalPreferences, "utf8");
  await writeFile(path.join(migrationFailTarget, "KE-HELP.md"), "old managed help\n", "utf8");
  const originalProject = await readFile(path.join(failLegacy.project, "PROJECT.md"), "utf8");
  const failMigration = await runInstaller(lateFailure.installer, ["upgrade", "--yes", "--skip-deps", "--directory", migrationFailTarget], {
    ...process.env,
    KE_TEST_FAIL_MIGRATION: "1",
  });
  assert.notEqual(failMigration.code, 0);
  assert.match(failMigration.stderr, /previous managed\/project state was restored/u);
  assert.match(failMigration.stderr, /Injected late migration failure/u);
  assert.equal(await readFile(path.join(failLegacy.project, "PROJECT.md"), "utf8"), originalProject);
  assert.equal(await readFile(path.join(migrationFailTarget, ".codex", "ke-preferences.toml"), "utf8"), originalPreferences);
  assert.equal(await readFile(path.join(migrationFailTarget, "KE-HELP.md"), "utf8"), "old managed help\n");
  assert.equal(await readFile(path.join(failLegacy.project, "customer-source.csv"), "utf8"), "customer data stays\n");
  await assert.rejects(readFile(path.join(failLegacy.project, ".ke-project.json")));
  await assert.rejects(readFile(path.join(migrationFailTarget, ".codex", "ke-last-migration.json")));
  await assertNoTransactionJournal(migrationFailTarget);
  checks += 1;

  const dependencyFailTarget = path.join(tempRoot, "dependency-failure");
  await writeFixtureManifest(dependencyFailTarget, normal.payload);
  await mkdir(path.join(dependencyFailTarget, "platform", "ke-kintone-mcp", "node_modules"), { recursive: true });
  await writeFile(path.join(dependencyFailTarget, "platform", "ke-kintone-mcp", "node_modules", "customer-sentinel.txt"), "preserve me\n", "utf8");
  await mkdir(path.join(dependencyFailTarget, "platform", "ke-browser-mcp", "node_modules"), { recursive: true });
  await writeFile(path.join(dependencyFailTarget, "platform", "ke-browser-mcp", "node_modules", "browser-sentinel.txt"), "keep this too\n", "utf8");
  await mkdir(path.join(dependencyFailTarget, ".codex"), { recursive: true });
  await writeFile(path.join(dependencyFailTarget, ".codex", "ke-preferences.toml"), originalPreferences, "utf8");
  const npmBin = path.join(tempRoot, "fake-npm");
  await mkdir(npmBin, { recursive: true });
  if (process.platform === "win32") {
    await writeFile(path.join(npmBin, "npm.cmd"), "@echo off\r\nexit /b 43\r\n", "utf8");
  } else {
    const fakeNpm = path.join(npmBin, "npm");
    await writeFile(fakeNpm, "#!/bin/sh\nexit 43\n", "utf8");
    await chmod(fakeNpm, 0o755);
  }
  const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
  const dependencyEnv = { ...process.env, [pathKey]: `${npmBin}${path.delimiter}${process.env[pathKey] ?? ""}` };
  const dependencyFailure = await runInstaller(normal.installer, ["upgrade", "--yes", "--directory", dependencyFailTarget], dependencyEnv);
  assert.notEqual(dependencyFailure.code, 0);
  assert.match(dependencyFailure.stderr, /Dependency installation failed/u);
  assert.match(dependencyFailure.stderr, /previous managed\/project state was restored/u);
  assert.equal(await readFile(path.join(dependencyFailTarget, "platform", "ke-kintone-mcp", "node_modules", "customer-sentinel.txt"), "utf8"), "preserve me\n");
  assert.equal(await readFile(path.join(dependencyFailTarget, "platform", "ke-browser-mcp", "node_modules", "browser-sentinel.txt"), "utf8"), "keep this too\n");
  assert.equal(JSON.parse(await readFile(path.join(dependencyFailTarget, ".codex", "ke-kit-manifest.json"), "utf8")).version, "1.0.21");
  assert.equal(await readFile(path.join(dependencyFailTarget, ".codex", "ke-preferences.toml"), "utf8"), originalPreferences);
  await assertNoTransactionJournal(dependencyFailTarget);
  checks += 1;

  const configTarget = path.join(tempRoot, "managed-config-command");
  const configInstall = await runInstaller(normal.installer, ["install", "--yes", "--skip-deps", "--directory", configTarget]);
  assert.equal(configInstall.code, 0, configInstall.stderr);
  const config = await readFile(path.join(configTarget, ".codex", "config.toml"), "utf8");
  const managedConfig = [
    "# >>> KE KIT: CODEX CONFIG >>>",
    platformSourceConfig().trim(),
    "# <<< KE KIT: CODEX CONFIG <<<",
  ].join("\n");
  const configHash = createHash("sha256").update(managedConfig).digest("hex");
  const configManifest = JSON.parse(await readFile(path.join(configTarget, ".codex", "ke-kit-manifest.json"), "utf8"));
  assert.ok(config.includes(`command = "${process.platform === "win32" ? "npm.cmd" : "npm"}"`));
  assert.equal(typeof configManifest.fileHashes[".codex/config.toml"], "string");
  assert.equal(configManifest.fileHashes[".codex/config.toml"].length, 64);
  assert.equal(configManifest.fileHashes[".codex/config.toml"], configHash);
  checks += 1;

  const markdownLegacyTarget = path.join(tempRoot, "markdown-only-legacy");
  const markdownLegacy = await writeLegacyProject(markdownLegacyTarget);
  await writeFixtureManifest(markdownLegacyTarget, normal.payload);
  const markdownUpgrade = await runInstaller(normal.installer, [
    "upgrade", "--yes", "--skip-deps", "--directory", markdownLegacyTarget,
  ]);
  assert.equal(markdownUpgrade.code, 0, markdownUpgrade.stderr);
  const markdownState = JSON.parse(await readFile(path.join(markdownLegacy.project, ".ke-project.json"), "utf8"));
  try {
    assert.equal(markdownState.entryRoute, "current-state");
    assert.equal(markdownState.currentPhase, "Legacy phase after approval");
    assert.equal(markdownState.currentGate, "Legacy gate 2");
    assert.equal(markdownState.activeOwner, "Legacy analyst");
    assert.equal(markdownState.lastHandoff, "Legacy handoff");
    assert.equal(markdownState.nextAction, "Resume customer interview");
    assert.equal(markdownState.nextOwner, "Legacy BA");
    checks += 1;
    console.log("PASS: Markdown-only legacy route/phase/owner preservation");
  } catch (error) {
    process.exitCode = 1;
    console.error(`KNOWN FAIL: Markdown-only legacy route/phase/owner preservation: ${error.message}`);
  }

  console.log(`Installer hardening tests: ${checks} checks passed (isolated temp installers; no shared dist).`);
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

async function exists(target) {
  try { await stat(target); return true; }
  catch { return false; }
}

function platformSourceConfig() {
  return [
    "[mcp_servers.kintone]",
    `command = "${process.platform === "win32" ? "npm.cmd" : "npm"}"`,
    'args = ["--prefix", "platform/ke-kintone-mcp", "run", "mcp:kintone"]',
    "[[skills.config]]",
    'path = "skills/ke-router"',
    "enabled = true",
    "[[skills.config]]",
    'path = "skills/ke-pm-ti"',
    "enabled = true",
    "",
  ].join("\n");
}
