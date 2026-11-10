import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  bootstrapState,
  validateProject,
} from "./lib/project-state.mjs";
import {
  assertSecureTls,
  buildConnectionProbe,
  createKintoneRestClient,
  KintoneTransportError,
  loadEffectiveConfig,
  loadMutationAuthorization,
  reportConfigConflicts,
  validateKintoneBaseUrl,
} from "../platform/ke-kintone-mcp/scripts/lib/kintone-rest.mjs";
import { toUpdateSettings } from "../platform/ke-kintone-mcp/scripts/lib/customization-verification.mjs";
import {
  buildPlaywrightArgs,
  getBrowserBinding,
  resolveBrowserPaths,
} from "../platform/ke-browser-mcp/scripts/launch-playwright.mjs";

const tenantOrigin = "https://fixture-tenant.example";
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appId = "47";
const environment = "test";
const authorizationFile = "fixture-approval.json";
const projectSlug = "runtime-fixture";
const testRoot = await mkdtemp(path.join(os.tmpdir(), "ke-runtime-hardening-"));
const projectPath = path.join(testRoot, "projects", projectSlug);
const authorizationPath = path.join(
  projectPath,
  "private",
  "authorization",
  authorizationFile,
);
const env = {
  KINTONE_BASE_URL: tenantOrigin,
  KINTONE_USERNAME: "fixture-user",
  KINTONE_PASSWORD: "fixture-password-not-real",
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function response(body, { status = 200, url = `${tenantOrigin}/k/v1/fixture.json` } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    text: async () => JSON.stringify(body),
  };
}

const processSettings = {
  enable: true,
  states: {
    Draft: {
      name: "Draft",
      index: 0,
      assignee: { type: "ONE", entities: [] },
    },
  },
  actions: [],
};

function approvalRecord({
  operation = "process-management.stage",
  guestSpace = null,
  revokedAt = null,
  issuedAt = new Date(Date.now() - 60_000).toISOString(),
  expiresAt = new Date(Date.now() + 60_000).toISOString(),
  limits = operation === "process-management.stage"
    ? {
        configSha256: sha256(JSON.stringify(processSettings)),
        removedStates: [],
        removedActions: [],
      }
    : {
        fileName: "validation.js",
        target: "desktop",
        sha256: sha256("fixture customization bytes"),
        maxFileBytes: 1024,
        replaceExisting: false,
      },
} = {}) {
  return {
    version: 1,
    status: "approved",
    taskMode: "approved-write",
    readOnly: false,
    revokedAt,
    issuedAt,
    expiresAt,
    project: projectSlug,
    tenantOrigin,
    environment,
    app: appId,
    guestSpace,
    operation,
    approvalReference: "fixture-only-test-plan-approval",
    limits,
  };
}

async function saveApproval(record) {
  await writeFile(authorizationPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

async function loadApproval(record, { now } = {}) {
  await saveApproval(record);
  return loadMutationAuthorization({
    repositoryRoot: testRoot,
    project: projectSlug,
    authorizationFile,
    tenantOrigin,
    environment,
    appId,
    guestSpaceId: record.guestSpace,
    operation: record.operation,
    now,
  });
}

async function createFixtureProject(slug) {
  const targetProjectPath = path.join(testRoot, "projects", slug);
  await mkdir(path.join(testRoot, "projects"), { recursive: true });
  for (const directory of ["input", "private", "analysis", "output", "history"]) {
    await mkdir(path.join(targetProjectPath, directory), { recursive: true });
  }
  await mkdir(path.join(targetProjectPath, "private", "authorization"), {
    recursive: true,
  });
  await writeFile(path.join(targetProjectPath, "PROJECT.md"), "# Runtime fixture\n", "utf8");
  await writeFile(path.join(targetProjectPath, "TEAM-NOTES.md"), "# Fixture notes\n", "utf8");
  await bootstrapState(testRoot, {
    slug,
    projectType: "demo",
    entryRoute: "demo-fast-track",
    displayName: "Runtime Fixture",
    objective: "Synthetic local runtime regression fixture",
  });
  assert.deepEqual(await validateProject(testRoot, slug), []);
  return targetProjectPath;
}

await createFixtureProject(projectSlug);

try {
  const envFilePath = path.join(testRoot, ".env.fixture");
  await writeFile(
    envFilePath,
    `${"KINTONE_BASE_URL"}=https://file-tenant.example\n${"KINTONE" + "_PASSWORD"}=file-password\n`,
    "utf8",
  );
  const effective = await loadEffectiveConfig({
    env: {
      KINTONE_BASE_URL: tenantOrigin,
      KINTONE_PASSWORD: "inherited-password",
    },
    envFilePath,
  });
  assert.equal(effective.values.KINTONE_BASE_URL, tenantOrigin);
  assert.equal(effective.values.KINTONE_PASSWORD, "inherited-password");
  assert.deepEqual(effective.conflictingKeys, ["KINTONE_BASE_URL", "KINTONE_PASSWORD"]);
  let conflictMessage = "";
  reportConfigConflicts(effective, (message) => (conflictMessage += message));
  assert.match(conflictMessage, /KINTONE_BASE_URL, KINTONE_PASSWORD/u);
  assert.doesNotMatch(conflictMessage, /inherited-password|file-password/u);

  assert.equal(validateKintoneBaseUrl(tenantOrigin).origin, tenantOrigin);
  for (const unsafeUrl of [
    "http://fixture-tenant.example",
    "https://user:pass@fixture-tenant.example",
    "https://fixture-tenant.example/k",
    "https://fixture-tenant.example/?token=secret",
    "https://fixture-tenant.example/#credential",
  ]) {
    assert.throws(() => validateKintoneBaseUrl(unsafeUrl));
  }
  assert.throws(() => assertSecureTls({ NODE_TLS_REJECT_UNAUTHORIZED: "0" }), /certificate verification/u);

  assert.throws(
    () => buildConnectionProbe({ env: { KINTONE_API_TOKEN: "fixture-token" } }),
    /requires --app/u,
  );
  assert.throws(
    () =>
      buildConnectionProbe({
        env: { KINTONE_USERNAME: "fixture-user", KINTONE_PASSWORD: "fixture-password" },
        guestSpaceId: "15",
      }),
    /requires an explicit --app scope/u,
  );
  assert.deepEqual(
    buildConnectionProbe({
      env: { KINTONE_API_TOKEN: "fixture-token" },
      appId: "47",
      guestSpaceId: "15",
    }),
    {
      authKind: "API token",
      path: "/k/guest/15/v1/app.json?id=47",
      appId: "47",
      guestSpaceId: "15",
    },
  );
  const connectionScript = path.join(
    repositoryRoot,
    "platform",
    "ke-kintone-mcp",
    "scripts",
    "test-connection.mjs",
  );
  const gatedConnection = spawnSync(
    process.execPath,
    [connectionScript, "--environment", "test"],
    {
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        WINDIR: process.env.WINDIR,
      },
    },
  );
  assert.equal(gatedConnection.status, 1);
  assert.match(gatedConnection.stderr, /No tenant call was made/u);

  assert.throws(
    () => getBrowserBinding({}),
    /Greetings and chat-only onboarding do not need browser login/u,
  );
  assert.deepEqual(
    getBrowserBinding({
      KE_PROJECT_SLUG: projectSlug,
      KE_BROWSER_IDENTITY: "project-analyst",
    }),
    { projectSlug, identity: "project-analyst" },
  );
  const secondProjectSlug = "runtime-fixture-two";
  await createFixtureProject(secondProjectSlug);
  const browserPaths = await Promise.all([
    resolveBrowserPaths({
      repositoryRoot: testRoot,
      projectSlug,
      identity: "project-analyst",
    }),
    resolveBrowserPaths({
      repositoryRoot: testRoot,
      projectSlug,
      identity: "project-reviewer",
    }),
    resolveBrowserPaths({
      repositoryRoot: testRoot,
      projectSlug: secondProjectSlug,
      identity: "project-analyst",
    }),
  ]);
  assert.equal(new Set(browserPaths.map((item) => item.profileDirectory)).size, 3);
  assert.equal(new Set(browserPaths.map((item) => item.evidenceDirectory)).size, 3);
  assert(browserPaths[0].profileDirectory.includes(`${projectSlug}${path.sep}private`));
  assert(browserPaths[2].profileDirectory.includes(`${secondProjectSlug}${path.sep}private`));
  assert(buildPlaywrightArgs(browserPaths[0]).includes(browserPaths[0].profileDirectory));
  assert(buildPlaywrightArgs(browserPaths[0]).includes(browserPaths[0].evidenceDirectory));
  const linkedProfilePath = path.join(
    projectPath,
    "private",
    "browser-profiles",
    "project-linked",
  );
  const externalProfilePath = path.join(testRoot, "external-browser-profile");
  await mkdir(externalProfilePath, { recursive: true });
  await symlink(
    externalProfilePath,
    linkedProfilePath,
    process.platform === "win32" ? "junction" : "dir",
  );
  await assert.rejects(
    resolveBrowserPaths({
      repositoryRoot: testRoot,
      projectSlug,
      identity: "project-linked",
    }),
    /must not use symlinks/u,
  );
  await assert.rejects(
    readFile(path.join(testRoot, ".codex", "ke-active-project.json")),
    { code: "ENOENT" },
  );

  const codexConfig = await readFile(
    path.join(repositoryRoot, ".codex", "config.toml"),
    "utf8",
  );
  const kintoneConfig = codexConfig.match(
    /\[mcp_servers\.kintone\]([\s\S]*?)(?=\n\[|$)/u,
  )?.[1];
  assert(kintoneConfig, "Kintone MCP server config must be present");
  const allowlist = kintoneConfig.match(/enabled_tools\s*=\s*\[([\s\S]*?)\]/u)?.[1];
  assert(allowlist, "Kintone MCP must have an explicit tool allowlist");
  const allowedTools = [...allowlist.matchAll(/"([a-z0-9-]+)"/gu)].map((match) => match[1]);
  assert.deepEqual(allowedTools, [
    "kintone-get-apps",
    "kintone-get-app",
    "kintone-get-form-fields",
    "kintone-get-form-layout",
    "kintone-get-process-management",
    "kintone-get-app-deploy-status",
    "kintone-get-general-settings",
    "kintone-get-customization",
    "kintone-get-records",
    "kintone-get-record-comments",
    "kintone-get-space",
  ]);
  assert.match(kintoneConfig, /default_tools_approval_mode\s*=\s*"writes"/u);
  assert.match(kintoneConfig, /not per-App\/account enforcement/u);

  let fetchCalls = [];
  const readonlyClient = createKintoneRestClient({
    env,
    fetchImpl: async (url, options) => {
      fetchCalls.push({ url: String(url), options });
      return response({ appId });
    },
    maxReadRetries: 0,
  });
  await assert.rejects(
    readonlyClient.request("/k/v1/preview/app/status.json", {
      method: "PUT",
      body: { app: appId },
    }),
    /read-only by default/u,
  );
  await assert.rejects(readonlyClient.request("https://other.example/k/v1/apps.json"), /origin-relative/u);
  await assert.rejects(
    readonlyClient.request("/k/v1/apps.json", {
      headers: { "X-Cybozu-API-Token": "override" },
    }),
    /Caller-supplied .* header is forbidden/u,
  );
  assert.equal(fetchCalls.length, 0);

  const redirectClient = createKintoneRestClient({
    env,
    fetchImpl: async (_url, options) => {
      fetchCalls.push({ options });
      return response({ message: "fixture secret echo" }, { url: "https://other.example/redirect" });
    },
    maxReadRetries: 0,
  });
  await assert.rejects(
    redirectClient.request("/k/v1/apps.json"),
    (error) =>
      error instanceof KintoneTransportError &&
      /changed origin/u.test(error.message) &&
      !error.message.includes("fixture secret echo"),
  );
  assert.equal(fetchCalls.at(-1).options.redirect, "error");

  let readAttempts = 0;
  const retryClient = createKintoneRestClient({
    env,
    fetchImpl: async () => {
      readAttempts += 1;
      return readAttempts === 1
        ? response({}, { status: 503 })
        : response({ apps: [{ appId }] });
    },
    maxReadRetries: 1,
    retryDelayMs: 1,
  });
  assert.deepEqual(await retryClient.request("/k/v1/apps.json?limit=1"), {
    apps: [{ appId }],
  });
  assert.equal(readAttempts, 2);

  const bodyTimeoutClient = createKintoneRestClient({
    env,
    timeoutMs: 15,
    maxReadRetries: 0,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      url: `${tenantOrigin}/k/v1/apps.json`,
      text: () => new Promise(() => {}),
    }),
  });
  await assert.rejects(
    bodyTimeoutClient.request("/k/v1/apps.json"),
    (error) => error instanceof KintoneTransportError && error.code === "ETIMEDOUT",
  );

  const processRecord = approvalRecord();
  const processContext = await loadApproval(processRecord);
  assert.equal(Object.isFrozen(processContext.limits), true);
  assert.equal(Object.isFrozen(processContext.limits.removedStates), true);
  assert.equal(Object.isFrozen(processContext.limits.removedActions), true);
  assert.throws(() => processContext.limits.removedStates.push("Injected"), TypeError);
  let processWriteCount = 0;
  const processClient = createKintoneRestClient({
    env,
    mutationContext: processContext,
    maxReadRetries: 0,
    fetchImpl: async (_url, options) => {
      processWriteCount += 1;
      assert.equal(options.method, "PUT");
      assert.equal(options.redirect, "error");
      return response({ revision: "4" });
    },
  });
  const processBody = { app: appId, revision: "3", ...processSettings };
  assert.deepEqual(
    await processClient.request("/k/v1/preview/app/status.json", {
      method: "PUT",
      body: processBody,
    }),
    { revision: "4" },
  );
  assert.equal(processWriteCount, 1);

  const changedContext = await loadApproval(approvalRecord());
  const changedClient = createKintoneRestClient({
    env,
    mutationContext: changedContext,
    fetchImpl: async () => {
      throw new Error("must not send after revocation");
    },
  });
  const revoked = approvalRecord({ revokedAt: new Date().toISOString() });
  await saveApproval(revoked);
  await assert.rejects(
    changedClient.request("/k/v1/preview/app/status.json", {
      method: "PUT",
      body: processBody,
    }),
    /revoked/u,
  );

  const hashChangedContext = await loadApproval(approvalRecord());
  const hashChangedClient = createKintoneRestClient({
    env,
    mutationContext: hashChangedContext,
    fetchImpl: async () => {
      throw new Error("must not send after approval-file changes");
    },
  });
  await saveApproval({ ...approvalRecord(), changedAfterApproval: true });
  await assert.rejects(
    hashChangedClient.request("/k/v1/preview/app/status.json", {
      method: "PUT",
      body: processBody,
    }),
    /changed after validation/u,
  );

  const expiringNow = Date.now();
  const expiringRecord = approvalRecord({
    issuedAt: new Date(expiringNow - 60_000).toISOString(),
    expiresAt: new Date(expiringNow + 80).toISOString(),
  });
  const expiringContext = await loadApproval(expiringRecord, {
    now: expiringNow - 1_000,
  });
  const expiringClient = createKintoneRestClient({
    env,
    mutationContext: expiringContext,
    fetchImpl: async () => {
      throw new Error("must not send after expiry");
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await assert.rejects(
    expiringClient.request("/k/v1/preview/app/status.json", {
      method: "PUT",
      body: processBody,
    }),
    /expired/u,
  );

  const writeTimeoutContext = await loadApproval(approvalRecord());
  let writeTimeoutCount = 0;
  const writeTimeoutClient = createKintoneRestClient({
    env,
    mutationContext: writeTimeoutContext,
    timeoutMs: 15,
    maxReadRetries: 4,
    fetchImpl: async () => {
      writeTimeoutCount += 1;
      return new Promise(() => {});
    },
  });
  await assert.rejects(
    writeTimeoutClient.request("/k/v1/preview/app/status.json", {
      method: "PUT",
      body: processBody,
    }),
    (error) =>
      error instanceof KintoneTransportError &&
      error.uncertainState === true &&
      /Read back the target state/u.test(error.message),
  );
  assert.equal(writeTimeoutCount, 1, "ambiguous writes must never be replayed");

  const customizationBytes = Buffer.from("fixture customization bytes");
  const customizationContext = await loadApproval(
    approvalRecord({ operation: "app-customization.stage", guestSpace: "15" }),
  );
  const previewPath = "/k/guest/15/v1/preview/app/customize.json?app=47";
  const uploadPath = "/k/guest/15/v1/file.json";
  const updatePath = "/k/guest/15/v1/preview/app/customize.json";
  const baseline = {
    revision: "8",
    scope: "ALL",
    desktop: {
      js: [{ type: "URL", url: "https://cdn.example/existing.js" }],
      css: [],
    },
    mobile: { js: [], css: [] },
  };
  let customizationWrites = 0;
  const customizationClient = createKintoneRestClient({
    env,
    mutationContext: customizationContext,
    maxReadRetries: 0,
    fetchImpl: async (url, options) => {
      const endpointPath = new URL(url).pathname;
      if (endpointPath === "/k/guest/15/v1/preview/app/customize.json" && options.method === "GET") {
        return response(baseline, { url: `${tenantOrigin}${endpointPath}?app=47` });
      }
      if (endpointPath === uploadPath && options.method === "POST") {
        customizationWrites += 1;
        return response({ fileKey: "fixture-upload-key" }, { url: `${tenantOrigin}${endpointPath}` });
      }
      if (endpointPath === updatePath && options.method === "PUT") {
        customizationWrites += 1;
        return response({ revision: "9" }, { url: `${tenantOrigin}${endpointPath}` });
      }
      throw new Error(`Unexpected synthetic request ${options.method} ${endpointPath}`);
    },
  });
  await customizationClient.request(previewPath);
  const form = new FormData();
  form.append("file", new Blob([customizationBytes], { type: "text/javascript" }), "validation.js");
  await customizationClient.request(uploadPath, { method: "POST", body: form });

  const expectedSettings = toUpdateSettings(baseline);
  expectedSettings.desktop.js.push({
    type: "FILE",
    file: { fileKey: "fixture-upload-key" },
  });
  const safeUpdateBody = {
    app: appId,
    revision: baseline.revision,
    ...expectedSettings,
  };
  const withExtraResource = structuredClone(safeUpdateBody);
  withExtraResource.mobile.css.push({ type: "URL", url: "https://attacker.example/extra.css" });
  await assert.rejects(
    customizationClient.request(updatePath, {
      method: "PUT",
      body: withExtraResource,
    }),
    /beyond the exactly approved file entry/u,
  );
  const withRemoval = structuredClone(safeUpdateBody);
  withRemoval.desktop.js = [
    { type: "FILE", file: { fileKey: "fixture-upload-key" } },
  ];
  await assert.rejects(
    customizationClient.request(updatePath, {
      method: "PUT",
      body: withRemoval,
    }),
    /beyond the exactly approved file entry/u,
  );
  assert.deepEqual(
    await customizationClient.request(updatePath, {
      method: "PUT",
      body: safeUpdateBody,
    }),
    { revision: "9" },
  );
  assert.equal(customizationWrites, 2, "only upload and exactly scoped customization update are sent");

  assert.throws(
    () =>
      createKintoneRestClient({
        env: { ...env, NODE_TLS_REJECT_UNAUTHORIZED: "0" },
      }),
    /certificate verification/u,
  );

  console.log("Kintone runtime hardening regression tests passed (synthetic fixtures only).");
} finally {
  const resolvedTestRoot = path.resolve(testRoot);
  const expectedPrefix = path.resolve(os.tmpdir());
  assert.ok(
    resolvedTestRoot.startsWith(`${expectedPrefix}${path.sep}`),
    "test cleanup path must remain inside the dedicated OS temporary directory",
  );
  await rm(resolvedTestRoot, { recursive: true, force: true });
}
