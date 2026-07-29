import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

export const PROJECT_SCHEMA_VERSION = 2;
export const PROJECT_TYPES = ["analysis", "demo", "customer", "assessment"];
export const ROUTES = {
  "discovery-intake": {
    label: "Discovery Intake",
    phase: "Discovery Intake",
    gate: "G0 — Engagement Confirmed",
    track: "Analysis",
    types: ["analysis", "customer"],
  },
  "customer-context": {
    label: "Customer Context",
    phase: "Customer Context readiness",
    gate: "G1 — Evidence Baseline Ready",
    track: "Analysis",
    types: ["analysis", "customer"],
  },
  "current-state": {
    label: "Current-State Assessment / As-Is Analysis",
    phase: "Current-State readiness",
    gate: "G2 — Customer Context Confirmed",
    track: "Analysis",
    types: ["analysis", "customer", "assessment"],
  },
  "future-state": {
    label: "Future-State Design / To-Be Analysis",
    phase: "Future-State readiness",
    gate: "G3 — Current State Confirmed",
    track: "Analysis",
    types: ["analysis", "customer"],
  },
  "demo-fast-track": {
    label: "Demo / PoC Fast Track",
    phase: "Demo / PoC Fast Track readiness",
    gate: "G0 — Engagement Confirmed",
    track: "Demo / PoC",
    types: ["demo"],
  },
  "project-delivery": {
    label: "Project Delivery",
    phase: "Project Delivery readiness",
    gate: "G0 — Engagement Confirmed",
    track: "Real Project",
    types: ["customer"],
  },
  "existing-solution": {
    label: "Existing Solution Assessment",
    phase: "Existing Solution Assessment",
    gate: "G0 — Engagement Confirmed",
    track: "Assessment",
    types: ["assessment"],
  },
  "expert-consultation": {
    label: "Expert Consultation / Expert Panel",
    phase: "Expert Consultation",
    gate: "G0 — Engagement Confirmed",
    track: "Analysis",
    types: ["analysis"],
  },
};

const typeLabels = {
  analysis: "Analysis / Advisory",
  demo: "Demo / PoC",
  customer: "Customer implementation",
  assessment: "Existing solution assessment",
};

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export function assertSafeSlug(slug) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(slug ?? "")) {
    throw new Error(`Invalid project slug: ${slug}`);
  }
}

export function projectRoot(repositoryRoot, slug) {
  assertSafeSlug(slug);
  const projects = path.resolve(repositoryRoot, "projects");
  const target = path.resolve(projects, slug);
  if (!target.startsWith(`${projects}${path.sep}`)) {
    throw new Error(`Project path escapes projects/: ${target}`);
  }
  return target;
}

export async function atomicWrite(target, content) {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporary, content, "utf8");
  await rename(temporary, target);
}

export async function withProjectLock(root, action) {
  const lockPath = path.join(root, ".ke-project.lock");
  await mkdir(root, { recursive: true });
  let handle;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      handle = await open(lockPath, "wx");
      await handle.writeFile(
        JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }),
      );
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const age = Date.now() - (await stat(lockPath)).mtimeMs;
      if (age > 120_000) {
        await rm(lockPath, { force: true });
        continue;
      }
      await sleep(100);
    }
  }
  if (!handle) throw new Error(`Project is locked: ${root}`);
  try {
    return await action();
  } finally {
    await handle.close();
    await rm(lockPath, { force: true });
  }
}

export function replaceTableValue(markdown, property, value) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(`^(\\| ${escaped} \\|).*(\\|)$`, "mu");
  if (!pattern.test(markdown)) return markdown;
  return markdown.replace(pattern, `$1 ${value} $2`);
}

function upsertManagedStateTable(markdown, values) {
  const missing = Object.entries(values).filter(([property]) => {
    const escaped = property.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    return !new RegExp(`^\\| ${escaped} \\|`, "mu").test(markdown);
  });
  if (!missing.length) return markdown;
  const rows = missing
    .map(([property, value]) => `| ${property} | ${value ?? "None"} |`)
    .join("\n");
  return `${markdown.trimEnd()}\n\n## KE managed project state\n\n| Property | Value |\n| --- | --- |\n${rows}\n`;
}

export async function loadState(repositoryRoot, slug) {
  const root = projectRoot(repositoryRoot, slug);
  return JSON.parse(await readFile(path.join(root, ".ke-project.json"), "utf8"));
}

export async function saveState(repositoryRoot, state) {
  const root = projectRoot(repositoryRoot, state.projectSlug);
  state.schemaVersion = PROJECT_SCHEMA_VERSION;
  state.revision = Number(state.revision ?? 0) + 1;
  state.updatedAt = new Date().toISOString();
  await atomicWrite(
    path.join(root, ".ke-project.json"),
    `${JSON.stringify(state, null, 2)}\n`,
  );
  let markdown = await readFile(path.join(root, "PROJECT.md"), "utf8");
  const values = {
    "Workspace schema": String(PROJECT_SCHEMA_VERSION),
    "Engagement type": typeLabels[state.projectType] ?? state.projectType,
    "Display name": state.displayName,
    Objective: state.objective,
    "Entry route": ROUTES[state.entryRoute]?.label ?? state.entryRoute,
    "Delivery track": state.deliveryTrack,
    "Current phase": state.currentPhase,
    "Current gate": state.currentGate,
    "Active owner": state.activeOwner,
    "Last handoff": state.lastHandoff,
    "Next action": state.nextAction,
    "Next owner": state.nextOwner,
    "Last updated": state.updatedAt.slice(0, 10),
  };
  markdown = upsertManagedStateTable(markdown, values);
  for (const [property, value] of Object.entries(values)) {
    markdown = replaceTableValue(markdown, property, value ?? "None");
  }
  await atomicWrite(path.join(root, "PROJECT.md"), markdown);
  return state;
}

export async function bootstrapState(
  repositoryRoot,
  { slug, projectType, entryRoute, displayName, objective, force = false },
) {
  const root = projectRoot(repositoryRoot, slug);
  const statePath = path.join(root, ".ke-project.json");
  if (!force) {
    try {
      await stat(statePath);
      throw new Error(`Project state already exists: ${statePath}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const route = ROUTES[entryRoute];
  if (!route) throw new Error(`Unknown entry route: ${entryRoute}`);
  if (!route.types.includes(projectType)) {
    throw new Error(
      `Entry route ${entryRoute} is incompatible with ${projectType}`,
    );
  }
  const state = {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    projectSlug: slug,
    projectType,
    displayName,
    objective,
    entryRoute,
    deliveryTrack: route.track,
    currentPhase: route.phase,
    currentGate: route.gate,
    activeOwner: "KE Router",
    lastHandoff: "None",
    nextAction: `Complete readiness check for ${route.label}`,
    nextOwner: "KE Router",
    revision: 0,
    updatedAt: new Date().toISOString(),
  };
  return saveState(repositoryRoot, state);
}

export async function setActiveProject(repositoryRoot, slug) {
  await loadState(repositoryRoot, slug);
  const target = path.join(repositoryRoot, ".codex", "ke-active-project.json");
  await atomicWrite(
    target,
    `${JSON.stringify(
      { schemaVersion: 1, activeProject: slug, updatedAt: new Date().toISOString() },
      null,
      2,
    )}\n`,
  );
  return slug;
}

export async function getActiveProject(repositoryRoot) {
  const content = JSON.parse(
    await readFile(
      path.join(repositoryRoot, ".codex", "ke-active-project.json"),
      "utf8",
    ),
  );
  await loadState(repositoryRoot, content.activeProject);
  return content.activeProject;
}

export async function listProjects(repositoryRoot) {
  const projectsPath = path.join(repositoryRoot, "projects");
  const entries = await readdir(projectsPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name !== "_template")
    .map((entry) => entry.name)
    .sort();
}

export async function validateProject(repositoryRoot, slug) {
  const errors = [];
  const root = projectRoot(repositoryRoot, slug);
  let state;
  try {
    state = await loadState(repositoryRoot, slug);
  } catch (error) {
    return [`${slug}: missing/invalid .ke-project.json: ${error.message}`];
  }
  if (state.schemaVersion !== PROJECT_SCHEMA_VERSION) {
    errors.push(`${slug}: unsupported schema ${state.schemaVersion}`);
  }
  if (state.projectSlug !== slug) errors.push(`${slug}: state slug mismatch`);
  if (!ROUTES[state.entryRoute]) errors.push(`${slug}: unknown entry route`);
  if (!ROUTES[state.entryRoute]?.types.includes(state.projectType)) {
    errors.push(`${slug}: incompatible project type and route`);
  }
  for (const name of [
    "PROJECT.md",
    "TEAM-NOTES.md",
    "input",
    "private",
    "analysis",
    "output",
    "history",
  ]) {
    try {
      await stat(path.join(root, name));
    } catch {
      errors.push(`${slug}: missing ${name}`);
    }
  }
  const markdown = await readFile(path.join(root, "PROJECT.md"), "utf8");
  for (const [property, value] of [
    ["Workspace schema", String(PROJECT_SCHEMA_VERSION)],
    ["Entry route", ROUTES[state.entryRoute].label],
    ["Current phase", state.currentPhase],
    ["Current gate", state.currentGate],
  ]) {
    if (!markdown.includes(`| ${property} | ${value} |`)) {
      errors.push(`${slug}: PROJECT.md out of sync for ${property}`);
    }
  }
  return errors;
}
