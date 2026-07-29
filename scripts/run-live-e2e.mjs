#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { projectRoot } from "./lib/project-state.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function option(name) {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1] || args[index + 1].startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return args[index + 1];
}

function validatePlan(plan) {
  const failures = [];
  if (plan.schemaVersion !== 1) failures.push("schemaVersion must be 1");
  if (!["test", "demo"].includes(plan.environment)) {
    failures.push("environment must be test or demo; production is refused");
  }
  if (!plan.projectSlug) failures.push("projectSlug is required");
  if (!/^https:\/\/[^/]+$/u.test(plan.baseUrl ?? "")) {
    failures.push("baseUrl must be an HTTPS tenant origin without a path");
  }
  if (!Number.isInteger(plan.appId) || plan.appId <= 0) {
    failures.push("appId must be a positive integer");
  }
  if (!Array.isArray(plan.cases) || plan.cases.length === 0) {
    failures.push("at least one E2E case is required");
  }
  const ids = new Set();
  for (const item of plan.cases ?? []) {
    if (!item.id || ids.has(item.id)) failures.push("case IDs must be unique");
    ids.add(item.id);
    if (!item.title || !Array.isArray(item.steps) || !item.expected) {
      failures.push(`${item.id ?? "unknown"}: title, steps, and expected are required`);
    }
  }
  return failures;
}

function runCodex(prompt, outputPath) {
  const codexArgs = [
    "exec",
    "--sandbox",
    "workspace-write",
    "--output-schema",
    path.join(root, "e2e", "live-result.schema.json"),
    "-o",
    outputPath,
    "-",
  ];
  return new Promise((resolve, reject) => {
    const command = process.platform === "win32" ? process.env.ComSpec : "codex";
    const commandArgs =
      process.platform === "win32"
        ? ["/d", "/s", "/c", "codex", ...codexArgs]
        : codexArgs;
    const child = spawn(command, commandArgs, {
      cwd: root,
      stdio: ["pipe", "inherit", "inherit"],
      windowsHide: true,
    });
    child.on("error", reject);
    child.stdin.end(prompt);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`codex exec exited with code ${code}`)),
    );
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderHtml(plan, result, generatedAt) {
  const rows = result.cases
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.id)}</td><td>${escapeHtml(item.status)}</td>` +
        `<td>${escapeHtml(item.actual)}</td><td>${item.evidence
          .map(escapeHtml)
          .join("<br>")}</td></tr>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>KE Live E2E Report</title>
<style>body{font:16px system-ui;max-width:1100px;margin:40px auto;padding:0 20px;color:#17202a}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccd1d1;padding:10px;text-align:left;vertical-align:top}
th{background:#eef2f3}.meta{display:grid;grid-template-columns:180px 1fr;gap:6px}</style></head>
<body><h1>KE Kintone / Playwright E2E Report</h1>
<div class="meta"><strong>Project</strong><span>${escapeHtml(plan.projectSlug)}</span>
<strong>Environment</strong><span>${escapeHtml(plan.environment)}</span>
<strong>App</strong><span>${escapeHtml(plan.appId)}</span>
<strong>Generated</strong><span>${escapeHtml(generatedAt)}</span>
<strong>Overall</strong><span>${escapeHtml(result.status)}</span></div>
<h2>Summary</h2><p>${escapeHtml(result.summary)}</p>
<h2>Cases</h2><table><thead><tr><th>ID</th><th>Status</th><th>Actual</th><th>Evidence</th></tr></thead>
<tbody>${rows}</tbody></table>
<h2>Limitations</h2><ul>${result.limitations
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul></body></html>`;
}

const planPath = path.resolve(option("--plan"));
const plan = JSON.parse(await readFile(planPath, "utf8"));
const failures = validatePlan(plan);
if (failures.length) throw new Error(`Invalid E2E plan:\n- ${failures.join("\n- ")}`);

if (args.includes("--dry-run")) {
  console.log(
    JSON.stringify(
      {
        status: "PREFLIGHT_PASS",
        plan: planPath,
        environment: plan.environment,
        cases: plan.cases.length,
        writes: Boolean(plan.allowSyntheticWrites),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
if (!args.includes("--confirm-live")) {
  throw new Error("Live E2E requires --confirm-live after reviewing the named test/demo App.");
}

const project = projectRoot(root, plan.projectSlug);
const runId = new Date().toISOString().replace(/[:.]/gu, "-");
const runRoot = path.join(project, "private", "e2e-runs", runId);
await mkdir(runRoot, { recursive: true });
const resultPath = path.join(runRoot, "result.json");
const prompt = [
  "Run the attached KE Kintone/Playwright E2E plan.",
  "Use Kintone MCP for configuration/data read-back and Playwright MCP for browser behavior and sanitized screenshots.",
  "Use Chrome DevTools MCP only if Playwright reproduces a JavaScript/network/DOM issue requiring deeper diagnosis.",
  "Never deploy, modify app settings, delete data, or broaden scope.",
  plan.allowSyntheticWrites
    ? "Synthetic test-record writes are authorized only for the listed cases. Use clearly synthetic values."
    : "Do not create or modify any records; read-only evidence only.",
  plan.retainSyntheticRecords
    ? "Retain synthetic records and list their IDs in evidence."
    : "Do not promise deletion. If writes are authorized, leave record disposition explicit in limitations.",
  "Do not claim PASS for a browser behavior without Playwright evidence. Return only the requested structured result.",
  `PLAN:\n${JSON.stringify(plan, null, 2)}`,
].join("\n\n");
await runCodex(prompt, resultPath);
const result = JSON.parse(await readFile(resultPath, "utf8"));
const generatedAt = new Date().toISOString();
await writeFile(
  path.join(runRoot, "report.html"),
  renderHtml(plan, result, generatedAt),
  "utf8",
);
console.log(`E2E result: ${result.status}`);
console.log(`Report: ${path.join(runRoot, "report.html")}`);
if (result.status !== "PASS") process.exitCode = 1;
