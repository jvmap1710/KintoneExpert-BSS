import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

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

function isWithin(parent, target) {
  const relative = path.relative(parent, target);
  return relative === "" ||
    (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

async function canonicalTarget(root, target) {
  try {
    return await realpath(target);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const parent = path.dirname(target);
    if (parent === target) throw error;
    return path.join(await canonicalTarget(root, parent), path.basename(target));
  }
}

export async function canonicalProjectRoot(repositoryRoot, slug) {
  const lexicalRoot = projectRoot(repositoryRoot, slug);
  const canonicalRepository = await realpath(repositoryRoot);
  const canonicalProjects = await realpath(path.join(repositoryRoot, "projects"));
  const canonicalRoot = await realpath(lexicalRoot);
  const expectedRoot = path.resolve(canonicalProjects, slug);
  if (!isWithin(canonicalRepository, canonicalProjects) ||
      !isWithin(canonicalProjects, canonicalRoot) ||
      path.relative(expectedRoot, canonicalRoot) !== "") {
    throw new Error(`Project workspace escapes repository projects/: ${slug}`);
  }
  return canonicalRoot;
}

export async function projectFilePath(repositoryRoot, slug, ...segments) {
  const root = await canonicalProjectRoot(repositoryRoot, slug);
  const candidate = path.resolve(root, ...segments);
  if (!isWithin(root, candidate)) {
    throw new Error(`Project path escapes workspace: ${segments.join(path.sep)}`);
  }
  const canonical = await canonicalTarget(root, candidate);
  if (!isWithin(root, canonical)) {
    throw new Error(`Project path resolves outside workspace: ${segments.join(path.sep)}`);
  }
  let entry;
  try {
    entry = await lstat(candidate);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (entry) {
    // Existing symlinks/junctions must resolve within the workspace.
    const resolved = await realpath(candidate);
    if (!isWithin(root, resolved)) {
      throw new Error(`Project path resolves outside workspace: ${segments.join(path.sep)}`);
    }
  }
  return candidate;
}

export async function atomicWrite(target, content) {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}-${randomUUID()}`;
  try {
    await writeFile(temporary, content, "utf8");
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

export async function withProjectLock(root, action) {
  const lockPath = path.join(root, ".ke-project.lock");
  await mkdir(root, { recursive: true });
  let handle;
  const token = randomUUID();
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      handle = await open(lockPath, "wx");
      try {
        await handle.writeFile(
          JSON.stringify({ pid: process.pid, token, createdAt: new Date().toISOString() }),
        );
      } catch (error) {
        await handle.close();
        handle = undefined;
        await rm(lockPath, { force: true });
        throw error;
      }
      break;
    } catch (error) {
      if (error.code === "ENOENT") continue;
      if (error.code !== "EEXIST") throw error;
      let owner;
      try {
        owner = JSON.parse(await readFile(lockPath, "utf8"));
      } catch (readError) {
        if (readError.code === "ENOENT") continue;
      }
      await sleep(100);
    }
  }
  if (!handle) {
    let owner = "unknown";
    try {
      const details = JSON.parse(await readFile(lockPath, "utf8"));
      if (Number.isInteger(details.pid)) owner = `PID ${details.pid}`;
    } catch (error) {
      if (error.code !== "ENOENT") owner = "unreadable lock metadata";
    }
    throw new Error(`Project is locked: ${root} (${owner}); inspect before manual recovery`);
  }
  try {
    return await action();
  } finally {
    await handle.close();
    try {
      const owner = JSON.parse(await readFile(lockPath, "utf8"));
      if (owner.token === token) await rm(lockPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

function normalizeTableCell(value) {
  return String(value ?? "None")
    .replace(/\|/gu, "\\|")
    .replace(/\r\n|\r|\n/gu, " ");
}

export function replaceTableValue(markdown, property, value) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(`^(\\| ${escaped} \\|).*(\\|)$`, "mu");
  if (!pattern.test(markdown)) return markdown;
  return markdown.replace(pattern, (_match, prefix, suffix) =>
    `${prefix} ${normalizeTableCell(value)} ${suffix}`,
  );
}

function upsertManagedStateTable(markdown, values) {
  const missing = Object.entries(values).filter(([property]) => {
    const escaped = property.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    return !new RegExp(`^\\| ${escaped} \\|`, "mu").test(markdown);
  });
  if (!missing.length) return markdown;
  const rows = missing
    .map(([property, value]) => `| ${property} | ${normalizeTableCell(value)} |`)
    .join("\n");
  return `${markdown.trimEnd()}\n\n## KE managed project state\n\n| Property | Value |\n| --- | --- |\n${rows}\n`;
}

function projectStateValues(state) {
  return {
    "Workspace schema": String(PROJECT_SCHEMA_VERSION),
    "Engagement type": typeLabels[state.projectType] ?? state.projectType,
    "Display name": state.displayName,
    Objective: state.objective,
    "Entry route": ROUTES[state.entryRoute]?.label ?? state.entryRoute,
    "Delivery track": state.deliveryTrack,
    "Current phase": state.currentPhase,
    "Current gate": state.currentGate,
    "Gate status": state.gateStatus ?? "pending",
    "Gate evidence": state.gateEvidence ?? "Not recorded",
    "Gate approver": state.gateApprover ?? "Not recorded",
    "Gate approval verification": state.gateStatus === "satisfied"
      ? "User-reported; not authenticated"
      : "Not recorded",
    "Active owner": state.activeOwner,
    "Last handoff": state.lastHandoff,
    "Next action": state.nextAction,
    "Next owner": state.nextOwner,
    "Last updated": state.updatedAt.slice(0, 10),
  };
}

export function validateProjectStateData(state, slug) {
  const errors = [];
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    return [`${slug}: .ke-project.json must contain an object`];
  }
  if (state.schemaVersion !== PROJECT_SCHEMA_VERSION) {
    errors.push(`${slug}: unsupported schema ${state.schemaVersion}`);
  }
  if (state.projectSlug !== slug) errors.push(`${slug}: state slug mismatch`);
  if (!Number.isInteger(state.revision) || state.revision < 0) {
    errors.push(`${slug}: revision must be a non-negative integer`);
  }
  if (!PROJECT_TYPES.includes(state.projectType)) {
    errors.push(`${slug}: unknown project type ${state.projectType}`);
  }
  if (!ROUTES[state.entryRoute]) errors.push(`${slug}: unknown entry route`);
  if (!ROUTES[state.entryRoute]?.types.includes(state.projectType)) {
    errors.push(`${slug}: incompatible project type and route`);
  }
  for (const key of [
    "displayName",
    "objective",
    "deliveryTrack",
    "currentPhase",
    "currentGate",
    "activeOwner",
    "lastHandoff",
    "nextAction",
    "nextOwner",
    "updatedAt",
  ]) {
    if (typeof state[key] !== "string" || !state[key].trim()) {
      errors.push(`${slug}: missing ${key}`);
    }
  }
  if (!(state.gateStatus === "pending" || state.gateStatus === "satisfied")) {
    errors.push(`${slug}: invalid gate status ${state.gateStatus}`);
  }
  if (state.gateStatus === "satisfied" &&
      (!String(state.gateEvidence ?? "").trim() || !String(state.gateApprover ?? "").trim())) {
    errors.push(`${slug}: satisfied gate requires evidence and approver`);
  }
  if (state.gateApprovalAuthenticated !== false) {
    errors.push(`${slug}: gate approval must remain an unauthenticated user assertion`);
  }
  if (!state.noteSequences || typeof state.noteSequences !== "object" || Array.isArray(state.noteSequences) ||
      Object.entries(state.noteSequences).some(([year, sequence]) => !/^\d{4}$/u.test(year) || !Number.isInteger(sequence) || sequence < 1)) {
    errors.push(`${slug}: noteSequences must map years to positive integer sequences`);
  }
  return errors;
}

function renderProjectMarkdown(markdown, state) {
  const values = projectStateValues(state);
  markdown = upsertManagedStateTable(markdown, values);
  for (const [property, value] of Object.entries(values)) {
    markdown = replaceTableValue(markdown, property, value ?? "None");
  }
  return markdown;
}

async function readStateUnlocked(repositoryRoot, slug) {
  const statePath = await projectFilePath(repositoryRoot, slug, ".ke-project.json");
  return JSON.parse(await readFile(statePath, "utf8"));
}

async function recoverProjectUnlocked(repositoryRoot, slug) {
  const journalPath = await projectFilePath(repositoryRoot, slug, ".ke-project.journal.json");
  let journal;
  try {
    journal = JSON.parse(await readFile(journalPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw new Error(`${slug}: invalid state journal: ${error.message}`);
  }
  if (!journal || typeof journal !== "object" || Array.isArray(journal) ||
      journal.schemaVersion !== 1 || journal.projectSlug !== slug ||
      !(journal.baseRevision === null || (Number.isInteger(journal.baseRevision) && journal.baseRevision >= 0)) ||
      typeof journal.projectMarkdown !== "string" ||
      (journal.teamNotesMarkdown !== undefined && typeof journal.teamNotesMarkdown !== "string")) {
    throw new Error(`${slug}: invalid state journal schema or fields; manual recovery required`);
  }
  const expectedNextRevision = (journal.baseRevision ?? 0) + 1;
  if (journal.nextState?.projectSlug !== slug || journal.nextState?.revision !== expectedNextRevision) {
    throw new Error(`${slug}: invalid state journal project or revision chain; manual recovery required`);
  }
  const nextStateErrors = validateProjectStateData(journal.nextState, slug);
  if (nextStateErrors.length) {
    throw new Error(`${slug}: invalid next state in journal: ${nextStateErrors.join("; ")}`);
  }
  const statePath = await projectFilePath(repositoryRoot, slug, ".ke-project.json");
  let current;
  try {
    current = JSON.parse(await readFile(statePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (current !== undefined && (!current || typeof current !== "object" || Array.isArray(current) ||
      current.projectSlug !== slug || !Number.isInteger(current.revision) || current.revision < 0)) {
    throw new Error(`${slug}: invalid authoritative state while recovering journal; manual recovery required`);
  }
  if (current?.revision === journal.nextState.revision) {
    if (!isDeepStrictEqual(current, journal.nextState)) {
      throw new Error(`${slug}: journal next state differs from authoritative JSON; manual recovery required`);
    }
    const markdownPath = await projectFilePath(repositoryRoot, slug, "PROJECT.md");
    await atomicWrite(markdownPath, journal.projectMarkdown);
    if (journal.teamNotesMarkdown !== undefined) {
      const notesPath = await projectFilePath(repositoryRoot, slug, "TEAM-NOTES.md");
      await atomicWrite(notesPath, journal.teamNotesMarkdown);
    }
    await rm(journalPath, { force: true });
    return;
  }
  const matchesBase = journal.baseRevision === null
    ? current === undefined
    : current?.revision === journal.baseRevision;
  if (matchesBase) {
    await rm(journalPath, { force: true });
    return;
  }
  throw new Error(`${slug}: state journal conflicts with authoritative JSON; manual recovery required`);
}

async function commitStateUnlocked(
  repositoryRoot,
  currentState,
  nextState,
  { teamNotesMarkdown } = {},
) {
  const slug = nextState.projectSlug;
  const statePath = await projectFilePath(repositoryRoot, slug, ".ke-project.json");
  const markdownPath = await projectFilePath(repositoryRoot, slug, "PROJECT.md");
  const journalPath = await projectFilePath(repositoryRoot, slug, ".ke-project.journal.json");
  // Fail before the authoritative JSON changes if its human-readable projection is absent.
  const previousMarkdown = await readFile(markdownPath, "utf8");
  if (teamNotesMarkdown !== undefined) {
    const notesPath = await projectFilePath(repositoryRoot, slug, "TEAM-NOTES.md");
    await readFile(notesPath, "utf8");
  }
  const baseRevision = currentState?.revision ?? null;
  const state = {
    ...nextState,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    revision: (currentState?.revision ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  const stateErrors = validateProjectStateData(state, slug);
  if (stateErrors.length) throw new Error(`Invalid project state: ${stateErrors.join("; ")}`);
  const journal = {
    schemaVersion: 1,
    projectSlug: slug,
    baseRevision,
    nextState: state,
    projectMarkdown: renderProjectMarkdown(previousMarkdown, state),
    ...(teamNotesMarkdown === undefined ? {} : { teamNotesMarkdown }),
  };
  await atomicWrite(journalPath, `${JSON.stringify(journal, null, 2)}\n`);
  await atomicWrite(statePath, `${JSON.stringify(state, null, 2)}\n`);
  await atomicWrite(markdownPath, journal.projectMarkdown);
  if (teamNotesMarkdown !== undefined) {
    const notesPath = await projectFilePath(repositoryRoot, slug, "TEAM-NOTES.md");
    await atomicWrite(notesPath, teamNotesMarkdown);
  }
  await rm(journalPath, { force: true });
  return state;
}

export async function loadState(repositoryRoot, slug) {
  const root = await canonicalProjectRoot(repositoryRoot, slug);
  return withProjectLock(root, async () => {
    await recoverProjectUnlocked(repositoryRoot, slug);
    return readStateUnlocked(repositoryRoot, slug);
  });
}

export async function saveState(repositoryRoot, state, { expectedRevision } = {}) {
  const root = await canonicalProjectRoot(repositoryRoot, state.projectSlug);
  return withProjectLock(root, async () => {
    await recoverProjectUnlocked(repositoryRoot, state.projectSlug);
    let current;
    try {
      current = await readStateUnlocked(repositoryRoot, state.projectSlug);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const currentRevision = current?.revision ?? 0;
    if (expectedRevision !== undefined && Number(expectedRevision) !== currentRevision) {
      throw new Error(`Stale project revision: expected ${expectedRevision}, found ${currentRevision}`);
    }
    if (Number(state.revision ?? 0) !== currentRevision) {
      throw new Error(`Stale project revision: loaded ${state.revision ?? 0}, found ${currentRevision}`);
    }
    return commitStateUnlocked(repositoryRoot, current, state);
  });
}

export async function updateProjectState(
  repositoryRoot,
  slug,
  update,
  { expectedRevision, teamNotesMarkdown } = {},
) {
  const root = await canonicalProjectRoot(repositoryRoot, slug);
  return withProjectLock(root, async () => {
    await recoverProjectUnlocked(repositoryRoot, slug);
    const current = await readStateUnlocked(repositoryRoot, slug);
    if (expectedRevision !== undefined && Number(expectedRevision) !== current.revision) {
      throw new Error(`Stale project revision: expected ${expectedRevision}, found ${current.revision}`);
    }
    const result = await update(structuredClone(current));
    const next = result?.state ?? result;
    const notes = result?.teamNotesMarkdown ?? teamNotesMarkdown;
    if (next.projectSlug !== slug) throw new Error("Project state update cannot change projectSlug");
    return commitStateUnlocked(repositoryRoot, current, next, { teamNotesMarkdown: notes });
  });
}

export async function bootstrapState(
  repositoryRoot,
  {
    slug,
    projectType,
    entryRoute,
    displayName,
    objective,
    force = false,
    initialState = {},
  },
) {
  projectRoot(repositoryRoot, slug);
  const statePath = await projectFilePath(repositoryRoot, slug, ".ke-project.json");
  let existing;
  if (!force) {
    try {
      await stat(statePath);
      throw new Error(`Project state already exists: ${statePath}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  } else {
    try {
      existing = await readStateUnlocked(repositoryRoot, slug);
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
    ...initialState,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    projectSlug: slug,
    projectType,
    displayName: initialState.displayName ?? displayName,
    objective: initialState.objective ?? objective,
    entryRoute,
    deliveryTrack: initialState.deliveryTrack ?? route.track,
    currentPhase: initialState.currentPhase ?? route.phase,
    currentGate: initialState.currentGate ?? route.gate,
    gateStatus: initialState.gateStatus ?? "pending",
    gateEvidence: initialState.gateEvidence ?? null,
    gateApprover: initialState.gateApprover ?? null,
    gateApprovalAuthenticated: false,
    activeOwner: initialState.activeOwner ?? "KE Router",
    lastHandoff: initialState.lastHandoff ?? "None",
    nextAction: initialState.nextAction ?? `Complete readiness check for ${route.label}`,
    nextOwner: initialState.nextOwner ?? "KE Router",
    noteSequences: initialState.noteSequences ?? {},
    revision: existing?.revision ?? 0,
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
    .filter((entry) =>
      (entry.isDirectory() || entry.isSymbolicLink()) && entry.name !== "_template",
    )
    .map((entry) => entry.name)
    .sort();
}

export async function validateProject(repositoryRoot, slug) {
  const errors = [];
  let root;
  try {
    root = await canonicalProjectRoot(repositoryRoot, slug);
  } catch (error) {
    return [`${slug}: invalid or missing workspace: ${error.message}`];
  }
  let state;
  try {
    state = await withProjectLock(root, async () => {
      await recoverProjectUnlocked(repositoryRoot, slug);
      return readStateUnlocked(repositoryRoot, slug);
    });
  } catch (error) {
    return [`${slug}: missing/invalid .ke-project.json: ${error.message}`];
  }
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    return [`${slug}: .ke-project.json must contain an object`];
  }
  if (state.schemaVersion !== PROJECT_SCHEMA_VERSION) {
    errors.push(`${slug}: unsupported schema ${state.schemaVersion}`);
  }
  if (state.projectSlug !== slug) errors.push(`${slug}: state slug mismatch`);
  if (!PROJECT_TYPES.includes(state.projectType)) {
    errors.push(`${slug}: unknown project type ${state.projectType}`);
  }
  if (!ROUTES[state.entryRoute]) errors.push(`${slug}: unknown entry route`);
  if (!ROUTES[state.entryRoute]?.types.includes(state.projectType)) {
    errors.push(`${slug}: incompatible project type and route`);
  }
  if (typeof state.currentPhase !== "string" || !state.currentPhase.trim()) {
    errors.push(`${slug}: missing current phase`);
  }
  if (typeof state.currentGate !== "string" || !state.currentGate.trim()) {
    errors.push(`${slug}: missing current gate`);
  }
  if (!(["pending", "satisfied"].includes(state.gateStatus ?? "pending"))) {
    errors.push(`${slug}: invalid gate status ${state.gateStatus}`);
  }
  if (state.gateStatus === "satisfied" &&
      (!String(state.gateEvidence ?? "").trim() || !String(state.gateApprover ?? "").trim())) {
    errors.push(`${slug}: satisfied gate requires evidence and approver`);
  }
  if (state.gateApprovalAuthenticated !== false) {
    errors.push(`${slug}: gate approval must remain an unauthenticated user assertion`);
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
      const target = await projectFilePath(repositoryRoot, slug, name);
      await stat(target);
    } catch (error) {
      errors.push(`${slug}: missing or unsafe ${name}: ${error.message}`);
    }
  }
  try {
    const markdownPath = await projectFilePath(repositoryRoot, slug, "PROJECT.md");
    const markdown = await readFile(markdownPath, "utf8");
    const expectedValues = [
      ["Workspace schema", String(PROJECT_SCHEMA_VERSION)],
      ...(ROUTES[state.entryRoute]
        ? [["Entry route", ROUTES[state.entryRoute].label]]
        : []),
      ["Current phase", state.currentPhase],
      ["Current gate", state.currentGate],
    ];
    for (const [property, value] of expectedValues) {
      if (typeof value === "string" && !markdown.includes(`| ${property} | ${normalizeTableCell(value)} |`)) {
        errors.push(`${slug}: PROJECT.md out of sync for ${property}`);
      }
    }
  } catch (error) {
    errors.push(`${slug}: cannot read PROJECT.md: ${error.message}`);
  }
  return errors;
}
