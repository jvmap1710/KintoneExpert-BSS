#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  ROUTES,
  bootstrapState,
  getActiveProject,
  listProjects,
  loadState,
  projectRoot,
  saveState,
  setActiveProject,
  validateProject,
  withProjectLock,
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

async function selectedProject() {
  return option("--project") ?? positional(1) ?? getActiveProject(repositoryRoot);
}

async function appendNote(slug, note) {
  const root = projectRoot(repositoryRoot, slug);
  await withProjectLock(root, async () => {
    const notesPath = path.join(root, "TEAM-NOTES.md");
    let markdown = await readFile(notesPath, "utf8");
    const year = new Date().getFullYear();
    const numbers = [...markdown.matchAll(new RegExp(`NOTE-${year}-(\\d+)`, "gu"))]
      .map((match) => Number(match[1]));
    const id = `NOTE-${year}-${String(Math.max(0, ...numbers) + 1).padStart(3, "0")}`;
    const block = `\n## ${id}\n\n- Date: ${new Date().toISOString()}\n- Author: ${note.author}\n- Phase: ${note.phase}\n- Type: ${note.type}\n- Priority: ${note.priority}\n- Target role: ${note.targetRole ?? "N/A"}\n- Status: Open\n- Related sources: ${note.relatedSources ?? "N/A"}\n- Related artifacts: ${note.relatedArtifacts ?? "N/A"}\n- Decision required by: ${note.dueDate ?? "N/A"}\n\n### Context\n\n${note.context}\n\n### Finding / Question\n\n${note.item}\n\n### Impact\n\n${note.impact ?? "Not stated."}\n\n### Response / Resolution\n\nPending.\n\n### Next action\n\n${note.nextAction ?? "Pending owner."}\n`;
    markdown += block;
    const { atomicWrite } = await import("./lib/project-state.mjs");
    await atomicWrite(notesPath, markdown);
    console.log(id);
  });
}

async function main() {
  if (command === "bootstrap") {
    const slug = option("--project");
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
    const slug = positional(0);
    await setActiveProject(repositoryRoot, slug);
    console.log(`Active project: ${slug}`);
    return;
  }
  if (command === "current" || command === "show") {
    const slug =
      command === "show" ? positional(0) ?? (await getActiveProject(repositoryRoot)) :
        await getActiveProject(repositoryRoot);
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
    const slug = option("--project") ?? (await getActiveProject(repositoryRoot));
    const root = projectRoot(repositoryRoot, slug);
    await withProjectLock(root, async () => {
      const state = await loadState(repositoryRoot, slug);
      const nextType = option("--type", state.projectType);
      if (!route.types.includes(nextType)) {
        throw new Error(`${routeName} is incompatible with ${nextType}`);
      }
      const previous = state.currentPhase;
      Object.assign(state, {
        projectType: nextType,
        entryRoute: routeName,
        deliveryTrack: route.track,
        currentPhase: route.phase,
        currentGate: option("--gate", route.gate),
        activeOwner: option("--owner", "KE Router"),
        lastHandoff: `${previous} -> ${route.phase}`,
        nextAction: option("--next-action", `Complete readiness check for ${route.label}`),
        nextOwner: option("--next-owner", "KE Router"),
      });
      await saveState(repositoryRoot, state);
    });
    console.log(`Transitioned ${slug} to ${route.label}`);
    return;
  }
  if (command === "note" && positional(0) === "add") {
    const slug = option("--project") ?? (await getActiveProject(repositoryRoot));
    const input = JSON.parse(await readFile(option("--from"), "utf8"));
    await appendNote(slug, input);
    return;
  }
  throw new Error(
    "Usage: ke-project <list|use|current|show|validate|transition|note add>",
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

