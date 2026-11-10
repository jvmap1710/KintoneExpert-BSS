#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import {
  access,
  cp,
  lstat,
  mkdtemp,
  mkdir,
  readdir,
  realpath,
  readFile,
  rename,
  rm,
  rmdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { gunzipSync } from "node:zlib";

const packageName = "__KE_PACKAGE_NAME__";
const packageVersion = "__KE_PACKAGE_VERSION__";
const embeddedPayload = "__KE_PAYLOAD_BASE64__";
const args = process.argv.slice(2);

if (embeddedPayload.startsWith("__KE_")) {
  throw new Error("This is the CLI source template. Run `npm run build` first.");
}

const payloadFiles = JSON.parse(
  gunzipSync(Buffer.from(embeddedPayload, "base64")).toString("utf8"),
).map((file) => ({
  ...file,
  content: Buffer.from(file.content, "base64"),
}));

const manifestSchemaVersion = 2;
const knownManifestSchemaVersions = new Set([1, manifestSchemaVersion]);
const currentProjectSchemaVersion = Number(
  payloadFiles
    .find((file) => file.path === "scripts/lib/project-state.mjs")
    ?.content.toString("utf8")
    .match(/export const PROJECT_SCHEMA_VERSION = (\d+);/u)?.[1],
);

function usage() {
  console.log(`
Kintone Expert BSS installer

Usage:
  npx kintone-expert-bss install [options]
  npx kintone-expert-bss upgrade [options]

Options:
  --directory <path>  Install into this project (default: current directory)
  --yes               Accept defaults and skip confirmation
  --chat-language <language>
                      Preferred chat language (default: English)
  --document-languages <languages>
                      Output languages separated by comma (default: English)
  --skip-deps         Do not install Kintone, browser, or Office dependencies
  --force             Overwrite conflicting KE-managed files
  --dry-run           Show an upgrade plan without changing files
  --help              Show this help
  --version           Show the package version
`);
}

function optionValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

async function exists(target) {
  try {
    await access(target, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(target) {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

async function assertNoSymlinkDescendants(target, relativePaths) {
  try {
    const rootInfo = await lstat(target);
    if (rootInfo.isSymbolicLink()) throw new Error(`Refusing install target through a symlink or junction: ${target}`);
    if (!rootInfo.isDirectory()) throw new Error(`Install target is not a directory: ${target}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  for (const relative of new Set(relativePaths)) {
    let current = target;
    for (const segment of safeRelative(relative).split(path.sep)) {
      current = path.join(current, segment);
      let info;
      try {
        info = await lstat(current);
      } catch (error) {
        if (error.code === "ENOENT") break;
        throw new Error(`Cannot safely inspect ${current}: ${error.message}`);
      }
      if (info.isSymbolicLink()) {
        throw new Error(`Refusing installer path through a symlink or junction: ${path.relative(target, current)}`);
      }
    }
  }
}

async function digest(target) {
  return createHash("sha256").update(await readFile(target)).digest("hex");
}

function digestContent(content) {
  return createHash("sha256").update(content).digest("hex");
}

function normalizeLanguage(value, fallback = "English") {
  const normalized = value?.trim().replace(/[\r\n]+/gu, " ");
  return normalized || fallback;
}

function parseDocumentLanguages(value) {
  const languages = (value ?? "English")
    .split(",")
    .map((language) => normalizeLanguage(language, ""))
    .filter(Boolean);
  return [...new Set(languages.length ? languages : ["English"])];
}

function tomlString(value) {
  return `"${value
    .replaceAll("\\", "\\\\")
    .replaceAll("\"", "\\\"")
    .replaceAll("\t", "\\t")}"`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function managedBlock(sourceContent, label) {
  const begin = `# >>> KE KIT: ${label} >>>`;
  const end = `# <<< KE KIT: ${label} <<<`;
  return `${begin}\n${sourceContent.toString("utf8").trim()}\n${end}`;
}

function mergeManagedContent(current, sourceContent, label) {
  const begin = `# >>> KE KIT: ${label} >>>`;
  const end = `# <<< KE KIT: ${label} <<<`;
  const beginMatches = [...current.matchAll(new RegExp(escapeRegExp(begin), "gu"))];
  const endMatches = [...current.matchAll(new RegExp(escapeRegExp(end), "gu"))];
  if (beginMatches.length !== endMatches.length || beginMatches.length > 1) {
    throw new Error(`Malformed or duplicate KE managed markers for ${label}.`);
  }

  const managed = managedBlock(sourceContent, label);
  if (!beginMatches.length) {
    const prefix = current
      ? `${current}${current.endsWith("\n") ? "" : "\n"}\n`
      : "";
    return `${prefix}${managed}\n`;
  }

  const start = beginMatches[0].index;
  const finish = endMatches[0].index;
  if (finish < start || finish + end.length < start) {
    throw new Error(`Malformed KE managed marker order for ${label}.`);
  }
  const after = finish + end.length;
  const result = `${current.slice(0, start)}${managed}${current.slice(after)}`;
  return result.endsWith("\n") ? result : `${result}\n`;
}

function uncommentTomlLine(line) {
  let quote;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (escaped) {
      escaped = false;
    } else if (character === "\\" && quote === '"') {
      escaped = true;
    } else if (quote && character === quote) {
      quote = undefined;
    } else if (!quote && (character === '"' || character === "'")) {
      quote = character;
    } else if (!quote && character === "#") {
      return line.slice(0, index);
    }
  }
  return line;
}

function stripTomlLineForHeaders(line, state) {
  let output = "";
  let quote;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (state.multiline) {
      const delimiter = state.multiline === "basic" ? '"""' : "'''";
      if (line.startsWith(delimiter, index)) {
        if (state.multiline === "literal" || !isEscaped(line, index)) {
          state.multiline = undefined;
          index += 2;
        }
      }
      continue;
    }
    if (escaped) {
      escaped = false;
      output += character;
    } else if (character === "\\" && quote === '"') {
      escaped = true;
      output += character;
    } else if (quote && character === quote) {
      quote = undefined;
      output += character;
    } else if (quote) {
      output += character;
    } else if ((character === '"' && line.startsWith('"""', index)) ||
        (character === "'" && line.startsWith("'''", index))) {
      state.multiline = character === '"' ? "basic" : "literal";
      index += 2;
    } else if (character === '"' || character === "'") {
      quote = character;
      output += character;
    } else if (character === "#") {
      break;
    } else {
      output += character;
    }
  }
  return output;
}

function isEscaped(line, index) {
  let backslashes = 0;
  for (let cursor = index - 1; cursor >= 0 && line[cursor] === "\\"; cursor -= 1) backslashes += 1;
  return backslashes % 2 === 1;
}

function tomlKeyPath(raw) {
  const parts = [];
  let part = "";
  let quote;
  let escaped = false;
  for (const character of raw.trim()) {
    if (escaped) {
      part += character;
      escaped = false;
    } else if (character === "\\" && quote === '"') {
      part += character;
      escaped = true;
    } else if (quote && character === quote) {
      part += character;
      quote = undefined;
    } else if (!quote && (character === '"' || character === "'")) {
      part += character;
      quote = character;
    } else if (!quote && character === ".") {
      parts.push(part.trim());
      part = "";
    } else {
      part += character;
    }
  }
  parts.push(part.trim());
  return parts.map((item) => {
    if (item.startsWith('"') && item.endsWith('"')) {
      try { return JSON.parse(item); } catch { return item; }
    }
    if (item.startsWith("'") && item.endsWith("'")) return item.slice(1, -1);
    return item;
  }).join(".");
}

function inspectKeTables(content) {
  const ownedNames = [
    "mcp_servers.kintone",
    "mcp_servers.playwright",
    "mcp_servers.chrome-devtools",
    "skills.config",
  ];
  const entries = [];
  let current;
  const tomlState = { multiline: undefined };
  for (const [index, originalLine] of content.split(/\r?\n/u).entries()) {
    const line = stripTomlLineForHeaders(originalLine, tomlState).trim();
    const header = line.match(/^(\[\[?)(.+?)(\]\]?)\s*$/u);
    if (header) {
      const array = header[1] === "[[" && header[3] === "]]";
      const plain = header[1] === "[" && header[3] === "]";
      if (!array && !plain) continue;
      const name = tomlKeyPath(header[2]);
      current = { name, array, line: index + 1, skillPath: undefined };
      if (ownedNames.some((owned) => owned === name || owned.startsWith(`${name}.`) || name.startsWith(`${owned}.`))) {
        entries.push(current);
      }
      continue;
    }
    if (current?.name === "skills.config" && current.array) {
      const assignment = line.match(/^path\s*=\s*(["'])(.*?)\1\s*$/u);
      if (assignment) current.skillPath = assignment[2];
    }
  }
  return entries;
}

function validateTomlCollisions(unmanagedContent, managedContent) {
  const managed = inspectKeTables(managedContent);
  const unmanaged = inspectKeTables(unmanagedContent);
  const keSkillPaths = new Set(managed.map((entry) => entry.skillPath).filter(Boolean));
  const seenOwnedHeaders = new Set();
  for (const entry of unmanaged) {
    const ownedHeader = entry.name.startsWith("mcp_servers.") || entry.name === "skills.config";
    if (!ownedHeader) continue;
    const key = `${entry.name}:${entry.array ? "array" : "table"}`;
    if (seenOwnedHeaders.has(key) && entry.name !== "skills.config") {
      throw new Error(`Duplicate KE TOML section ${entry.name} at line ${entry.line}.`);
    }
    seenOwnedHeaders.add(key);
    if (managed.some((candidate) => candidate.name === entry.name && candidate.array === entry.array)) {
      if (entry.name === "skills.config" && entry.array && !keSkillPaths.has(entry.skillPath)) continue;
      throw new Error(`Existing TOML section ${entry.name} collides with KE-managed configuration.`);
    }
    if (managed.some((candidate) => candidate.name === entry.name && candidate.array !== entry.array)) {
      throw new Error(`Existing TOML table/array collision for ${entry.name}.`);
    }
    if (managed.some((candidate) => candidate.name.startsWith(`${entry.name}.`) || entry.name.startsWith(`${candidate.name}.`))) {
      throw new Error(`Existing TOML dotted-table collision for ${entry.name}.`);
    }
    if (entry.name === "skills.config" && entry.array && keSkillPaths.has(entry.skillPath)) {
      throw new Error(`Existing KE skill registration collides at ${entry.skillPath}.`);
    }
  }
}

function replacePreferenceLine(line, key, value) {
  const match = line.match(/^(\s*)(chat_language|document_languages)(\s*=\s*)(.*)$/u);
  if (!match || match[2] !== key) return line;
  const uncommented = uncommentTomlLine(match[4]);
  const valueEnd = uncommented.length;
  const comment = match[4].slice(valueEnd);
  return `${match[1]}${key}${match[3]}${value}${comment}`;
}

function updatePreferences(current, { chatLanguage, documentLanguages }) {
  const content = current ??
    "# Local KE preferences. Generated by the installer and ignored by Git.\n";
  const lines = content.split(/\r?\n/u);
  const locations = new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^\s*(chat_language|document_languages)\s*=/u);
    if (!match) continue;
    const list = locations.get(match[1]) ?? [];
    list.push(index);
    locations.set(match[1], list);
  }
  for (const [key, indices] of locations) {
    if (indices.length > 1) throw new Error(`Duplicate ${key} in .codex/ke-preferences.toml.`);
  }

  const updates = {
    chat_language: chatLanguage === undefined ? undefined : tomlString(chatLanguage),
    document_languages:
      documentLanguages === undefined
        ? undefined
        : `[${documentLanguages.map(tomlString).join(", ")}]`,
  };
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    const index = locations.get(key)?.[0];
    if (index === undefined) lines.push(`${key} = ${value}`);
    else lines[index] = replacePreferenceLine(lines[index], key, value);
  }
  const result = lines.join("\n");
  return result.endsWith("\n") ? result : `${result}\n`;
}

function run(command, commandArgs, cwd, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd,
      env: options.env ?? process.env,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    if (options.capture) {
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => (stdout += chunk));
      child.stderr.on("data", (chunk) => (stderr += chunk));
    }
    child.on("error", reject);
    child.on("exit", (code) =>
      resolve({ code: code ?? 1, stdout, stderr }),
    );
  });
}

function safeRelative(relative) {
  if (typeof relative !== "string" || !relative || path.isAbsolute(relative)) {
    throw new Error(`Unsafe transaction path: ${relative}`);
  }
  const normalized = relative.replaceAll("\\", "/");
  if (normalized.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error(`Unsafe transaction path: ${relative}`);
  }
  return normalized.split("/").join(path.sep);
}

function slashPath(relative) {
  return safeRelative(relative).replaceAll("\\", "/");
}

function allowedMutationPath(relative) {
  const normalized = slashPath(relative);
  const payloadPaths = new Set(payloadFiles.map(payloadDestination).map(slashPath));
  if (payloadPaths.has(normalized)) return true;
  if ([
    ".codex/ke-kit-manifest.json",
    ".codex/ke-preferences.toml",
    ".codex/ke-last-migration.json",
    "platform/ke-kintone-mcp/.env",
  ].includes(normalized)) return true;
  return /^projects\/[^/]+\/(?:PROJECT\.md|\.ke-project\.json|TEAM-NOTES\.md|input|private|analysis|output|history)$/u.test(normalized);
}

function allowedCreatedDirectory(relative) {
  const normalized = slashPath(relative);
  if (allowedMutationPath(normalized)) return true;
  const managedFiles = [
    ...payloadFiles.map(payloadDestination).map(slashPath),
    ".codex/ke-kit-manifest.json",
    ".codex/ke-preferences.toml",
    ".codex/ke-last-migration.json",
    "platform/ke-kintone-mcp/.env",
  ];
  if (managedFiles.some((file) => file.startsWith(`${normalized}/`))) return true;
  if (["projects", "platform", "platform/ke-kintone-mcp", "platform/ke-browser-mcp", "platform/ke-office-cli"].includes(normalized)) return true;
  return /^projects\/[^/]+(?:\/(?:input|private|analysis|output|history))?$/u.test(normalized);
}

function validateTransactionJournal(journal) {
  if (!journal || typeof journal !== "object" || Array.isArray(journal) || journal.schemaVersion !== 1 || !Array.isArray(journal.fileSnapshots)) {
    throw new Error("Cannot recover: transaction journal is malformed or unsupported.");
  }
  if (!["in-progress", "committed"].includes(journal.state) || !["install", "upgrade"].includes(journal.action) ||
      typeof journal.targetExisted !== "boolean" || typeof journal.createdAt !== "string" || !Number.isFinite(Date.parse(journal.createdAt))) {
    throw new Error("Cannot recover: transaction journal metadata is malformed.");
  }
  const backupRoot = slashPath(journal.backupRoot);
  if (!/^\.codex\/ke-backups\/[^/]+$/u.test(backupRoot)) throw new Error("Cannot recover: backup path is outside the KE backup area.");
  const stagingRoot = slashPath(journal.stagingRoot);
  if (!/^\.codex\/\.ke-install-stage-[\da-f-]+$/iu.test(stagingRoot)) throw new Error("Cannot recover: staging path is outside the expected .codex area.");
  if (!Array.isArray(journal.createdDirectories ?? [])) throw new Error("Cannot recover: transaction directory list is malformed.");
  const seen = new Set();
  for (const snapshot of journal.fileSnapshots) {
    if (!snapshot || typeof snapshot !== "object" || typeof snapshot.hadOriginal !== "boolean") throw new Error("Cannot recover: transaction file snapshot is malformed.");
    const relative = slashPath(snapshot.relative);
    if (!allowedMutationPath(relative) || seen.has(relative)) throw new Error(`Cannot recover: transaction file path is not an allowed unique managed path: ${relative}`);
    seen.add(relative);
    if (snapshot.hadOriginal && slashPath(snapshot.backupRelative) !== `rollback/${relative}`) {
      throw new Error(`Cannot recover: backup mapping is invalid for ${relative}.`);
    }
    if (!snapshot.hadOriginal && snapshot.backupRelative !== undefined) {
      throw new Error(`Cannot recover: unexpected backup mapping for new file ${relative}.`);
    }
  }
  const allowedDependencies = new Set([
    "platform/ke-kintone-mcp",
    "platform/ke-browser-mcp",
    "platform/ke-office-cli",
  ]);
  if (!Array.isArray(journal.dependencies ?? [])) throw new Error("Cannot recover: dependency journal is malformed.");
  const seenDependencies = new Set();
  for (const dependency of journal.dependencies ?? []) {
    if (!dependency || typeof dependency !== "object" || typeof dependency.hadOriginal !== "boolean" ||
        (dependency.originalMoved !== undefined && typeof dependency.originalMoved !== "boolean") ||
        (dependency.newInstalled !== undefined && typeof dependency.newInstalled !== "boolean")) {
      throw new Error("Cannot recover: dependency journal entry is malformed.");
    }
    const relative = slashPath(dependency.relative);
    if (!allowedDependencies.has(relative) || typeof dependency.hadOriginal !== "boolean" ||
        slashPath(dependency.backupRelative) !== `dependencies/${relative}/node_modules` || seenDependencies.has(relative)) {
      throw new Error(`Cannot recover: dependency mapping is invalid for ${relative}.`);
    }
    seenDependencies.add(relative);
  }
  for (const directory of journal.createdDirectories ?? []) {
    if (!allowedCreatedDirectory(directory)) throw new Error(`Cannot recover: transaction directory is not an allowed managed path: ${directory}`);
  }
  return { backupRoot, stagingRoot };
}

function parseVersion(version) {
  if (typeof version !== "string") throw new Error("Manifest version is missing or malformed.");
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/u);
  if (!match) throw new Error(`Manifest version is malformed: ${version}`);
  return { numbers: match.slice(1, 4).map(Number), prerelease: match[4] };
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < 3; index += 1) {
    if (a.numbers[index] !== b.numbers[index]) return a.numbers[index] < b.numbers[index] ? -1 : 1;
  }
  if (a.prerelease === b.prerelease) return 0;
  if (a.prerelease === undefined) return 1;
  if (b.prerelease === undefined) return -1;
  return a.prerelease.localeCompare(b.prerelease);
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("Cannot upgrade: manifest must be a JSON object.");
  }
  const schemaVersion = manifest.schemaVersion ?? (Array.isArray(manifest.files) ? 1 : undefined);
  if (!knownManifestSchemaVersions.has(schemaVersion)) {
    throw new Error(`Cannot upgrade: manifest schema ${schemaVersion ?? "missing"} is unknown or newer than this Kit.`);
  }
  if (manifest.package !== packageName) throw new Error(`Cannot upgrade: manifest package is not ${packageName}.`);
  if (!Array.isArray(manifest.files) || manifest.files.some((file) => typeof file !== "string")) {
    throw new Error("Cannot upgrade: manifest files list is malformed.");
  }
  if (schemaVersion === manifestSchemaVersion && (!manifest.fileHashes || typeof manifest.fileHashes !== "object" || Array.isArray(manifest.fileHashes))) {
    throw new Error("Cannot upgrade: schema 2 manifest fileHashes is malformed.");
  }
  if (manifest.fileHashes) {
    for (const [key, hash] of Object.entries(manifest.fileHashes)) {
      safeRelative(key);
      if (typeof hash !== "string" || !/^[a-f0-9]{64}$/u.test(hash)) throw new Error(`Cannot upgrade: manifest hash for ${key} is malformed.`);
    }
  }
  parseVersion(manifest.version);
  return { ...manifest, schemaVersion };
}

function payloadDestination(file) {
  return file.path === "gitignore.template" ? ".gitignore" : safeRelative(file.path);
}

function platformConfigContent(content) {
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  return Buffer.from(content.toString("utf8").replace(/command = "npm(?:\.cmd)?"/gu, `command = "${command}"`), "utf8");
}

async function preflightProjectSchemas(target) {
  if (!Number.isInteger(currentProjectSchemaVersion) || currentProjectSchemaVersion < 2) {
    throw new Error("Embedded project-state schema is missing or invalid.");
  }
  const projectsPath = path.join(target, "projects");
  if (!(await isDirectory(projectsPath))) return;
  for (const entry of await readdir(projectsPath, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "_template") continue;
    const statePath = path.join(projectsPath, entry.name, ".ke-project.json");
    if (!(await exists(statePath))) continue;
    let state;
    try { state = JSON.parse(await readFile(statePath, "utf8")); }
    catch { throw new Error(`Cannot upgrade: ${entry.name}/.ke-project.json is malformed.`); }
    if (!Number.isInteger(state?.schemaVersion) || ![1, currentProjectSchemaVersion].includes(state.schemaVersion)) {
      throw new Error(`Cannot upgrade: ${entry.name} uses unknown project schema ${state?.schemaVersion ?? "missing"}.`);
    }
  }
}

async function stageEmbeddedMigration(target) {
  const migration = payloadFiles.find((file) => file.path === "scripts/migrate-projects.mjs");
  const stateLibrary = payloadFiles.filter((file) => file.path.startsWith("scripts/lib/"));
  if (!migration || !stateLibrary.some((file) => file.path === "scripts/lib/project-state.mjs")) {
    throw new Error("Cannot preflight upgrade: embedded migration or project-state library is missing.");
  }
  const root = await mkdtemp(path.join(tmpdir(), "ke-installer-migration-"));
  try {
    for (const file of [migration, ...stateLibrary, ...payloadFiles.filter((item) => item.path.startsWith("projects/_template/"))]) {
      const destination = path.join(root, safeRelative(file.path));
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, file.content);
    }
    const result = await run(process.execPath, [path.join(root, "scripts", "migrate-projects.mjs"), "--root", target, "--dry-run"], root, { capture: true });
    let report;
    try { report = JSON.parse(result.stdout); }
    catch { throw new Error(`Migration preflight returned invalid JSON${result.stderr.trim() ? `: ${result.stderr.trim()}` : "."}`); }
    const invalid = (report.results ?? []).filter((item) => item.status === "invalid");
    if (result.code !== 0 || invalid.length) {
      const details = invalid.flatMap((item) => item.errors ?? []).join("; ");
      throw new Error(`Migration preflight failed${details ? `: ${details}` : ` (exit ${result.code})`}.`);
    }
    return report;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function readUpgradeManifest(target, isUpgrade) {
  if (!isUpgrade) return undefined;
  const manifestPath = path.join(target, ".codex", "ke-kit-manifest.json");
  if (!(await exists(manifestPath))) throw new Error("Cannot upgrade: .codex/ke-kit-manifest.json is missing.");
  let manifest;
  try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); }
  catch { throw new Error("Cannot upgrade: .codex/ke-kit-manifest.json is malformed."); }
  const validated = validateManifest(manifest);
  if (compareVersions(packageVersion, validated.version) < 0) throw new Error(`Cannot downgrade KE Kit ${validated.version} to ${packageVersion}.`);
  return validated;
}

async function collectPreflight(target, isUpgrade, force) {
  const preflightPaths = [
    ...payloadFiles.map(payloadDestination),
    ".codex/ke-kit-manifest.json",
    ".codex/ke-install-transaction.json",
    ".codex/ke-preferences.toml",
    ".codex/ke-backups",
    "platform/ke-kintone-mcp/.env",
    "platform/ke-kintone-mcp/node_modules",
    "platform/ke-browser-mcp/node_modules",
    "platform/ke-office-cli/node_modules",
    "projects",
  ];
  await assertNoSymlinkDescendants(target, preflightPaths);
  if (await isDirectory(path.join(target, "projects"))) {
    const projectEntries = await readdir(path.join(target, "projects"), { withFileTypes: true });
    for (const entry of projectEntries) {
      if (entry.name === "_template") continue;
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const projectRelative = path.join("projects", safeRelative(entry.name));
      await assertNoSymlinkDescendants(target, [
        projectRelative,
        ...["PROJECT.md", ".ke-project.json", "TEAM-NOTES.md", "input", "private", "analysis", "output", "history"]
          .map((name) => path.join(projectRelative, name)),
      ]);
    }
  }
  const journalPath = path.join(target, ".codex", "ke-install-transaction.json");
  if (await exists(journalPath)) throw new Error("A prior install transaction needs recovery. Run `npx kintone-expert-bss recover --directory <path>` first.");
  const previousManifest = await readUpgradeManifest(target, isUpgrade);
  const mergedFiles = new Map();
  const managedDefinitions = [["AGENTS.md", "PROJECT INSTRUCTIONS"], ["gitignore.template", "GITIGNORE"], [".codex/config.toml", "CODEX CONFIG"]];
  for (const [payloadPath, label] of managedDefinitions) {
    const source = payloadFiles.find((file) => file.path === payloadPath);
    if (!source) throw new Error(`Embedded payload is missing ${payloadPath}.`);
    const content = payloadPath === ".codex/config.toml" ? platformConfigContent(source.content) : source.content;
    const relative = payloadDestination(source);
    const destination = path.join(target, relative);
    const current = await exists(destination) ? await readFile(destination, "utf8") : "";
    const merged = mergeManagedContent(current, content, label);
    if (payloadPath === ".codex/config.toml") {
      const begin = "# >>> KE KIT: CODEX CONFIG >>>";
      const end = "# <<< KE KIT: CODEX CONFIG <<<";
      const start = merged.indexOf(begin);
      const finish = merged.indexOf(end);
      validateTomlCollisions(`${merged.slice(0, start)}${merged.slice(finish + end.length)}`, content.toString("utf8"));
    }
    mergedFiles.set(payloadPath, { destination: relative, content, merged });
  }

  const conflicts = [];
  const mergePaths = new Set(managedDefinitions.map(([filePath]) => filePath));
  for (const file of payloadFiles) {
    if (mergePaths.has(file.path)) continue;
    const destination = path.join(target, payloadDestination(file));
    if (!(await exists(destination))) continue;
    if (isUpgrade) {
      const installedHash = previousManifest.fileHashes?.[file.path];
      if (previousManifest.fileHashes) {
        if (!installedHash || installedHash !== (await digest(destination))) conflicts.push(file.path);
      } else {
        const legacyManaged = new Set(previousManifest.files);
        const relative = payloadDestination(file);
        if (!legacyManaged.has(relative) && !legacyManaged.has(file.path)) conflicts.push(file.path);
      }
    } else if (digestContent(file.content) !== (await digest(destination))) conflicts.push(file.path);
  }
  if (conflicts.length && !force) {
    const shown = conflicts.slice(0, 20).join(", ");
    const rest = conflicts.length > 20 ? `, and ${conflicts.length - 20} more` : "";
    throw new Error(`${isUpgrade ? "Upgrade" : "Installation"} stopped to protect existing files: ${shown}${rest}. Re-run with --force only if KE should replace these managed files.`);
  }

  let migrationReport;
  if (isUpgrade) {
    await preflightProjectSchemas(target);
    if (await isDirectory(path.join(target, "projects"))) migrationReport = await stageEmbeddedMigration(target);
  }
  if (migrationReport) {
    const paths = migrationWritePaths(migrationReport);
    await assertNoSymlinkDescendants(target, [...paths.files, ...paths.directories]);
  }
  return { previousManifest, conflicts, mergedFiles, migrationReport };
}

function migrationWritePaths(report) {
  if (!report) return { files: [], directories: [] };
  const files = new Set([path.join(".codex", "ke-last-migration.json")]);
  const directories = new Set();
  for (const result of report?.results ?? []) {
    if (result.status !== "would-migrate") continue;
    const base = path.join("projects", safeRelative(result.slug));
    for (const name of ["PROJECT.md", ".ke-project.json", "TEAM-NOTES.md"]) files.add(path.join(base, name));
    for (const name of result.directories ?? []) directories.add(path.join(base, safeRelative(name)));
  }
  return { files: [...files], directories: [...directories] };
}

async function missingDirectories(target, filePaths, explicitDirectories) {
  const candidates = new Set();
  for (const relative of [...filePaths, ...explicitDirectories]) {
    let current = relative;
    while (current !== ".") {
      candidates.add(current);
      current = path.dirname(current);
    }
  }
  const missing = [];
  for (const relative of candidates) {
    if (!(await exists(path.join(target, relative)))) missing.push(relative);
  }
  return missing.sort((a, b) => a.split(path.sep).length - b.split(path.sep).length);
}

async function snapshotFiles(target, backupRoot, filePaths) {
  const snapshots = [];
  for (const relative of [...new Set(filePaths)]) {
    const safePath = safeRelative(relative);
    const source = path.join(target, safePath);
    const hadOriginal = await exists(source);
    if (hadOriginal) {
      if (!(await stat(source)).isFile()) throw new Error(`Expected a file but found another type: ${safePath}`);
      const backupRelative = path.join("rollback", safePath);
      const backup = path.join(backupRoot, backupRelative);
      await mkdir(path.dirname(backup), { recursive: true });
      await cp(source, backup);
      snapshots.push({ relative: safePath, hadOriginal: true, backupRelative });
    } else {
      snapshots.push({ relative: safePath, hadOriginal: false });
    }
  }
  return snapshots;
}

function transactionRelative(target, absolute) {
  return safeRelative(path.relative(target, absolute));
}

async function writeJournal(journalPath, journal) {
  await writeFile(journalPath, `${JSON.stringify(journal, null, 2)}\n`, "utf8");
}

function createBackupRoot(target, previousManifest) {
  const suffix = `${new Date().toISOString().replace(/[:.]/gu, "-")}-${randomUUID()}-from-${previousManifest?.version ?? "unversioned"}`;
  return path.join(target, ".codex", "ke-backups", suffix);
}

async function preserveCurrent(target, backupRoot, relative) {
  const source = path.join(target, relative);
  if (!(await exists(source)) || !(await stat(source)).isFile()) return;
  const destination = path.join(backupRoot, "failed-current", relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination);
}

async function restoreTransaction(target, journalPath, journal) {
  const { backupRoot } = await preflightTransactionRecovery(target, journal);
  const failures = [];
  for (const snapshot of [...journal.fileSnapshots].reverse()) {
    try {
      const relative = safeRelative(snapshot.relative);
      const destination = path.join(target, relative);
      if (snapshot.hadOriginal) {
        const backup = path.join(backupRoot, safeRelative(snapshot.backupRelative));
        await preserveCurrent(target, backupRoot, relative);
        await mkdir(path.dirname(destination), { recursive: true });
        await cp(backup, destination);
      } else if (await exists(destination)) {
        if (!(await stat(destination)).isFile()) throw new Error(`Not removing non-file ${relative}`);
        await preserveCurrent(target, backupRoot, relative);
        await rm(destination, { force: true });
      }
    } catch (error) {
      failures.push(`${snapshot.relative}: ${error.message}`);
    }
  }

  for (const item of [...(journal.dependencies ?? [])].reverse()) {
    try {
      const relative = safeRelative(path.join(item.relative, "node_modules"));
      const destination = path.join(target, relative);
      const failed = path.join(backupRoot, "failed-dependencies", relative);
      const original = item.hadOriginal
        ? path.join(backupRoot, safeRelative(item.backupRelative))
        : undefined;
      const hasSavedOriginal = original ? await exists(original) : false;
      if (await exists(destination) && (!item.hadOriginal || hasSavedOriginal)) {
        await mkdir(path.dirname(failed), { recursive: true });
        await rename(destination, failed);
      }
      if (item.hadOriginal && hasSavedOriginal) {
        await mkdir(path.dirname(destination), { recursive: true });
        await rename(original, destination);
      }
    } catch (error) {
      failures.push(`${item.relative}/node_modules: ${error.message}`);
    }
  }

  if (journal.stagingRoot) {
    try {
      const relative = safeRelative(journal.stagingRoot);
      if (!relative.startsWith(path.join(".codex", ".ke-install-stage-"))) throw new Error("staging path is outside the expected .codex area");
      await rm(path.join(target, relative), { recursive: true, force: true });
    } catch (error) {
      failures.push(`staging directory: ${error.message}`);
    }
  }
  for (const relative of [...(journal.createdDirectories ?? [])].reverse()) {
    try {
      await rmdir(path.join(target, safeRelative(relative)));
    } catch (error) {
      if (!new Set(["ENOENT", "ENOTEMPTY", "EEXIST"]).has(error.code)) failures.push(`${relative}: ${error.message}`);
    }
  }
  if (!failures.length) await rm(journalPath, { force: true });
  return failures;
}

async function preflightTransactionRecovery(target, journal, { requireBackups = true } = {}) {
  const { backupRoot: backupRootRelative, stagingRoot } = validateTransactionJournal(journal);
  const paths = [
    ".codex/ke-install-transaction.json",
    backupRootRelative,
    stagingRoot,
    ...journal.fileSnapshots.map((snapshot) => snapshot.relative),
    ...journal.fileSnapshots.filter((snapshot) => snapshot.hadOriginal)
      .map((snapshot) => path.join(backupRootRelative, snapshot.backupRelative)),
    ...journal.fileSnapshots.map((snapshot) => path.join(backupRootRelative, "failed-current", snapshot.relative)),
    ...(journal.dependencies ?? []).map((item) => path.join(item.relative, "node_modules")),
    ...(journal.dependencies ?? []).filter((item) => item.hadOriginal)
      .map((item) => path.join(backupRootRelative, item.backupRelative)),
    ...(journal.dependencies ?? []).map((item) => path.join(backupRootRelative, "failed-dependencies", item.relative, "node_modules")),
    ...(journal.createdDirectories ?? []),
  ];
  await assertNoSymlinkDescendants(target, paths);

  const backupRoot = path.join(target, backupRootRelative);
  if (requireBackups) {
    let backupRootInfo;
    try { backupRootInfo = await lstat(backupRoot); }
    catch (error) {
      if (error.code === "ENOENT") throw new Error("Cannot recover: transaction backup directory is missing.");
      throw error;
    }
    if (!backupRootInfo.isDirectory()) throw new Error("Cannot recover: transaction backup path is not a directory.");

    for (const snapshot of journal.fileSnapshots) {
      if (!snapshot.hadOriginal) continue;
      const backup = path.join(backupRoot, safeRelative(snapshot.backupRelative));
      let backupInfo;
      try { backupInfo = await lstat(backup); }
      catch (error) {
        if (error.code === "ENOENT") throw new Error(`Cannot recover: original backup is missing for ${snapshot.relative}.`);
        throw error;
      }
      if (!backupInfo.isFile()) throw new Error(`Cannot recover: original backup is not a file for ${snapshot.relative}.`);
    }

    for (const item of journal.dependencies ?? []) {
      if (!item.hadOriginal) continue;
      const backup = path.join(backupRoot, safeRelative(item.backupRelative));
      const destination = path.join(target, safeRelative(path.join(item.relative, "node_modules")));
      let backupInfo;
      try { backupInfo = await lstat(backup); }
      catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      if (backupInfo && !backupInfo.isDirectory()) {
        throw new Error(`Cannot recover: original dependency backup is not a directory for ${item.relative}.`);
      }
      if (!backupInfo && !(item.originalMoved === false && item.newInstalled === false && await isDirectory(destination))) {
        throw new Error(`Cannot recover: original dependency backup is missing for ${item.relative}.`);
      }
    }
  }
  return { backupRoot };
}

async function recoverTransaction(target) {
  const journalPath = path.join(target, ".codex", "ke-install-transaction.json");
  await assertNoSymlinkDescendants(target, [".codex/ke-install-transaction.json"]);
  if (!(await exists(journalPath))) throw new Error("No interrupted KE installer transaction was found.");
  let journal;
  try { journal = JSON.parse(await readFile(journalPath, "utf8")); }
  catch { throw new Error("Cannot recover: transaction journal is malformed or unsupported."); }
  validateTransactionJournal(journal);
  if (journal.state === "committed") {
    await preflightTransactionRecovery(target, journal, { requireBackups: false });
    await rm(journalPath, { force: true });
    console.log("The KE Kit transaction had committed; no rollback was needed.");
    return;
  }
  const failures = await restoreTransaction(target, journalPath, journal);
  if (failures.length) throw new Error(`Recovery incomplete: ${failures.join("; ")}`);
  console.log(`Recovered the interrupted KE Kit ${journal.action} transaction. Original managed/project files were restored.`);
}

async function runMigration(target, backupRoot) {
  const result = await run(process.execPath, [
    path.join(target, "scripts", "migrate-projects.mjs"),
    "--root", target,
    "--backup-root", path.join(backupRoot, "migration"),
  ], target, { capture: true });
  if (result.code !== 0) {
    let details = result.stderr.trim();
    try {
      const report = JSON.parse(result.stdout);
      details ||= (report.results ?? []).flatMap((item) => item.errors ?? []).join("; ");
    } catch {
      details ||= result.stdout.trim();
    }
    throw new Error(`Migration failed with exit ${result.code}${details ? `: ${details}` : "."}`);
  }
}

function dependencyPackages(stagingRoot) {
  return ["platform/ke-kintone-mcp", "platform/ke-browser-mcp", "platform/ke-office-cli"].map((relative) => {
    const files = payloadFiles.filter((file) => file.path.startsWith(`${relative}/`));
    if (!files.some((file) => file.path === `${relative}/package.json`) || !files.some((file) => file.path === `${relative}/package-lock.json`)) {
      throw new Error(`Embedded dependency payload is incomplete for ${relative}.`);
    }
    return { relative, files, staged: path.join(stagingRoot, relative) };
  });
}

async function installStagedDependencies(target, stagingRoot, backupRoot, journal, journalPath) {
  const packages = dependencyPackages(path.join(target, stagingRoot));
  for (const item of packages) {
    for (const file of item.files) {
      const destination = path.join(target, stagingRoot, safeRelative(file.path));
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, file.content);
    }
    const windows = process.platform === "win32";
    const command = windows ? process.env.ComSpec || "cmd.exe" : "npm";
    const commandArgs = windows
      ? ["/d", "/s", "/c", "npm", "ci", "--prefix", item.staged]
      : ["ci", "--prefix", item.staged];
    const result = await run(command, commandArgs, target);
    if (result.code !== 0) throw new Error(`Dependency installation failed for ${item.relative} (exit ${result.code}).`);
    if (!(await isDirectory(path.join(item.staged, "node_modules")))) {
      throw new Error(`Dependency installation did not produce node_modules for ${item.relative}.`);
    }
  }

  journal.dependencies = packages.map((item) => ({
    relative: item.relative,
    hadOriginal: false,
    originalMoved: false,
    newInstalled: false,
    backupRelative: path.join("dependencies", item.relative, "node_modules"),
  }));
  for (const item of journal.dependencies) item.hadOriginal = await exists(path.join(target, item.relative, "node_modules"));
  await writeJournal(journalPath, journal);
  for (const [index, item] of journal.dependencies.entries()) {
    const destination = path.join(target, item.relative, "node_modules");
    const stagedModules = path.join(packages[index].staged, "node_modules");
    if (item.hadOriginal) {
      const backup = path.join(backupRoot, safeRelative(item.backupRelative));
      await mkdir(path.dirname(backup), { recursive: true });
      await rename(destination, backup);
      item.originalMoved = true;
      await writeJournal(journalPath, journal);
    }
    await mkdir(path.dirname(destination), { recursive: true });
    if (await exists(stagedModules)) await rename(stagedModules, destination);
    item.newInstalled = await exists(destination);
    await writeJournal(journalPath, journal);
  }
}

async function confirmInstall(action, configurePreferences, assumeYes, options) {
  let { chatLanguage, documentLanguages } = options;
  if (assumeYes) return { accepted: true, chatLanguage, documentLanguages };
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await terminal.question(`${action === "upgrade" ? "Upgrade" : "Install"} KE Kit in this project? (Y/n) `);
    if (answer.trim() && !/^y(?:es)?$/iu.test(answer.trim())) return { accepted: false };
    if (configurePreferences && !options.preferencesExist && action === "install") {
      if (chatLanguage === undefined) chatLanguage = normalizeLanguage(await terminal.question("Preferred chat language / Ngôn ngữ chat mong muốn? (English) "));
      if (documentLanguages === undefined) {
        console.log("Tip: for two output versions, enter languages separated by comma, for example: English, Vietnamese");
        documentLanguages = parseDocumentLanguages(await terminal.question("Preferred output document language(s) / Ngôn ngữ tài liệu? (English) "));
      }
    }
    return { accepted: true, chatLanguage, documentLanguages };
  } finally {
    terminal.close();
  }
}

async function installerMain() {
  if (args.includes("--help") || args.includes("-h")) {
    usage();
    return;
  }
  if (args.includes("--version") || args.includes("-v")) {
    console.log(packageVersion);
    return;
  }
  const action = args[0];
  if (!["install", "upgrade", "recover"].includes(action)) {
    usage();
    process.exitCode = 1;
    return;
  }

  const target = path.resolve(optionValue("--directory") ?? process.cwd());
  if (action === "recover") {
    await recoverTransaction(target);
    return;
  }
  const isUpgrade = action === "upgrade";
  const assumeYes = args.includes("--yes");
  const skipDependencies = args.includes("--skip-deps");
  const force = args.includes("--force");
  const dryRun = args.includes("--dry-run");
  const chatLanguageOption = optionValue("--chat-language");
  const documentLanguagesOption = optionValue("--document-languages");
  const preferencesPath = path.join(target, ".codex", "ke-preferences.toml");
  const preferencesExist = await exists(preferencesPath);
  const configurePreferences =
    (!isUpgrade && !preferencesExist) ||
    chatLanguageOption !== undefined ||
    documentLanguagesOption !== undefined;

  console.log(`\nKE Kit ${packageVersion} ${isUpgrade ? "upgrade" : "installer"}`);
  console.log(`Target: ${target}`);
  const preflight = await collectPreflight(target, isUpgrade, force);
  const migration = migrationWritePaths(preflight.migrationReport);
  const backupRoot = createBackupRoot(target, preflight.previousManifest);
  if (dryRun) {
    console.log(JSON.stringify({
      action,
      fromVersion: preflight.previousManifest?.version,
      toVersion: packageVersion,
      managedFiles: payloadFiles.length,
      conflicts: preflight.conflicts,
      legacyManifest: isUpgrade && !preflight.previousManifest.fileHashes,
      migration,
      backupRoot,
    }, null, 2));
    return;
  }

  const confirmation = await confirmInstall(action, configurePreferences, assumeYes, {
    chatLanguage: chatLanguageOption === undefined ? undefined : normalizeLanguage(chatLanguageOption),
    documentLanguages: documentLanguagesOption === undefined ? undefined : parseDocumentLanguages(documentLanguagesOption),
    preferencesExist,
  });
  if (!confirmation.accepted) {
    console.log("Installation cancelled.");
    return;
  }

  let preferenceContent;
  if (configurePreferences) {
    const current = preferencesExist ? await readFile(preferencesPath, "utf8") : undefined;
    const chatLanguage = confirmation.chatLanguage ?? (current ? undefined : "English");
    const documentLanguages = confirmation.documentLanguages ?? (current ? undefined : ["English"]);
    preferenceContent = updatePreferences(current, { chatLanguage, documentLanguages });
  }

  const manifestPath = path.join(target, ".codex", "ke-kit-manifest.json");
  const envExamplePath = path.join(target, "platform", "ke-kintone-mcp", ".env.example");
  const envPath = path.join(target, "platform", "ke-kintone-mcp", ".env");
  const writePaths = payloadFiles.map(payloadDestination);
  writePaths.push(path.relative(target, manifestPath));
  if (preferenceContent !== undefined) writePaths.push(path.join(".codex", "ke-preferences.toml"));
  if (!(await exists(envPath))) writePaths.push(path.join("platform", "ke-kintone-mcp", ".env"));
  if (isUpgrade) writePaths.push(...migration.files);
  const targetExisted = await exists(target);
  const createdDirectories = await missingDirectories(target, writePaths, isUpgrade ? migration.directories : []);

  await mkdir(target, { recursive: true });
  await mkdir(path.dirname(manifestPath), { recursive: true });
  const backupRootRelative = transactionRelative(target, backupRoot);
  await mkdir(backupRoot, { recursive: true });
  const fileSnapshots = await snapshotFiles(target, backupRoot, writePaths);
  const stagingRoot = path.join(".codex", `.ke-install-stage-${randomUUID()}`);
  const journalPath = path.join(target, ".codex", "ke-install-transaction.json");
  const journal = {
    schemaVersion: 1,
    state: "in-progress",
    action,
    backupRoot: backupRootRelative,
    fileSnapshots,
    createdDirectories: createdDirectories.map(safeRelative),
    dependencies: [],
    stagingRoot: safeRelative(stagingRoot),
    targetExisted,
    createdAt: new Date().toISOString(),
  };
  await writeJournal(journalPath, journal);

  try {
    for (const file of payloadFiles) {
      if (preflight.mergedFiles.has(file.path)) continue;
      const destination = path.join(target, payloadDestination(file));
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, file.content);
    }
    for (const item of preflight.mergedFiles.values()) {
      const destination = path.join(target, item.destination);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, item.merged, "utf8");
    }
    if (preferenceContent !== undefined) {
      await mkdir(path.dirname(preferencesPath), { recursive: true });
      await writeFile(preferencesPath, preferenceContent, "utf8");
    }
    if (!(await exists(envPath))) await cp(envExamplePath, envPath, { errorOnExist: true });

    if (isUpgrade && preflight.migrationReport) await runMigration(target, backupRoot);
    if (!skipDependencies) {
      await mkdir(path.join(target, stagingRoot), { recursive: true });
      await writeJournal(journalPath, journal);
      await installStagedDependencies(target, stagingRoot, backupRoot, journal, journalPath);
    }

    const fileHashes = {};
    const managedLabels = new Map([
      ["AGENTS.md", "PROJECT INSTRUCTIONS"],
      ["gitignore.template", "GITIGNORE"],
      [".codex/config.toml", "CODEX CONFIG"],
    ]);
    for (const file of payloadFiles) {
      const merged = preflight.mergedFiles.get(file.path);
      fileHashes[file.path] = merged
        ? digestContent(Buffer.from(managedBlock(merged.content, managedLabels.get(file.path)), "utf8"))
        : await digest(path.join(target, payloadDestination(file)));
    }
    const manifest = {
      schemaVersion: manifestSchemaVersion,
      package: packageName,
      version: packageVersion,
      installedAt: new Date().toISOString(),
      files: payloadFiles.map((file) => file.path).filter((file) => file !== "gitignore.template").concat(".gitignore"),
      fileHashes,
      previousVersion: preflight.previousManifest?.version,
      dependencies: skipDependencies ? "skipped" : "installed",
      backupRoot: isUpgrade ? backupRootRelative : undefined,
    };
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    if (await exists(path.join(target, stagingRoot))) await rm(path.join(target, stagingRoot), { recursive: true, force: true });
    journal.state = "committed";
    await writeJournal(journalPath, journal);
    await rm(journalPath, { force: true });

    console.log(`\nKE Kit ${isUpgrade ? "upgraded" : "installed"}${skipDependencies ? " (dependencies skipped)" : ""}.`);
    if (configurePreferences) {
      console.log(`Chat language: ${confirmation.chatLanguage ?? "preserved"}`);
      console.log(`Output document language(s): ${confirmation.documentLanguages?.join(", ") ?? "preserved"}`);
    } else {
      console.log("Language preferences: existing file preserved");
    }
    console.log("Next:");
    console.log("1. Edit platform/ke-kintone-mcp/.env only when Kintone access is needed.");
    console.log("2. For an API token, prepare and approve a named test-tenant plan, then run: npm --prefix platform/ke-kintone-mcp run test:connection -- --environment test --approved-test-plan <APPROVAL_REFERENCE> --app <APP_ID>");
    console.log("3. Run: npm --prefix platform/ke-kintone-mcp run check");
    console.log("4. Run: npm --prefix platform/ke-office-cli run check");
    console.log("5. Open this project in Codex and trust it.");
    console.log('6. In a new chat, say "hello", "hi", or "xin chào"; a clear goal can be described directly.');
    console.log("7. A greeting and route menu need no Kintone configuration; browser sign-in is deferred until browser work first needs it.");
  } catch (error) {
    const failures = await restoreTransaction(target, journalPath, journal);
    if (failures.length) {
      throw new Error(`KE Kit ${action} failed: ${error.message}. Rollback is incomplete (${failures.join("; ")}); run \`npx kintone-expert-bss recover --directory <path>\` to retry recovery. Existing dependency backups are retained at ${backupRootRelative}.`);
    }
    throw new Error(`KE Kit ${action} failed and the previous managed/project state was restored: ${error.message}. Existing dependency directories were preserved; no success manifest was committed.`);
  }
}

installerMain().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
