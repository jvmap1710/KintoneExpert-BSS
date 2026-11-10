import { spawn } from "node:child_process";
import { lstat, mkdir, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateProject } from "../../../scripts/lib/project-state.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const safeIdentityPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u;

function samePath(left, right) {
  const a = path.resolve(left);
  const b = path.resolve(right);
  return process.platform === "win32"
    ? a.toLowerCase() === b.toLowerCase()
    : a === b;
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

async function requireCanonicalDirectory(target, description) {
  const info = await lstat(target).catch(() => null);
  if (!info?.isDirectory() || info.isSymbolicLink()) {
    throw new Error(`${description} must be an existing non-symlink directory.`);
  }
  const canonical = await realpath(target);
  if (!samePath(canonical, target)) {
    throw new Error(`${description} must resolve to its canonical path.`);
  }
  return canonical;
}

async function ensurePrivateSubdirectory(privateRoot, segments, description) {
  let current = privateRoot;
  for (const segment of segments) {
    const next = path.join(current, segment);
    let info = await lstat(next).catch(() => null);
    if (!info) {
      await mkdir(next);
      info = await lstat(next);
    }
    if (!info.isDirectory() || info.isSymbolicLink()) {
      throw new Error(`${description} must not use symlinks or non-directory paths.`);
    }
    const canonical = await realpath(next);
    if (!samePath(canonical, next) || !isWithin(privateRoot, canonical)) {
      throw new Error(`${description} resolves outside project private/.`);
    }
    current = canonical;
  }
  return current;
}

export function getBrowserBinding(env = process.env) {
  const projectSlug = env.KE_PROJECT_SLUG;
  const identity = env.KE_BROWSER_IDENTITY;
  if (!projectSlug || !identity) {
    throw new Error(
      "Playwright browser needs an explicit project/role binding: set KE_PROJECT_SLUG and KE_BROWSER_IDENTITY, then restart the browser MCP session. Greetings and chat-only onboarding do not need browser login or this binding.",
    );
  }
  if (!safeIdentityPattern.test(projectSlug)) {
    throw new Error("KE_PROJECT_SLUG must be a lowercase project slug.");
  }
  if (!safeIdentityPattern.test(identity)) {
    throw new Error("KE_BROWSER_IDENTITY must be a lowercase role/profile identity.");
  }
  return { projectSlug, identity };
}

export async function resolveBrowserPaths({
  repositoryRoot: root = repositoryRoot,
  projectSlug,
  identity,
} = {}) {
  if (!safeIdentityPattern.test(projectSlug ?? "")) {
    throw new Error("A valid explicit project slug is required.");
  }
  if (!safeIdentityPattern.test(identity ?? "")) {
    throw new Error("A valid explicit role/profile identity is required.");
  }

  const canonicalRepositoryRoot = await realpath(root);
  const projectsPath = path.join(canonicalRepositoryRoot, "projects");
  const canonicalProjectsPath = await requireCanonicalDirectory(projectsPath, "projects/");
  const projectPath = path.join(canonicalProjectsPath, projectSlug);
  const canonicalProjectPath = await requireCanonicalDirectory(
    projectPath,
    `Project ${projectSlug}`,
  );
  if (
    !samePath(path.dirname(canonicalProjectPath), canonicalProjectsPath) ||
    path.basename(canonicalProjectPath) !== projectSlug
  ) {
    throw new Error("Project path does not match KE_PROJECT_SLUG.");
  }
  const errors = await validateProject(canonicalRepositoryRoot, projectSlug);
  if (errors.length) {
    throw new Error(`Project ${projectSlug} is not valid: ${errors.join("; ")}`);
  }

  const privateRoot = await requireCanonicalDirectory(
    path.join(canonicalProjectPath, "private"),
    "Project private/",
  );
  if (!isWithin(canonicalProjectPath, privateRoot)) {
    throw new Error("Project private/ resolves outside the validated project.");
  }
  const profileDirectory = await ensurePrivateSubdirectory(
    privateRoot,
    ["browser-profiles", identity],
    "Browser profile path",
  );
  const evidenceDirectory = await ensurePrivateSubdirectory(
    privateRoot,
    ["browser-evidence", identity],
    "Browser evidence path",
  );
  return {
    projectSlug,
    identity,
    profileDirectory,
    evidenceDirectory,
  };
}

export function buildPlaywrightArgs(paths) {
  return [
    "--browser",
    "chrome",
    "--output-mode",
    "file",
    "--output-dir",
    paths.evidenceDirectory,
    "--user-data-dir",
    paths.profileDirectory,
  ];
}

async function main() {
  const binding = getBrowserBinding();
  const paths = await resolveBrowserPaths(binding);
  console.error(
    `Playwright profile bound to project ${paths.projectSlug}, role/profile ${paths.identity}. This local label does not verify the signed-in Kintone user or enforce read-only access; use the approved least-privilege account.`,
  );
  const cliPath = path.join(
    packageRoot,
    "node_modules",
    "@playwright",
    "mcp",
    "cli.js",
  );
  const child = spawn(process.execPath, [cliPath, ...buildPlaywrightArgs(paths)], {
    cwd: repositoryRoot,
    env: process.env,
    stdio: "inherit",
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => child.kill(signal));
  }
  child.on("error", (error) => {
    console.error(`Unable to start the bound Playwright MCP server: ${error.message}`);
    process.exitCode = 1;
  });
  child.on("close", (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
