import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cases = JSON.parse(await readFile(path.join(root, "evals", "router-cases.json")));
const ids = new Set();
const routes = new Set();
for (const item of cases) {
  assert(item.id && !ids.has(item.id), `Duplicate/missing eval ID: ${item.id}`);
  ids.add(item.id);
  assert(item.prompt?.trim(), `${item.id}: prompt is empty`);
  assert(item.entryRoute, `${item.id}: route is missing`);
  assert(item.projectType, `${item.id}: project type is missing`);
  assert(item.firstRole, `${item.id}: first role is missing`);
  assert(item.workspaceAction, `${item.id}: workspace action is missing`);
  routes.add(item.entryRoute);
}
for (const route of [
  "menu",
  "discovery-intake",
  "customer-context",
  "current-state",
  "future-state",
  "demo-fast-track",
  "project-delivery",
  "existing-solution",
  "expert-consultation",
]) {
  assert(routes.has(route), `Eval corpus does not cover ${route}`);
}
console.log(`Router contract eval corpus passed (${cases.length} cases, all routes covered).`);

