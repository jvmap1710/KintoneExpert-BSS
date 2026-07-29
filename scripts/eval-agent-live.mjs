import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const limitIndex = args.indexOf("--limit");
const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : Infinity;
const caseIndex = args.indexOf("--case");
const selectedIds =
  caseIndex >= 0 ? new Set(args[caseIndex + 1].split(",").map((id) => id.trim())) : null;
if (!args.includes("--confirm-live")) {
  throw new Error("Live Codex eval requires --confirm-live.");
}
const cases = JSON.parse(await readFile(path.join(root, "evals", "router-cases.json")));
const selected = cases
  .filter((item) => !selectedIds || selectedIds.has(item.id))
  .slice(0, limit);
if (!selected.length) throw new Error("No live eval cases matched the selection.");
await mkdir(path.join(root, ".tmp"), { recursive: true });
const runRoot = await mkdtemp(path.join(root, ".tmp", "agent-eval-"));

function runCodex(prompt, output) {
  const baseArgs = [
    "exec",
    "--ephemeral",
    "--sandbox",
    "read-only",
    "--output-schema",
    path.join(root, "evals", "router-result.schema.json"),
    "-o",
    output,
    "-",
  ];
  return new Promise((resolve, reject) => {
    const command = process.platform === "win32" ? process.env.ComSpec : "codex";
    const commandArgs =
      process.platform === "win32"
        ? ["/d", "/s", "/c", "codex", ...baseArgs]
        : baseArgs;
    const child = spawn(command, commandArgs, {
      cwd: root,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.stdin.end(prompt);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`codex exec failed (${code}): ${stderr}`)),
    );
  });
}

const results = [];
try {
  for (const item of selected) {
    const output = path.join(runRoot, `${item.id}.json`);
    const prompt = [
      "This is an automated, read-only KE Router simulation.",
      "Apply the repository's routing rules to the simulated first user message below.",
      "The wrapper is not an Expert Consultation request; classify only the simulated message.",
      "Do not call tools, inspect project files, create a workspace, or perform the requested work.",
      "Return only the structured routing decision required by the output schema.",
      `SIMULATED FIRST USER MESSAGE:\n${item.prompt}`,
    ].join("\n\n");
    try {
      await runCodex(prompt, output);
      const actual = JSON.parse(await readFile(output, "utf8"));
      const mismatches = [
        "entryRoute",
        "projectType",
        "firstRole",
        "workspaceAction",
      ].filter((field) => actual[field] !== item[field]);
      const status = mismatches.length ? "FAIL" : "PASS";
      results.push({
        id: item.id,
        status,
        expected: {
          entryRoute: item.entryRoute,
          projectType: item.projectType,
          firstRole: item.firstRole,
          workspaceAction: item.workspaceAction,
        },
        actual,
        mismatches,
      });
      console.log(`${status.padEnd(5)} ${item.id}`);
    } catch (error) {
      results.push({ id: item.id, status: "ERROR", error: error.message });
      console.log(`ERROR ${item.id}`);
    }
  }
  const reportRoot = path.join(root, ".codex", "ke-eval-results");
  await mkdir(reportRoot, { recursive: true });
  const reportPath = path.join(
    reportRoot,
    `${new Date().toISOString().replace(/[:.]/gu, "-")}.json`,
  );
  const passed = results.filter((item) => item.status === "PASS").length;
  await writeFile(
    reportPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        passed,
        total: selected.length,
        results,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log(`Live agent eval: ${passed}/${selected.length} passed.`);
  console.log(`Report: ${reportPath}`);
  if (passed !== selected.length) process.exitCode = 1;
} finally {
  await rm(runRoot, { recursive: true, force: true });
}
