import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ke-setup-onboarding-"));
const runtimeDir = path.join(tempRoot, "platform", "ke-kintone-mcp");
const examplePath = path.join(runtimeDir, ".env.example");
const envPath = path.join(runtimeDir, ".env");
const setupScript = fileURLToPath(new URL("./setup.mjs", import.meta.url));
const apiTokenKey = ["KINTONE", "API", "TOKEN"].join("_");
const placeholder = `KINTONE_BASE_URL=https://example.invalid\n${apiTokenKey}=EXAMPLE_ONLY\n`;
const existingSecretMarker = "DO_NOT_PRINT_EXISTING_VALUE";

function runSetup() {
  const result = spawnSync(process.execPath, [setupScript], {
    cwd: tempRoot,
    encoding: "utf8",
    timeout: 10_000,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

try {
  await mkdir(runtimeDir, { recursive: true });
  await writeFile(examplePath, placeholder, "utf8");

  const firstOutput = runSetup();
  assert.equal(await readFile(envPath, "utf8"), placeholder);
  assert.match(firstOutput, /Offline advice.*do not need Kintone credentials/iu);
  assert.match(firstOutput, /creates no project workspace/iu);
  assert.match(firstOutput, /does not start a browser/iu);
  assert.match(firstOutput, /Only when the requested task needs live Kintone access/iu);
  assert.doesNotMatch(firstOutput, /EXAMPLE_ONLY|KINTONE_API_TOKEN/iu);
  await assert.rejects(access(path.join(tempRoot, "projects")));

  const existingConfig = `${apiTokenKey}=${existingSecretMarker}\n`;
  await writeFile(envPath, existingConfig, "utf8");
  const secondOutput = runSetup();
  assert.equal(await readFile(envPath, "utf8"), existingConfig);
  assert.match(secondOutput, /\.env was not overwritten/iu);
  assert.doesNotMatch(secondOutput, new RegExp(existingSecretMarker, "u"));

  console.log("Setup onboarding fixture passed: placeholder copy, no overwrite, no secret output, and no project/network/browser setup claims.");
} finally {
  const resolvedTempRoot = path.resolve(tempRoot);
  const resolvedTempBase = path.resolve(os.tmpdir());
  if (path.dirname(resolvedTempRoot) !== resolvedTempBase) {
    throw new Error(`Refusing to clean unexpected temporary path: ${resolvedTempRoot}`);
  }
  await rm(resolvedTempRoot, { recursive: true, force: true });
}
