#!/usr/bin/env node

import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalProjectRoot,
  validateProjectStateData,
} from "./lib/project-state.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(args) {
  const options = { dryRun: false, confirmLive: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--confirm-live") options.confirmLive = true;
    else if (arg === "--plan") {
      if (options.planPath || !args[index + 1] || args[index + 1].startsWith("--")) {
        throw new Error("--plan requires one file path.");
      }
      options.planPath = args[++index];
    } else {
      throw new Error(`Unsupported option: ${arg}`);
    }
  }
  if (!options.planPath) throw new Error("Usage: run-live-e2e.mjs --plan <file> --dry-run");
  if (options.dryRun && options.confirmLive) {
    throw new Error("Choose either --dry-run or --confirm-live, not both.");
  }
  return options;
}

function validatePlan(plan) {
  const errors = [];
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    return ["plan must be a JSON object"];
  }
  const allowedKeys = new Set([
    "schemaVersion",
    "environment",
    "projectSlug",
    "baseUrl",
    "appId",
    "guestSpaceId",
    "allowSyntheticWrites",
    "retainSyntheticRecords",
    "cases",
  ]);
  for (const key of Object.keys(plan)) {
    if (!allowedKeys.has(key)) errors.push(`unsupported plan property: ${key}`);
  }
  if (plan.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!["test", "demo"].includes(plan.environment)) {
    errors.push("environment must be test or demo");
  }
  if (
    typeof plan.projectSlug !== "string" ||
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(plan.projectSlug) ||
    plan.projectSlug === "_template"
  ) {
    errors.push("projectSlug must be a canonical existing project slug");
  }
  try {
    const url = new URL(plan.baseUrl);
    if (
      url.protocol !== "https:" ||
      url.origin !== plan.baseUrl ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      errors.push("baseUrl must be a canonical HTTPS origin without credentials or path");
    }
  } catch {
    errors.push("baseUrl must be a canonical HTTPS origin without credentials or path");
  }
  if (!Number.isSafeInteger(plan.appId) || plan.appId <= 0) {
    errors.push("appId must be a positive safe integer");
  }
  if (
    plan.guestSpaceId !== undefined &&
    (!Number.isSafeInteger(plan.guestSpaceId) || plan.guestSpaceId <= 0)
  ) {
    errors.push("guestSpaceId must be a positive safe integer when provided");
  }
  if (typeof plan.allowSyntheticWrites !== "boolean") {
    errors.push("allowSyntheticWrites must be a JSON boolean");
  }
  if (typeof plan.retainSyntheticRecords !== "boolean") {
    errors.push("retainSyntheticRecords must be a JSON boolean");
  }
  if (!Array.isArray(plan.cases) || plan.cases.length === 0 || plan.cases.length > 100) {
    errors.push("cases must contain between 1 and 100 items");
  } else {
    const ids = new Set();
    for (const [index, item] of plan.cases.entries()) {
      const label = `cases[${index}]`;
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        errors.push(`${label} must be an object`);
        continue;
      }
      for (const key of Object.keys(item)) {
        if (!["id", "title", "steps", "expected", "evidence"].includes(key)) {
          errors.push(`${label} has unsupported property: ${key}`);
        }
      }
      if (typeof item.id !== "string" || !/^[A-Z][A-Z0-9_-]{0,63}$/u.test(item.id)) {
        errors.push(`${label}.id must be a stable uppercase case ID`);
      } else if (ids.has(item.id)) {
        errors.push(`${label}.id must be unique`);
      } else {
        ids.add(item.id);
      }
      if (typeof item.title !== "string" || !item.title.trim()) {
        errors.push(`${label}.title is required`);
      }
      if (
        !Array.isArray(item.steps) ||
        item.steps.length === 0 ||
        !item.steps.every((step) => typeof step === "string" && step.trim())
      ) {
        errors.push(`${label}.steps must contain non-empty strings`);
      }
      if (typeof item.expected !== "string" || !item.expected.trim()) {
        errors.push(`${label}.expected is required`);
      }
      if (
        !Array.isArray(item.evidence) ||
        !item.evidence.length ||
        !item.evidence.every((evidence) => typeof evidence === "string" && evidence.trim())
      ) {
        errors.push(`${label}.evidence must contain non-empty strings`);
      }
    }
  }
  return errors;
}

function samePath(left, right) {
  const a = path.resolve(left);
  const b = path.resolve(right);
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

async function readProjectFile(projectPath, name) {
  const filePath = path.join(projectPath, name);
  const info = await lstat(filePath).catch(() => null);
  if (!info?.isFile() || info.isSymbolicLink()) {
    throw new Error(`Project ${name} must be an existing regular file.`);
  }
  const canonicalPath = await realpath(filePath);
  if (!samePath(filePath, canonicalPath)) {
    throw new Error(`Project ${name} must resolve to its canonical path.`);
  }
  return readFile(canonicalPath, "utf8");
}

async function validateExistingProject(root, slug) {
  let projectPath;
  try {
    projectPath = await canonicalProjectRoot(root, slug);
  } catch {
    return ["projectSlug must identify an existing canonical project workspace"];
  }
  const journalInfo = await lstat(path.join(projectPath, ".ke-project.journal.json")).catch(() => null);
  if (journalInfo) return ["project has an unfinished state transaction; resolve it before preflight"];
  let state;
  let markdown;
  try {
    state = JSON.parse(await readProjectFile(projectPath, ".ke-project.json"));
    markdown = await readProjectFile(projectPath, "PROJECT.md");
  } catch {
    return ["project must have readable, canonical .ke-project.json and PROJECT.md files"];
  }
  const errors = validateProjectStateData(state, slug);
  if (errors.length) return ["project state is invalid; validate the named workspace before preflight"];
  const expectedRows = [
    ["Workspace schema", String(state.schemaVersion)],
    ["Current phase", state.currentPhase],
    ["Current gate", state.currentGate],
  ];
  for (const [property, value] of expectedRows) {
    if (!markdown.includes(`| ${property} | ${value.replaceAll("|", "\\|").replace(/[\r\n]/gu, " ")} |`)) {
      return ["PROJECT.md must match the validated machine-owned project state"];
    }
  }
  return [];
}

export async function validateLivePlan(plan, root = repositoryRoot) {
  const errors = validatePlan(plan);
  if (errors.length) return errors;
  return validateExistingProject(root, plan.projectSlug);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let plan;
  try {
    plan = JSON.parse(await readFile(path.resolve(options.planPath), "utf8"));
  } catch {
    throw new Error("Unable to read a valid JSON E2E plan.");
  }
  const errors = await validateLivePlan(plan);
  if (errors.length) throw new Error(`E2E plan rejected:\n- ${errors.join("\n- ")}`);

  if (!options.dryRun) {
    throw new Error(
      "Live E2E execution is disabled: this runner cannot enforce the approved Kintone app, user, and per-action write boundary. Use --dry-run for offline validation, or run live checks in a supervised Codex chat with approved MCP/Playwright access and the normal write/deploy gates.",
    );
  }

  console.log(JSON.stringify({
    status: "PLAN_VALIDATION_PASS",
    execution: "NOT_RUN",
    project: plan.projectSlug,
    environment: plan.environment,
    appId: plan.appId,
    guestSpaceId: plan.guestSpaceId ?? null,
    cases: plan.cases.map(({ id }) => id),
    requestedSyntheticWrites: plan.allowSyntheticWrites,
    writesPerformed: false,
    tenantContacted: false,
    note: "Plan flags are descriptive only; validation is not user approval or authorization.",
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
