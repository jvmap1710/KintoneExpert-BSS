#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  ROUTES,
  bootstrapState,
  getActiveProject,
  listProjects,
  loadState,
  projectFilePath,
  setActiveProject,
  updateProjectState,
  validateProject,
} from "./lib/project-state.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const args = process.argv.slice(2);
const command = args.shift();

function option(name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

function positional(index = 0) {
  return args.filter((value, position) => {
    if (position > 0 && args[position - 1].startsWith("--")) return false;
    return !value.startsWith("--");
  })[index];
}

function requiredProject() {
  const slug = option("--project");
  if (!slug) throw new Error("--project is required for project mutations");
  return slug;
}

function expectedRevisionOption() {
  const value = option("--expected-revision");
  if (value === undefined) return undefined;
  if (!/^\d+$/u.test(value)) throw new Error("--expected-revision must be a non-negative integer");
  return Number(value);
}

function requiredString(note, name) {
  if (typeof note?.[name] !== "string" || !note[name].trim()) {
    throw new Error(`Note field ${name} must be a non-empty string`);
  }
  return note[name].trim();
}

function optionalString(note, name, fallback) {
  if (note?.[name] === undefined) return fallback;
  if (typeof note[name] !== "string") throw new Error(`Note field ${name} must be a string`);
  return note[name];
}

function normalizeNoteText(value) {
  return value.replace(/\r\n|\r/gu, "\n");
}

function safeNoteText(value) {
  return normalizeNoteText(value)
    .split("\n")
    .map((line) => (/^#{1,6}\s/u.test(line) ? `\\${line}` : line))
    .join("\n");
}

function singleLine(value, name) {
  if (/[\r\n]/u.test(value)) throw new Error(`Note field ${name} must be a single line`);
  return value;
}

function addOpenNote(markdown, block) {
  const closedIndex = markdown.search(/^## Closed items\s*$/mu);
  const boundary = closedIndex < 0 ? markdown.length : closedIndex;
  const openItems = markdown.slice(0, boundary).replace(/(^|\n)No open notes\.\s*(?=\n|$)/u, "$1");
  const remainder = markdown.slice(boundary);
  return `${openItems.trimEnd()}\n\n${block.trim()}\n${remainder ? `\n${remainder.trimStart()}` : ""}`;
}

function noteIds(markdown) {
  return [...markdown.matchAll(/^## NOTE-(\d{4})-(\d+)\s*$/gmu)];
}

async function archivedNoteMarkdown(slug) {
  const historyPath = await projectFilePath(repositoryRoot, slug, "history");
  const files = await readdir(historyPath, { withFileTypes: true });
  const markdown = [];
  for (const entry of files) {
    if (!entry.name.startsWith("TEAM-NOTES-")) continue;
    if (entry.isSymbolicLink()) throw new Error(`Unsafe archived notes link: ${entry.name}`);
    if (!entry.isFile()) continue;
    const notesPath = await projectFilePath(repositoryRoot, slug, "history", entry.name);
    markdown.push(await readFile(notesPath, "utf8"));
  }
  return markdown.join("\n");
}

function appendNoteResponse(markdown, id, { author, response, status }) {
  if (!/^NOTE-\d{4}-\d{3,}$/u.test(id)) throw new Error(`Invalid note ID: ${id}`);
  const header = `## ${id}`;
  const start = markdown.indexOf(`${header}\n`);
  if (start < 0) throw new Error(`Active note not found: ${id}`);
  const afterHeader = start + header.length;
  const following = markdown.slice(afterHeader).search(/^## (?:NOTE-\d{4}-\d+|Closed items)\s*$/mu);
  const end = following < 0 ? markdown.length : afterHeader + following;
  let block = markdown.slice(start, end);
  const statusPattern = /^- Status: (.+)$/mu;
  const currentStatus = block.match(statusPattern)?.[1];
  if (!currentStatus) throw new Error(`${id}: note has no status field`);
  if (["Confirmed", "Closed", "Rejected", "Deferred"].includes(currentStatus)) {
    throw new Error(`${id}: note is already resolved (${currentStatus})`);
  }
  if (status) block = block.replace(statusPattern, `- Status: ${status}`);
  const responseHeading = /^### Response \/ Resolution\s*$/mu;
  const responseMatch = responseHeading.exec(block);
  if (!responseMatch) throw new Error(`${id}: missing response section`);
  const responseStart = responseMatch.index + responseMatch[0].length;
  const nextHeading = block.slice(responseStart).search(/^### /mu);
  const responseEnd = nextHeading < 0 ? block.length : responseStart + nextHeading;
  const currentResponse = block.slice(responseStart, responseEnd).trim();
  const stamp = new Date().toISOString();
  const responseBlock = `\n\n- [${stamp}] ${author}:\n\n${normalizeNoteText(response).split("\n").map((line) => `  ${line}`).join("\n")}\n\n`;
  const nextResponse = currentResponse === "Pending."
    ? responseBlock.trimEnd()
    : `${currentResponse}${responseBlock}`.trimEnd();
  block = `${block.slice(0, responseStart)}\n\n${nextResponse}\n\n${block.slice(responseEnd).trimStart()}`;
  return `${markdown.slice(0, start)}${block}${markdown.slice(end)}`;
}

async function addNote(slug, note, expectedRevision) {
  const required = Object.fromEntries(
    ["author", "phase", "type", "priority", "context", "item"].map((key) => [key, requiredString(note, key)]),
  );
  for (const key of ["author", "phase", "type", "priority"]) singleLine(required[key], key);
  const metadata = Object.fromEntries(
    ["targetRole", "relatedSources", "relatedArtifacts", "dueDate"].map((key) =>
      [key, singleLine(optionalString(note, key, "N/A"), key)],
    ),
  );
  if (!["Finding", "Question", "Conflict", "Assumption", "Risk", "Proposal", "Decision Request", "Handoff", "Test Finding", "Blocker"].includes(required.type)) {
    throw new Error(`Invalid note type: ${required.type}`);
  }
  if (!["Critical", "High", "Medium", "Low"].includes(required.priority)) {
    throw new Error(`Invalid note priority: ${required.priority}`);
  }
  let id;
  await updateProjectState(repositoryRoot, slug, async (state) => {
    const notesPath = await projectFilePath(repositoryRoot, slug, "TEAM-NOTES.md");
    let markdown = await readFile(notesPath, "utf8");
    const archived = await archivedNoteMarkdown(slug);
    const year = String(new Date().getFullYear());
    const allIds = [...noteIds(markdown), ...noteIds(archived)];
    const scannedNext = Math.max(
      1,
      ...allIds.filter((match) => match[1] === year).map((match) => Number(match[2]) + 1),
    );
    state.noteSequences ??= {};
    const sequence = Math.max(scannedNext, Number(state.noteSequences[year] ?? 1));
    id = `NOTE-${year}-${String(sequence).padStart(3, "0")}`;
    state.noteSequences[year] = sequence + 1;
    const stamp = new Date().toISOString();
    const block = `## ${id}\n\n- Date: ${stamp}\n- Author: ${required.author}\n- Phase: ${required.phase}\n- Type: ${required.type}\n- Priority: ${required.priority}\n- Target role: ${metadata.targetRole}\n- Status: Open\n- Related sources: ${metadata.relatedSources}\n- Related artifacts: ${metadata.relatedArtifacts}\n- Decision required by: ${metadata.dueDate}\n\n### Context\n\n${safeNoteText(required.context)}\n\n### Finding / Question\n\n${safeNoteText(required.item)}\n\n### Impact\n\n${safeNoteText(optionalString(note, "impact", "Not stated."))}\n\n### Response / Resolution\n\nPending.\n\n### Next action\n\n${safeNoteText(optionalString(note, "nextAction", "Pending owner."))}`;
    markdown = addOpenNote(markdown, block);
    return { state, teamNotesMarkdown: markdown };
  }, { expectedRevision });
  console.log(id);
}

async function updateNote(slug, id, input, resolve, expectedRevision) {
  const author = singleLine(requiredString(input, "author"), "author");
  const response = requiredString(input, resolve ? "resolution" : "response");
  const status = resolve ? requiredString(input, "status") : optionalString(input, "status", undefined);
  if (resolve && !["Answered", "Confirmed", "Closed", "Rejected", "Deferred"].includes(status)) {
    throw new Error(`Invalid resolution status: ${status}`);
  }
  if (!resolve && status !== undefined && !["In Review", "Answered"].includes(status)) {
    throw new Error(`Invalid response status: ${status}`);
  }
  await updateProjectState(repositoryRoot, slug, async (state) => {
    const notesPath = await projectFilePath(repositoryRoot, slug, "TEAM-NOTES.md");
    const markdown = await readFile(notesPath, "utf8");
    const nextMarkdown = appendNoteResponse(markdown, id, { author, response, status });
    return { state, teamNotesMarkdown: nextMarkdown };
  }, { expectedRevision });
}

async function main() {
  if (command === "bootstrap") {
    const slug = requiredProject();
    await bootstrapState(repositoryRoot, {
      slug,
      projectType: option("--type"),
      entryRoute: option("--route"),
      displayName: option("--display-name"),
      objective: option("--objective"),
      force: args.includes("--force"),
    });
    console.log(`Bootstrapped project state: ${slug}`);
    return;
  }
  if (command === "list") {
    const active = await getActiveProject(repositoryRoot).catch(() => undefined);
    for (const slug of await listProjects(repositoryRoot)) {
      console.log(`${slug === active ? "*" : " "} ${slug}`);
    }
    return;
  }
  if (command === "use") {
    const slug = option("--project") ?? positional(0);
    if (!slug) throw new Error("use requires --project <slug>");
    await setActiveProject(repositoryRoot, slug);
    console.log(`Active project: ${slug}`);
    return;
  }
  if (command === "current" || command === "show") {
    const slug = option("--project") ??
      (command === "show" ? positional(0) : undefined) ??
      (await getActiveProject(repositoryRoot));
    console.log(JSON.stringify(await loadState(repositoryRoot, slug), null, 2));
    return;
  }
  if (command === "validate") {
    const all = args.includes("--all");
    const slugs = all
      ? await listProjects(repositoryRoot)
      : [option("--project") ?? positional(0) ?? (await getActiveProject(repositoryRoot))];
    const errors = (await Promise.all(slugs.map((slug) => validateProject(repositoryRoot, slug)))).flat();
    if (errors.length) throw new Error(errors.join("\n"));
    console.log(`Project validation passed (${slugs.length} project(s)).`);
    return;
  }
  if (command === "transition") {
    const routeName = positional(0);
    const route = ROUTES[routeName];
    if (!route) throw new Error(`Unknown route: ${routeName}`);
    const slug = requiredProject();
    const expectedRevision = expectedRevisionOption();
    const requestedType = option("--type");
    const requestedPhase = option("--phase");
    const requestedGate = option("--gate");
    const requestedGateStatus = option("--gate-status");
    const requestedEvidence = option("--evidence");
    const requestedApprover = option("--approver");
    if (requestedGateStatus !== undefined && !["pending", "satisfied"].includes(requestedGateStatus)) {
      throw new Error("--gate-status must be pending or satisfied");
    }
    if ((requestedEvidence !== undefined || requestedApprover !== undefined) && requestedGateStatus !== "satisfied") {
      throw new Error("--evidence and --approver may only be supplied with --gate-status satisfied");
    }
    if (requestedGateStatus === "satisfied" && (!requestedEvidence?.trim() || !requestedApprover?.trim())) {
      throw new Error("A satisfied gate requires non-empty --evidence and --approver");
    }
    await updateProjectState(repositoryRoot, slug, (state) => {
      const nextType = requestedType ?? state.projectType;
      if (!route.types.includes(nextType)) {
        throw new Error(`${routeName} is incompatible with ${nextType}`);
      }
      const routeChanged = routeName !== state.entryRoute || nextType !== state.projectType;
      const nextPhase = requestedPhase ?? (routeChanged ? route.phase : state.currentPhase);
      const nextGate = requestedGate ?? (routeChanged ? route.gate : state.currentGate);
      const gateChanged = routeChanged || nextGate !== state.currentGate;
      const gateStatus = requestedGateStatus ?? (gateChanged ? "pending" : state.gateStatus);
      Object.assign(state, {
        projectType: nextType,
        entryRoute: routeName,
        deliveryTrack: route.track,
        currentPhase: nextPhase,
        currentGate: nextGate,
        gateStatus,
        gateEvidence: gateStatus === "satisfied"
          ? requestedEvidence ?? state.gateEvidence
          : gateStatus === "pending" && (gateChanged || requestedGateStatus === "pending")
            ? null
            : state.gateEvidence,
        gateApprover: gateStatus === "satisfied"
          ? requestedApprover ?? state.gateApprover
          : gateStatus === "pending" && (gateChanged || requestedGateStatus === "pending")
            ? null
            : state.gateApprover,
        gateApprovalAuthenticated: false,
        activeOwner: option("--owner", routeChanged ? "KE Router" : state.activeOwner),
        lastHandoff: option(
          "--last-handoff",
          nextPhase === state.currentPhase ? state.lastHandoff : `${state.currentPhase} -> ${nextPhase}`,
        ),
        nextAction: option(
          "--next-action",
          routeChanged ? `Complete readiness check for ${route.label}` : state.nextAction,
        ),
        nextOwner: option("--next-owner", routeChanged ? "KE Router" : state.nextOwner),
      });
      return state;
    }, { expectedRevision });
    console.log(`Transitioned ${slug} to ${route.label}`);
    return;
  }
  if (command === "note") {
    const operation = positional(0);
    const slug = requiredProject();
    const expectedRevision = expectedRevisionOption();
    const inputPath = option("--from");
    if (!inputPath) throw new Error("note commands require --from <json-file>");
    const input = JSON.parse(await readFile(inputPath, "utf8"));
    if (operation === "add") {
      await addNote(slug, input, expectedRevision);
      return;
    }
    if (operation === "respond" || operation === "resolve") {
      const id = positional(1);
      if (!id) throw new Error(`note ${operation} requires a note ID`);
      await updateNote(slug, id, input, operation === "resolve", expectedRevision);
      console.log(`${operation === "resolve" ? "Resolved" : "Responded to"} ${id}`);
      return;
    }
  }
  throw new Error(
    "Usage: ke-project <list|use|current|show|validate|bootstrap|transition|note add|note respond|note resolve>",
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

