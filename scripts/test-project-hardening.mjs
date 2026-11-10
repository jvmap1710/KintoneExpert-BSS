#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  bootstrapState,
  canonicalProjectRoot,
  projectFilePath,
  saveState,
  validateProject,
} from "./lib/project-state.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ke-project-hardening-"));
const cliRoot = path.join(tempRoot, "cli-workspace");
let initializerTestRoot;
let checks = 0;

function pass(name) {
  checks += 1;
  console.log(`PASS: ${name}`);
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
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

async function writeProject(root, slug, markdown) {
  const projectRoot = path.join(root, "projects", slug);
  await mkdir(projectRoot, { recursive: true });
  for (const name of ["input", "private", "analysis", "output", "history"]) {
    await mkdir(path.join(projectRoot, name), { recursive: true });
  }
  await writeFile(path.join(projectRoot, "PROJECT.md"), markdown, "utf8");
  await writeFile(path.join(projectRoot, "TEAM-NOTES.md"), `# ${slug} notes\n\n## Open items\n\nNo open notes.\n\n## Closed items\n\nNo closed notes.\n`, "utf8");
  return projectRoot;
}

async function snapshotTree(root) {
  const result = [];
  async function visit(directory, relative = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const childRelative = path.join(relative, entry.name);
      const childPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        result.push([childRelative, "directory"]);
        await visit(childPath, childRelative);
      } else {
        result.push([childRelative, await readFile(childPath, "base64")]);
      }
    }
  }
  await visit(root);
  return result.sort(([left], [right]) => left.localeCompare(right));
}

function projectMarkdown(slug, { route = "current-state", type = "assessment" } = {}) {
  const labels = {
    "current-state": "Current-State Assessment / As-Is Analysis",
    "existing-solution": "Existing Solution Assessment",
  };
  return [
    `# ${slug}`,
    "",
    "| Property | Value |",
    "| --- | --- |",
    `| Workspace schema | 1 |`,
    `| Engagement type | ${type === "assessment" ? "Existing solution assessment" : type} |`,
    `| Display name | ${slug} |`,
    "| Objective | Preserve legacy work |",
    `| Entry route | ${labels[route]} |`,
    "| Delivery track | Assessment |",
    "| Current phase | Legacy phase after approval |",
    "| Current gate | Legacy gate 2 |",
    "| Active owner | Legacy analyst |",
    "| Last handoff | Legacy handoff |",
    "| Next action | Resume customer interview |",
    "| Next owner | Legacy BA |",
    "",
  ].join("\n");
}

try {
  await mkdir(path.join(cliRoot, "scripts", "lib"), { recursive: true });
  await mkdir(path.join(cliRoot, "projects"), { recursive: true });
  await writeFile(
    path.join(cliRoot, "scripts", "ke-project.mjs"),
    await readFile(path.join(repositoryRoot, "scripts", "ke-project.mjs")),
  );
  await writeFile(
    path.join(cliRoot, "scripts", "lib", "project-state.mjs"),
    await readFile(path.join(repositoryRoot, "scripts", "lib", "project-state.mjs")),
  );

  const cliProject = await writeProject(cliRoot, "cli-project", projectMarkdown("CLI Project"));
  let state = await bootstrapState(cliRoot, {
    slug: "cli-project",
    projectType: "assessment",
    entryRoute: "current-state",
    displayName: "CLI Project",
    objective: "Exercise state commands",
  });
  const cli = path.join(cliRoot, "scripts", "ke-project.mjs");

  const missingProject = await run(process.execPath, [cli, "transition", "current-state"], cliRoot);
  assert.notEqual(missingProject.code, 0);
  assert.match(missingProject.stderr, /--project is required/u);
  pass("state mutations require an explicit project");

  let command = await run(process.execPath, [
    cli, "transition", "current-state", "--project", "cli-project",
    "--phase", "User Acceptance Testing", "--gate", "G5 UAT",
    "--gate-status", "satisfied", "--evidence", "User reported approval",
    "--approver", "Project owner", "--expected-revision", String(state.revision),
  ], cliRoot);
  assert.equal(command.code, 0, command.stderr);
  state = JSON.parse(await readFile(path.join(cliProject, ".ke-project.json"), "utf8"));
  command = await run(process.execPath, [
    cli, "transition", "current-state", "--project", "cli-project", "--owner", "Tester",
  ], cliRoot);
  assert.equal(command.code, 0, command.stderr);
  state = JSON.parse(await readFile(path.join(cliProject, ".ke-project.json"), "utf8"));
  assert.equal(state.currentPhase, "User Acceptance Testing");
  assert.equal(state.currentGate, "G5 UAT");
  assert.equal(state.gateStatus, "satisfied");
  assert.equal(state.gateEvidence, "User reported approval");
  assert.equal(state.gateApprover, "Project owner");
  assert.equal(state.gateApprovalAuthenticated, false);
  const stale = await run(process.execPath, [
    cli, "transition", "current-state", "--project", "cli-project",
    "--expected-revision", String(state.revision - 1), "--owner", "Stale writer",
  ], cliRoot);
  assert.notEqual(stale.code, 0);
  assert.match(stale.stderr, /Stale project revision/u);
  const afterStale = JSON.parse(await readFile(path.join(cliProject, ".ke-project.json"), "utf8"));
  assert.equal(afterStale.activeOwner, "Tester");
  pass("same-route progress and gate evidence survive updates; revision CAS rejects stale writes");

  const year = String(new Date().getFullYear());
  await writeFile(
    path.join(cliProject, "history", "TEAM-NOTES-archive.md"),
    `## NOTE-${year}-999\n\n- Status: Closed\n`,
    "utf8",
  );
  const addInput = path.join(tempRoot, "note-add.json");
  await writeFile(addInput, JSON.stringify({
    author: "Regression Tester",
    phase: "UAT",
    type: "Test Finding",
    priority: "Low",
    context: `Context line\n## NOTE-${year}-777\nInjected heading`,
    item: "Original finding\n## Closed items\nNot a section",
    impact: "None",
    nextAction: "Review safely",
  }), "utf8");
  const added = await run(process.execPath, [cli, "note", "add", "--project", "cli-project", "--from", addInput], cliRoot);
  assert.equal(added.code, 0, added.stderr);
  const noteId = added.stdout.trim();
  assert.equal(noteId, `NOTE-${year}-1000`);
  const notePath = path.join(cliProject, "TEAM-NOTES.md");
  let notes = await readFile(notePath, "utf8");
  assert(!notes.includes(`\n## NOTE-${year}-777\n`));
  assert(!notes.includes("\n## Closed items\nNot a section"));
  assert(notes.includes("Original finding"));

  const responseInput = path.join(tempRoot, "note-response.json");
  await writeFile(responseInput, JSON.stringify({
    author: "BA",
    response: "First response",
    status: "In Review",
  }), "utf8");
  const response = await run(process.execPath, [cli, "note", "respond", noteId, "--project", "cli-project", "--from", responseInput], cliRoot);
  assert.equal(response.code, 0, response.stderr);
  const resolutionInput = path.join(tempRoot, "note-resolution.json");
  await writeFile(resolutionInput, JSON.stringify({
    author: "Owner",
    resolution: "Confirmed by the project owner",
    status: "Confirmed",
  }), "utf8");
  const resolution = await run(process.execPath, [cli, "note", "resolve", noteId, "--project", "cli-project", "--from", resolutionInput], cliRoot);
  assert.equal(resolution.code, 0, resolution.stderr);
  notes = await readFile(notePath, "utf8");
  assert(notes.indexOf("Original finding") < notes.indexOf("First response"));
  assert(notes.indexOf("First response") < notes.indexOf("Confirmed by the project owner"));
  const resolvedSnapshot = notes;
  const duplicateResolution = await run(process.execPath, [cli, "note", "resolve", noteId, "--project", "cli-project", "--from", resolutionInput], cliRoot);
  assert.notEqual(duplicateResolution.code, 0);
  assert.equal(await readFile(notePath, "utf8"), resolvedSnapshot);
  pass("note IDs include archived history and appended responses never overwrite prior statements");

  const concurrentInputs = [];
  for (let index = 0; index < 4; index += 1) {
    const file = path.join(tempRoot, `concurrent-note-${index}.json`);
    await writeFile(file, JSON.stringify({
      author: "Concurrent writer",
      phase: "UAT",
      type: "Test Finding",
      priority: "Low",
      context: `Writer ${index}`,
      item: "Unique ID test",
    }), "utf8");
    concurrentInputs.push(file);
  }
  const concurrent = await Promise.all(concurrentInputs.map((file) =>
    run(process.execPath, [cli, "note", "add", "--project", "cli-project", "--from", file], cliRoot),
  ));
  assert(concurrent.every((result) => result.code === 0), concurrent.map((result) => result.stderr).join("\n"));
  assert.equal(new Set(concurrent.map((result) => result.stdout.trim())).size, concurrent.length);
  pass("concurrent note writers allocate distinct IDs under one project lock");

  const missingMarkdownRoot = path.join(tempRoot, "missing-markdown");
  await mkdir(path.join(missingMarkdownRoot, "projects", "missing"), { recursive: true });
  const missingProjectRoot = path.join(missingMarkdownRoot, "projects", "missing");
  for (const name of ["input", "private", "analysis", "output", "history"]) await mkdir(path.join(missingProjectRoot, name));
  await writeFile(path.join(missingProjectRoot, "PROJECT.md"), projectMarkdown("Missing"), "utf8");
  await writeFile(path.join(missingProjectRoot, "TEAM-NOTES.md"), "# Notes\n", "utf8");
  const missingState = await bootstrapState(missingMarkdownRoot, {
    slug: "missing",
    projectType: "assessment",
    entryRoute: "current-state",
    displayName: "Missing",
    objective: "No partial commit",
  });
  const stateBytes = await readFile(path.join(missingProjectRoot, ".ke-project.json"), "utf8");
  await rm(path.join(missingProjectRoot, "PROJECT.md"));
  await assert.rejects(saveState(missingMarkdownRoot, { ...missingState, objective: "Should not save" }));
  assert.equal(await readFile(path.join(missingProjectRoot, ".ke-project.json"), "utf8"), stateBytes);
  assert((await validateProject(missingMarkdownRoot, "missing")).some((error) => error.includes("PROJECT.md")));
  pass("missing dashboard prevents JSON mutation and validation returns diagnostics");

  const journalRoot = path.join(tempRoot, "journal-workspace");
  const journalProject = await writeProject(journalRoot, "journal", projectMarkdown("Journal"));
  const journalState = await bootstrapState(journalRoot, {
    slug: "journal",
    projectType: "assessment",
    entryRoute: "current-state",
    displayName: "Journal",
    objective: "Recovery test",
  });
  const statePath = path.join(journalProject, ".ke-project.json");
  const journalPath = path.join(journalProject, ".ke-project.journal.json");
  const recoveredState = {
    ...journalState,
    revision: journalState.revision + 1,
    currentPhase: "Recovered phase",
    updatedAt: new Date().toISOString(),
  };
  const recoveredMarkdown = "# Recovered dashboard projection\n";
  await writeFile(statePath, `${JSON.stringify(recoveredState, null, 2)}\n`, "utf8");
  await writeFile(journalPath, `${JSON.stringify({
    schemaVersion: 1,
    projectSlug: "journal",
    baseRevision: journalState.revision,
    nextState: recoveredState,
    projectMarkdown: recoveredMarkdown,
  }, null, 2)}\n`, "utf8");
  assert.equal((await (await import("./lib/project-state.mjs")).loadState(journalRoot, "journal")).currentPhase, "Recovered phase");
  assert.equal(await readFile(path.join(journalProject, "PROJECT.md"), "utf8"), recoveredMarkdown);
  assert.equal(await exists(journalPath), false);

  const conflictState = {
    ...recoveredState,
    revision: recoveredState.revision + 1,
    currentPhase: "Conflicting authoritative state",
    updatedAt: new Date().toISOString(),
  };
  const conflictingJournalState = { ...conflictState, objective: "Different full next state" };
  await writeFile(statePath, `${JSON.stringify(conflictState, null, 2)}\n`, "utf8");
  await writeFile(journalPath, `${JSON.stringify({
    schemaVersion: 1,
    projectSlug: "journal",
    baseRevision: recoveredState.revision,
    nextState: conflictingJournalState,
    projectMarkdown: "# Must not be written\n",
  }, null, 2)}\n`, "utf8");
  await assert.rejects((await import("./lib/project-state.mjs")).loadState(journalRoot, "journal"), /differs from authoritative JSON/u);
  assert.equal(await readFile(path.join(journalProject, "PROJECT.md"), "utf8"), recoveredMarkdown);
  assert.equal(await exists(journalPath), true);
  pass("state recovery validates the complete journal and recovers only a matching authoritative state");

  const migrationRoot = path.join(tempRoot, "migration-workspace");
  const legacyProject = await writeProject(migrationRoot, "legacy-assessment", projectMarkdown("Legacy Assessment"));
  const migrate = path.join(repositoryRoot, "scripts", "migrate-projects.mjs");
  const beforeDryRun = await snapshotTree(migrationRoot);
  const dryRun = await run(process.execPath, [migrate, "--root", migrationRoot, "--dry-run"], repositoryRoot);
  assert.equal(dryRun.code, 0, dryRun.stderr);
  assert.deepEqual(await snapshotTree(migrationRoot), beforeDryRun);
  assert.equal(await exists(path.join(migrationRoot, ".codex")), false);
  const migration = await run(process.execPath, [migrate, "--root", migrationRoot], repositoryRoot);
  assert.equal(migration.code, 0, migration.stderr || migration.stdout);
  const migrated = JSON.parse(await readFile(path.join(legacyProject, ".ke-project.json"), "utf8"));
  assert.equal(migrated.entryRoute, "current-state");
  assert.equal(migrated.currentPhase, "Legacy phase after approval");
  assert.equal(migrated.currentGate, "Legacy gate 2");
  assert.equal(migrated.activeOwner, "Legacy analyst");
  assert.equal(migrated.nextOwner, "Legacy BA");
  pass("migration dry-run performs zero writes and Markdown-only projects preserve route and progress");

  const preflightRoot = path.join(tempRoot, "migration-preflight");
  const firstProject = await writeProject(preflightRoot, "first", projectMarkdown("First"));
  const futureProject = await writeProject(preflightRoot, "future", projectMarkdown("Future"));
  await writeFile(path.join(futureProject, ".ke-project.json"), JSON.stringify({ schemaVersion: 999 }), "utf8");
  const rejectedMigration = await run(process.execPath, [migrate, "--root", preflightRoot], repositoryRoot);
  assert.notEqual(rejectedMigration.code, 0);
  assert.equal(await exists(path.join(firstProject, ".ke-project.json")), false);
  assert.equal(await exists(path.join(preflightRoot, ".codex")), false);
  pass("migration preflights every project before writing any project");

  const oldShapeRoot = path.join(tempRoot, "old-state-shape");
  const oldShapeProject = await writeProject(oldShapeRoot, "old-shape", projectMarkdown("Old Shape"));
  const oldShape = await bootstrapState(oldShapeRoot, {
    slug: "old-shape",
    projectType: "assessment",
    entryRoute: "current-state",
    displayName: "Old Shape",
    objective: "Preserve existing state",
  });
  delete oldShape.gateStatus;
  delete oldShape.gateApprovalAuthenticated;
  delete oldShape.noteSequences;
  await writeFile(path.join(oldShapeProject, ".ke-project.json"), `${JSON.stringify(oldShape, null, 2)}\n`, "utf8");
  const normalizedMigration = await run(process.execPath, [migrate, "--root", oldShapeRoot], repositoryRoot);
  assert.equal(normalizedMigration.code, 0, normalizedMigration.stderr || normalizedMigration.stdout);
  const normalized = JSON.parse(await readFile(path.join(oldShapeProject, ".ke-project.json"), "utf8"));
  assert.equal(normalized.projectType, "assessment");
  assert.equal(normalized.entryRoute, "current-state");
  assert.equal(normalized.gateApprovalAuthenticated, false);
  assert.deepEqual(normalized.noteSequences, {});
  pass("legacy schema-2 state is normalized without resetting its route or project data");

  const symlinkRoot = path.join(tempRoot, "symlink-workspaces");
  const sibling = await writeProject(symlinkRoot, "sibling", projectMarkdown("Sibling"));
  const otherProject = await writeProject(symlinkRoot, "other", projectMarkdown("Other"));
  const linkedProject = path.join(symlinkRoot, "projects", "linked");
  await symlink(sibling, linkedProject, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(canonicalProjectRoot(symlinkRoot, "linked"), /escapes repository projects/u);
  const externalProject = path.join(tempRoot, "external-project");
  await mkdir(externalProject, { recursive: true });
  await symlink(externalProject, path.join(symlinkRoot, "projects", "external"), process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(canonicalProjectRoot(symlinkRoot, "external"), /escapes repository projects/u);
  const internalLink = path.join(sibling, "output", "other-project");
  await symlink(otherProject, internalLink, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(projectFilePath(symlinkRoot, "sibling", "output", "other-project", "PROJECT.md"), /resolves outside workspace/u);
  pass("project roots and workspace files reject sibling-project junctions");

  if (process.platform === "win32") {
    const temporaryParent = path.join(repositoryRoot, ".tmp");
    await mkdir(temporaryParent, { recursive: true });
    initializerTestRoot = await mkdtemp(path.join(temporaryParent, "ke-init-junction-"));
    const initializerRoot = path.join(initializerTestRoot, "initializer-junction");
    const externalProjects = path.join(initializerTestRoot, "external-projects");
    await mkdir(initializerRoot, { recursive: true });
    await mkdir(externalProjects, { recursive: true });
    await mkdir(path.join(initializerRoot, "scripts"), { recursive: true });
    await writeFile(path.join(initializerRoot, "scripts", "init-customer-project.ps1"), await readFile(path.join(repositoryRoot, "scripts", "init-customer-project.ps1")));
    await symlink(externalProjects, path.join(initializerRoot, "projects"), "junction");
    const initializer = await run("powershell.exe", [
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
      path.join(initializerRoot, "scripts", "init-customer-project.ps1"),
      "-ProjectSlug", "junction-test", "-DisplayName", "Junction Test",
    ], repositoryRoot);
    assert.notEqual(initializer.code, 0);
    assert.match(initializer.stderr, /symlink or junction/u);
    assert.deepEqual(await readdir(externalProjects), []);
    pass("PowerShell initializer rejects a projects junction before copying anything");
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
  if (initializerTestRoot) await rm(initializerTestRoot, { recursive: true, force: true });
}

async function exists(target) {
  try {
    await readFile(target);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    try {
      await readdir(target);
      return true;
    } catch (directoryError) {
      if (directoryError.code === "ENOENT") return false;
      throw directoryError;
    }
  }
}

console.log(`Project hardening tests: ${checks} checks passed (isolated temporary workspaces).`);
