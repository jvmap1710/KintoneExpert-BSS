#!/usr/bin/env node

import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  PROJECT_SCHEMA_VERSION,
  PROJECT_TYPES,
  ROUTES,
  bootstrapState,
  canonicalProjectRoot,
  listProjects,
  projectFilePath,
  saveState,
  validateProject,
  validateProjectStateData,
} from "./lib/project-state.mjs";

const ownRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function option(name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

const repositoryRoot = path.resolve(option("--root", ownRoot));
const dryRun = args.includes("--dry-run");
const backupRoot = option(
  "--backup-root",
  path.join(
    repositoryRoot,
    ".codex",
    "ke-backups",
    `project-migration-${new Date().toISOString().replace(/[:.]/gu, "-")}`,
  ),
);

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function tableValue(markdown, labels) {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const match = markdown.match(new RegExp(`^\\| ${escaped} \\| (.*?) \\|$`, "mu"));
    if (match) return match[1].replaceAll("\\|", "|").trim();
  }
  return undefined;
}

function inferType(markdown) {
  const value = tableValue(markdown, ["Engagement type", "Lo\u1ea1i"]) ?? "";
  if (/demo|poc/iu.test(value)) return "demo";
  if (/assessment|\u0110\u00e1nh gi\u00e1/iu.test(value)) return "assessment";
  if (/analysis|advisory|ph\u00e2n t\u00edch/iu.test(value)) return "analysis";
  return "customer";
}

function defaultRoute(type) {
  return {
    analysis: "discovery-intake",
    demo: "demo-fast-track",
    customer: "project-delivery",
    assessment: "existing-solution",
  }[type];
}

function markdownRoute(markdown, type) {
  const value = tableValue(markdown, ["Entry route", "Lu\u1ed3ng v\u00e0o"]);
  if (value) {
    const match = Object.entries(ROUTES).find(([name, route]) =>
      route.types.includes(type) &&
      [name, route.label].some((candidate) => candidate.toLowerCase() === value.toLowerCase()),
    );
    if (match) return match[0];
  }
  return defaultRoute(type);
}

function firstText(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim();
}

function projectStateFromMarkdown(slug, markdown, currentState) {
  const projectType = firstText(currentState?.projectType) ?? inferType(markdown);
  if (!PROJECT_TYPES.includes(projectType)) throw new Error(`${slug}: unknown project type ${projectType}`);
  const entryRoute = firstText(currentState?.entryRoute) ?? markdownRoute(markdown, projectType);
  const route = ROUTES[entryRoute];
  if (!route || !route.types.includes(projectType)) {
    throw new Error(`${slug}: entry route ${entryRoute} is incompatible with ${projectType}`);
  }
  const gateStatus = firstText(currentState?.gateStatus, tableValue(markdown, ["Gate status"])) ?? "pending";
  if (!["pending", "satisfied"].includes(gateStatus)) {
    throw new Error(`${slug}: invalid gate status ${gateStatus}`);
  }
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    projectSlug: slug,
    projectType,
    displayName: firstText(
      currentState?.displayName,
      tableValue(markdown, ["Display name", "T\u00ean hi\u1ec3n th\u1ecb"]),
      markdown.match(/^# (.+)$/mu)?.[1],
      slug,
    ),
    objective: firstText(
      currentState?.objective,
      tableValue(markdown, ["Objective", "M\u1ee5c ti\u00eau"]),
      "Not specified",
    ),
    entryRoute,
    deliveryTrack: firstText(currentState?.deliveryTrack, tableValue(markdown, ["Delivery track"]), route.track),
    currentPhase: firstText(currentState?.currentPhase, tableValue(markdown, ["Current phase"]), route.phase),
    currentGate: firstText(currentState?.currentGate, tableValue(markdown, ["Current gate"]), route.gate),
    gateStatus,
    gateEvidence: firstText(currentState?.gateEvidence, tableValue(markdown, ["Gate evidence"])),
    gateApprover: firstText(currentState?.gateApprover, tableValue(markdown, ["Gate approver"])),
    gateApprovalAuthenticated: false,
    activeOwner: firstText(currentState?.activeOwner, tableValue(markdown, ["Active owner"]), "KE Router"),
    lastHandoff: firstText(currentState?.lastHandoff, tableValue(markdown, ["Last handoff"]), "None"),
    nextAction: firstText(
      currentState?.nextAction,
      tableValue(markdown, ["Next action"]),
      `Complete readiness check for ${route.label}`,
    ),
    nextOwner: firstText(currentState?.nextOwner, tableValue(markdown, ["Next owner"]), "KE Router"),
    noteSequences: currentState?.noteSequences ?? {},
    revision: currentState?.revision ?? 0,
    updatedAt: firstText(currentState?.updatedAt, new Date().toISOString()),
  };
}

async function prepare(slug) {
  const root = await canonicalProjectRoot(repositoryRoot, slug);
  const projectPath = await projectFilePath(repositoryRoot, slug, "PROJECT.md");
  if (!(await exists(projectPath))) return { slug, status: "skipped", reason: "missing PROJECT.md" };
  const project = await readFile(projectPath, "utf8");
  const statePath = await projectFilePath(repositoryRoot, slug, ".ke-project.json");
  const stateExists = await exists(statePath);
  let currentState;
  if (stateExists) {
    try {
      currentState = JSON.parse(await readFile(statePath, "utf8"));
    } catch {
      throw new Error(`${slug}: .ke-project.json is malformed`);
    }
    if (!currentState || typeof currentState !== "object" || Array.isArray(currentState)) {
      throw new Error(`${slug}: .ke-project.json must contain an object`);
    }
    const schema = currentState.schemaVersion;
    if (!Number.isInteger(schema) || ![1, PROJECT_SCHEMA_VERSION].includes(schema)) {
      throw new Error(`${slug}: project schema ${schema ?? "missing"} is unknown or newer than this Kit`);
    }
  }

  const stateNeedsUpgrade = stateExists && (
    currentState.schemaVersion < PROJECT_SCHEMA_VERSION ||
    currentState.gateStatus === undefined ||
    currentState.gateApprovalAuthenticated === undefined ||
    currentState.noteSequences === undefined
  );
  const missingNotes = !(await exists(await projectFilePath(repositoryRoot, slug, "TEAM-NOTES.md")));
  const missingDirectories = [];
  for (const name of ["input", "private", "analysis", "output", "history"]) {
    const target = await projectFilePath(repositoryRoot, slug, name);
    if (!(await exists(target))) missingDirectories.push(name);
  }
  const needsSchema = !project.includes(`| Workspace schema | ${PROJECT_SCHEMA_VERSION} |`);
  const nextState = projectStateFromMarkdown(slug, project, currentState);
  if (!stateExists || stateNeedsUpgrade || needsSchema) {
    const errors = validateProjectStateData(nextState, slug);
    if (errors.length) throw new Error(`${slug}: cannot migrate state: ${errors.join("; ")}`);
  } else {
    const errors = validateProjectStateData(currentState, slug);
    if (errors.length) throw new Error(`${slug}: existing project state is invalid: ${errors.join("; ")}`);
  }

  // Resolve every path the apply pass could touch before any project is modified.
  for (const relative of ["PROJECT.md", ".ke-project.json", "TEAM-NOTES.md", ...missingDirectories]) {
    await projectFilePath(repositoryRoot, slug, relative);
  }
  const notesTemplate = missingNotes
    ? await readFile(path.join(repositoryRoot, "projects", "_template", "TEAM-NOTES.md"), "utf8")
    : undefined;
  const needsMigration = !stateExists || stateNeedsUpgrade || missingNotes || missingDirectories.length || needsSchema;
  return {
    slug,
    status: needsMigration ? "would-migrate" : "current",
    root,
    project,
    stateExists,
    currentState,
    nextState,
    stateNeedsUpgrade,
    missingNotes,
    missingDirectories,
    needsSchema,
    notesTemplate,
  };
}

async function backup(relative, source) {
  const destination = path.join(backupRoot, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

async function apply(plan) {
  const { slug } = plan;
  const base = path.join("projects", slug);
  await mkdir(backupRoot, { recursive: true });
  await backup(path.join(base, "PROJECT.md"), path.join(plan.root, "PROJECT.md"));
  if (plan.stateExists) await backup(path.join(base, ".ke-project.json"), path.join(plan.root, ".ke-project.json"));
  const notesPath = path.join(plan.root, "TEAM-NOTES.md");
  if (!plan.missingNotes) await backup(path.join(base, "TEAM-NOTES.md"), notesPath);
  for (const name of plan.missingDirectories) await mkdir(path.join(plan.root, name), { recursive: true });
  if (plan.missingNotes) {
    await writeFile(
      notesPath,
      plan.notesTemplate.replaceAll("{{DISPLAY_NAME}}", plan.nextState.displayName),
      "utf8",
    );
  }
  if (!plan.stateExists) {
    await bootstrapState(repositoryRoot, {
      slug,
      projectType: plan.nextState.projectType,
      entryRoute: plan.nextState.entryRoute,
      displayName: plan.nextState.displayName,
      objective: plan.nextState.objective,
      initialState: plan.nextState,
    });
  } else if (plan.stateNeedsUpgrade || plan.needsSchema) {
    await saveState(repositoryRoot, plan.nextState);
  }
  const errors = await validateProject(repositoryRoot, slug);
  return { slug, status: errors.length ? "invalid" : "migrated", errors };
}

const plans = [];
for (const slug of await listProjects(repositoryRoot)) {
  try {
    plans.push(await prepare(slug));
  } catch (error) {
    plans.push({ slug, status: "invalid", errors: [error.message] });
  }
}

const preflightFailed = plans.some((plan) => plan.status === "invalid");
const results = [];
for (const plan of plans) {
  if (plan.status !== "would-migrate" || dryRun || preflightFailed) {
    results.push(plan.status === "would-migrate"
      ? {
          slug: plan.slug,
          status: "would-migrate",
          state: !plan.stateExists,
          stateUpgrade: plan.stateNeedsUpgrade,
          teamNotes: plan.missingNotes,
          directories: plan.missingDirectories,
          schema: plan.needsSchema,
        }
      : { slug: plan.slug, status: plan.status, reason: plan.reason, errors: plan.errors });
    continue;
  }
  results.push(await apply(plan));
}

const report = {
  schemaVersion: 1,
  dryRun,
  repositoryRoot,
  backupRoot: dryRun || preflightFailed ? null : backupRoot,
  generatedAt: new Date().toISOString(),
  results,
};
if (!dryRun && !preflightFailed) {
  await mkdir(path.join(repositoryRoot, ".codex"), { recursive: true });
  await writeFile(
    path.join(repositoryRoot, ".codex", "ke-last-migration.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
}
console.log(JSON.stringify(report, null, 2));
if (preflightFailed || results.some((result) => result.status === "invalid")) process.exitCode = 1;
