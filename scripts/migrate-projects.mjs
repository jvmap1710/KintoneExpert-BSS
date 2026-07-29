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
  ROUTES,
  bootstrapState,
  listProjects,
  loadState,
  projectRoot,
  saveState,
  validateProject,
} from "./lib/project-state.mjs";

const ownRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function option(name, fallback) {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
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
  } catch {
    return false;
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
  const value = tableValue(markdown, ["Engagement type", "Loại"]) ?? "";
  if (/demo|poc/iu.test(value)) return "demo";
  if (/assessment|đánh giá/iu.test(value)) return "assessment";
  if (/analysis|advisory|phân tích/iu.test(value)) return "analysis";
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

async function backup(relative, source) {
  const destination = path.join(backupRoot, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

async function migrate(slug) {
  const root = projectRoot(repositoryRoot, slug);
  const projectPath = path.join(root, "PROJECT.md");
  if (!(await exists(projectPath))) return { slug, status: "skipped", reason: "missing PROJECT.md" };
  let project = await readFile(projectPath, "utf8");
  const stateExists = await exists(path.join(root, ".ke-project.json"));
  const currentState = stateExists
    ? await loadState(repositoryRoot, slug).catch(() => undefined)
    : undefined;
  const stateNeedsUpgrade =
    currentState && currentState.schemaVersion < PROJECT_SCHEMA_VERSION;
  const futureState =
    currentState && currentState.schemaVersion > PROJECT_SCHEMA_VERSION;
  if (futureState) {
    return {
      slug,
      status: "invalid",
      errors: [
        `${slug}: project schema ${currentState.schemaVersion} is newer than this Kit`,
      ],
    };
  }
  const missingNotes = !(await exists(path.join(root, "TEAM-NOTES.md")));
  const missingDirectories = [];
  for (const name of ["input", "private", "analysis", "output", "history"]) {
    if (!(await exists(path.join(root, name)))) missingDirectories.push(name);
  }
  const needsSchema = !project.includes(`| Workspace schema | ${PROJECT_SCHEMA_VERSION} |`);
  if (
    !stateExists ||
    stateNeedsUpgrade ||
    missingNotes ||
    missingDirectories.length ||
    needsSchema
  ) {
    if (dryRun) {
      return {
        slug,
        status: "would-migrate",
        state: !stateExists,
        stateUpgrade: Boolean(stateNeedsUpgrade),
        teamNotes: missingNotes,
        directories: missingDirectories,
        schema: needsSchema,
      };
    }
    await mkdir(backupRoot, { recursive: true });
    await backup(path.join("projects", slug, "PROJECT.md"), projectPath);
    if (stateExists) {
      await backup(
        path.join("projects", slug, ".ke-project.json"),
        path.join(root, ".ke-project.json"),
      );
    }
    if (!missingNotes) {
      await backup(
        path.join("projects", slug, "TEAM-NOTES.md"),
        path.join(root, "TEAM-NOTES.md"),
      );
    }
    for (const name of missingDirectories) {
      await mkdir(path.join(root, name), { recursive: true });
    }
    if (missingNotes) {
      const template = await readFile(
        path.join(repositoryRoot, "projects", "_template", "TEAM-NOTES.md"),
        "utf8",
      );
      const displayName =
        tableValue(project, ["Display name", "Tên hiển thị"]) ??
        project.match(/^# (.+)$/mu)?.[1] ??
        slug;
      await writeFile(
        path.join(root, "TEAM-NOTES.md"),
        template.replaceAll("{{DISPLAY_NAME}}", displayName),
        "utf8",
      );
    }
    if (needsSchema) {
      const separator = /^\| --- \| --- \|$/mu;
      if (separator.test(project)) {
        project = project.replace(
          separator,
          `| --- | --- |\n| Workspace schema | ${PROJECT_SCHEMA_VERSION} |`,
        );
      } else {
        project += `\n## KE managed project state\n\n| Property | Value |\n| --- | --- |\n| Workspace schema | ${PROJECT_SCHEMA_VERSION} |\n`;
      }
      await writeFile(projectPath, project, "utf8");
    }
    if (!stateExists) {
      const type = inferType(project);
      await bootstrapState(repositoryRoot, {
        slug,
        projectType: type,
        entryRoute: defaultRoute(type),
        displayName:
          tableValue(project, ["Display name", "Tên hiển thị"]) ??
          project.match(/^# (.+)$/mu)?.[1] ??
          slug,
        objective:
          tableValue(project, ["Objective", "Mục tiêu"]) ?? "Not specified",
      });
    } else if (stateNeedsUpgrade) {
      const type = currentState.projectType ?? inferType(project);
      const routeName =
        ROUTES[currentState.entryRoute]?.types.includes(type)
          ? currentState.entryRoute
          : defaultRoute(type);
      const route = ROUTES[routeName];
      await saveState(repositoryRoot, {
        ...currentState,
        projectSlug: slug,
        projectType: type,
        entryRoute: routeName,
        displayName:
          currentState.displayName ??
          tableValue(project, ["Display name", "Tên hiển thị"]) ??
          slug,
        objective:
          currentState.objective ??
          tableValue(project, ["Objective", "Mục tiêu"]) ??
          "Not specified",
        deliveryTrack: currentState.deliveryTrack ?? route.track,
        currentPhase: currentState.currentPhase ?? route.phase,
        currentGate: currentState.currentGate ?? route.gate,
        activeOwner: currentState.activeOwner ?? "KE Router",
        lastHandoff: currentState.lastHandoff ?? "None",
        nextAction:
          currentState.nextAction ??
          `Complete readiness check for ${route.label}`,
        nextOwner: currentState.nextOwner ?? "KE Router",
      });
    }
  }
  const errors = await validateProject(repositoryRoot, slug);
  return {
    slug,
    status:
      errors.length
        ? "invalid"
        : stateExists &&
            !stateNeedsUpgrade &&
            !missingNotes &&
            !missingDirectories.length &&
            !needsSchema
          ? "current"
          : "migrated",
    errors,
  };
}

const results = [];
for (const slug of await listProjects(repositoryRoot)) results.push(await migrate(slug));
const report = {
  schemaVersion: 1,
  dryRun,
  repositoryRoot,
  backupRoot: dryRun ? null : backupRoot,
  generatedAt: new Date().toISOString(),
  results,
};
if (!dryRun) {
  await mkdir(path.join(repositoryRoot, ".codex"), { recursive: true });
  await writeFile(
    path.join(repositoryRoot, ".codex", "ke-last-migration.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
}
console.log(JSON.stringify(report, null, 2));
if (results.some((result) => result.status === "invalid")) process.exitCode = 1;
