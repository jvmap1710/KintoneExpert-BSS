import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual, parseEnv } from "node:util";
import { validateProject } from "../../../../scripts/lib/project-state.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../");
const packageEnvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env");
const CONFIG_KEYS = [
  "KINTONE_BASE_URL",
  "KINTONE_USERNAME",
  "KINTONE_PASSWORD",
  "KINTONE_API_TOKEN",
  "KINTONE_BASIC_AUTH_USERNAME",
  "KINTONE_BASIC_AUTH_PASSWORD",
  "NODE_TLS_REJECT_UNAUTHORIZED",
];
const KNOWN_ENVIRONMENTS = new Set([
  "development",
  "test",
  "demo",
  "staging",
  "production",
]);
const RETRYABLE_READ_STATUSES = new Set([408, 429, 502, 503, 504]);
const credentialHeaderNames = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "x-cybozu-authorization",
  "x-cybozu-api-token",
]);
const mutationContexts = new WeakMap();

export async function loadEffectiveConfig({
  env = process.env,
  envFilePath = packageEnvPath,
} = {}) {
  let fileValues = Object.create(null);
  let filePresent = false;
  if (envFilePath) {
    try {
      fileValues = parseEnv(await readFile(envFilePath, "utf8"));
      filePresent = true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  const inheritedValues = { ...env };
  const conflictingKeys = CONFIG_KEYS.filter(
    (key) =>
      fileValues[key] !== undefined &&
      inheritedValues[key] !== undefined &&
      fileValues[key] !== inheritedValues[key],
  );
  return {
    values: { ...fileValues, ...inheritedValues },
    conflictingKeys,
    filePresent,
  };
}

export function reportConfigConflicts(config, write = console.error) {
  if (!config.conflictingKeys?.length) return;
  write(
    `Inherited environment overrides .env for: ${config.conflictingKeys.join(", ")}. ` +
      "The inherited values are being used; values are not printed.",
  );
}

export function validateKintoneBaseUrl(value) {
  if (!value) throw new Error("KINTONE_BASE_URL is required.");
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("KINTONE_BASE_URL must be an HTTPS base URL.");
  }
  if (
    url.protocol !== "https:" ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["", "/"].includes(url.pathname)
  ) {
    throw new Error(
      "KINTONE_BASE_URL must be an HTTPS origin without credentials, path, query, or fragment.",
    );
  }
  return url;
}

export function assertSecureTls(env = process.env) {
  if (String(env.NODE_TLS_REJECT_UNAUTHORIZED ?? "").trim() === "0") {
    throw new Error(
      "NODE_TLS_REJECT_UNAUTHORIZED disables certificate verification; refusing credentialed Kintone operations.",
    );
  }
}

function encode(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

export function buildKintoneAuthHeaders(
  env = process.env,
  { allowApiToken = true } = {},
) {
  const hasPassword = Boolean(env.KINTONE_USERNAME && env.KINTONE_PASSWORD);
  const hasApiToken = Boolean(env.KINTONE_API_TOKEN);

  if (hasPassword === hasApiToken) {
    throw new Error(
      "Configure exactly one Kintone authentication method: username/password OR API token.",
    );
  }
  if (hasApiToken && !allowApiToken) {
    throw new Error(
      "This Kintone REST operation requires username/password, session, or OAuth.",
    );
  }

  const headers = hasPassword
    ? {
        "X-Cybozu-Authorization": encode(
          `${env.KINTONE_USERNAME}:${env.KINTONE_PASSWORD}`,
        ),
      }
    : { "X-Cybozu-API-Token": env.KINTONE_API_TOKEN };

  const hasBasicUsername = Boolean(env.KINTONE_BASIC_AUTH_USERNAME);
  const hasBasicPassword = Boolean(env.KINTONE_BASIC_AUTH_PASSWORD);
  if (hasBasicUsername !== hasBasicPassword) {
    throw new Error(
      "Configure both KINTONE_BASIC_AUTH_USERNAME and KINTONE_BASIC_AUTH_PASSWORD, or neither.",
    );
  }
  if (hasBasicUsername) {
    headers.Authorization = `Basic ${encode(
      `${env.KINTONE_BASIC_AUTH_USERNAME}:${env.KINTONE_BASIC_AUTH_PASSWORD}`,
    )}`;
  }

  return headers;
}

function isPositiveInteger(value) {
  return /^[1-9]\d*$/u.test(String(value ?? ""));
}

export function buildConnectionProbe({ env, appId, guestSpaceId } = {}) {
  const hasPassword = Boolean(env?.KINTONE_USERNAME && env?.KINTONE_PASSWORD);
  const hasApiToken = Boolean(env?.KINTONE_API_TOKEN);
  if (hasPassword === hasApiToken) {
    throw new Error(
      "Configure exactly one Kintone authentication method: username/password OR API token.",
    );
  }
  if (appId !== undefined && !isPositiveInteger(appId)) {
    throw new Error("App ID must be a positive integer.");
  }
  if (guestSpaceId !== undefined && !isPositiveInteger(guestSpaceId)) {
    throw new Error("Guest Space ID must be a positive integer.");
  }
  if (guestSpaceId !== undefined && appId === undefined) {
    throw new Error("--guest-space requires an explicit --app scope.");
  }
  if (hasApiToken && appId === undefined) {
    throw new Error(
      "API-token authentication requires --app because Get Apps does not support API tokens. Use Get App with an explicit App ID.",
    );
  }

  const apiRoot = guestSpaceId
    ? `/k/guest/${guestSpaceId}/v1`
    : "/k/v1";
  if (appId !== undefined) {
    return {
      authKind: hasPassword ? "username/password" : "API token",
      path: `${apiRoot}/app.json?id=${encodeURIComponent(appId)}`,
      appId: String(appId),
      guestSpaceId: guestSpaceId === undefined ? null : String(guestSpaceId),
    };
  }
  return {
    authKind: "username/password",
    path: "/k/v1/apps.json?limit=1",
    appId: null,
    guestSpaceId: null,
  };
}

function pathEquals(left, right) {
  const a = path.resolve(left);
  const b = path.resolve(right);
  return process.platform === "win32"
    ? a.toLowerCase() === b.toLowerCase()
    : a === b;
}

function pathIsWithin(root, candidate) {
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
  if (!pathEquals(canonical, target)) {
    throw new Error(`${description} must resolve to its canonical path.`);
  }
  return canonical;
}

export async function resolveProjectFile({
  repositoryRoot: root = repositoryRoot,
  project,
  filePath,
} = {}) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(project ?? "")) {
    throw new Error("--project must be a valid explicit project slug.");
  }
  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new Error("An explicit file path under the bound project workspace is required.");
  }

  const canonicalRepositoryRoot = await realpath(root);
  const canonicalProjectsPath = await requireCanonicalDirectory(
    path.join(canonicalRepositoryRoot, "projects"),
    "projects/",
  );
  const projectPath = path.join(canonicalProjectsPath, project);
  const canonicalProjectPath = await requireCanonicalDirectory(
    projectPath,
    `Project ${project}`,
  );
  if (
    !pathEquals(path.dirname(canonicalProjectPath), canonicalProjectsPath) ||
    path.basename(canonicalProjectPath) !== project
  ) {
    throw new Error("Project path does not match the explicit project slug.");
  }
  const projectErrors = await validateProject(canonicalRepositoryRoot, project);
  if (projectErrors.length) {
    throw new Error(`Project ${project} is not valid: ${projectErrors.join("; ")}`);
  }
  const candidatePath = path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(canonicalProjectPath, filePath);
  if (!pathIsWithin(canonicalProjectPath, candidatePath)) {
    throw new Error("Input/config files must be under the bound project's canonical workspace.");
  }
  const info = await lstat(candidatePath).catch(() => null);
  if (!info?.isFile() || info.isSymbolicLink()) {
    throw new Error("Input/config file must be an existing regular, non-symlink file.");
  }
  const canonicalFilePath = await realpath(candidatePath);
  if (
    !pathEquals(canonicalFilePath, candidatePath) ||
    !pathIsWithin(canonicalProjectPath, canonicalFilePath)
  ) {
    throw new Error("Input/config file must resolve under the bound project's canonical workspace.");
  }
  return canonicalFilePath;
}

function parseTimestamp(value, label) {
  if (typeof value !== "string" || !value.endsWith("Z")) {
    throw new Error(`Authorization ${label} must be an ISO UTC timestamp.`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Authorization ${label} must be an ISO UTC timestamp.`);
  }
  return parsed;
}

function validateLimits(authorization, expectedOperation) {
  const limits = authorization.limits;
  if (!limits || typeof limits !== "object" || Array.isArray(limits)) {
    throw new Error("Authorization limits must be a JSON object.");
  }
  if (expectedOperation === "app-customization.stage") {
    if (
      typeof limits.fileName !== "string" ||
      path.basename(limits.fileName) !== limits.fileName ||
      !["desktop", "mobile"].includes(limits.target) ||
      !/^[a-f0-9]{64}$/u.test(limits.sha256 ?? "") ||
      !Number.isSafeInteger(limits.maxFileBytes) ||
      limits.maxFileBytes < 1 ||
      typeof limits.replaceExisting !== "boolean"
    ) {
      throw new Error(
        "Customization authorization limits must bind fileName, target, sha256, maxFileBytes, and replaceExisting.",
      );
    }
  } else if (expectedOperation === "process-management.stage") {
    if (
      !/^[a-f0-9]{64}$/u.test(limits.configSha256 ?? "") ||
      !Array.isArray(limits.removedStates) ||
      !limits.removedStates.every((name) => typeof name === "string") ||
      !Array.isArray(limits.removedActions) ||
      !limits.removedActions.every(
        (action) =>
          action &&
          typeof action.name === "string" &&
          typeof action.from === "string" &&
          typeof action.to === "string",
      )
    ) {
      throw new Error(
        "Process authorization limits must bind configSha256, removedStates, and removedActions.",
      );
    }
  } else {
    throw new Error("Unsupported mutation operation.");
  }
  return structuredClone(limits);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function assertActiveAuthorizationRecord(authorization, now = Date.now()) {
  if (
    authorization?.version !== 1 ||
    authorization.status !== "approved" ||
    authorization.taskMode !== "approved-write" ||
    authorization.readOnly !== false ||
    authorization.revokedAt !== null
  ) {
    throw new Error("Authorization is revoked or no longer an active approved write context.");
  }
  const issuedAt = parseTimestamp(authorization.issuedAt, "issuedAt");
  const expiresAt = parseTimestamp(authorization.expiresAt, "expiresAt");
  if (issuedAt > now || expiresAt <= issuedAt || expiresAt <= now) {
    throw new Error("Authorization is expired or has an invalid validity period.");
  }
  return { issuedAt, expiresAt };
}

export async function loadMutationAuthorization({
  repositoryRoot: root = repositoryRoot,
  project,
  authorizationFile,
  tenantOrigin,
  environment,
  appId,
  guestSpaceId = null,
  operation,
  now = Date.now(),
} = {}) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(project ?? "")) {
    throw new Error("--project must be a valid explicit project slug.");
  }
  if (
    typeof authorizationFile !== "string" ||
    !/^[a-z0-9][a-z0-9._-]{0,80}\.json$/u.test(authorizationFile) ||
    authorizationFile.includes("..")
  ) {
    throw new Error(
      "--authorization must be a JSON filename stored under projects/<project>/private/authorization/.",
    );
  }
  if (!KNOWN_ENVIRONMENTS.has(environment)) {
    throw new Error(
      "--environment must be development, test, demo, staging, or production.",
    );
  }
  if (!isPositiveInteger(appId)) throw new Error("App ID must be a positive integer.");
  if (guestSpaceId !== null && !isPositiveInteger(guestSpaceId)) {
    throw new Error("Guest Space ID must be a positive integer.");
  }
  const expectedTenant = validateKintoneBaseUrl(tenantOrigin);
  if (expectedTenant.origin !== tenantOrigin) {
    throw new Error("Authorization tenantOrigin must be a canonical HTTPS origin.");
  }

  const canonicalRepositoryRoot = await realpath(root);
  const projectsPath = path.join(canonicalRepositoryRoot, "projects");
  const canonicalProjectsPath = await requireCanonicalDirectory(
    projectsPath,
    "projects/",
  );
  const projectPath = path.join(canonicalProjectsPath, project);
  const canonicalProjectPath = await requireCanonicalDirectory(
    projectPath,
    `Project ${project}`,
  );
  if (
    !pathEquals(path.dirname(canonicalProjectPath), canonicalProjectsPath) ||
    path.basename(canonicalProjectPath) !== project
  ) {
    throw new Error("Project path does not match the explicit project slug.");
  }
  const projectErrors = await validateProject(canonicalRepositoryRoot, project);
  if (projectErrors.length) {
    throw new Error(`Project ${project} is not valid: ${projectErrors.join("; ")}`);
  }

  const privatePath = path.join(canonicalProjectPath, "private");
  const canonicalPrivatePath = await requireCanonicalDirectory(
    privatePath,
    "Project private/",
  );
  if (!pathIsWithin(canonicalProjectPath, canonicalPrivatePath)) {
    throw new Error("Project private/ resolves outside the validated project.");
  }
  const authorizationPath = path.join(canonicalPrivatePath, "authorization");
  const canonicalAuthorizationPath = await requireCanonicalDirectory(
    authorizationPath,
    "Project private/authorization/",
  );
  if (!pathIsWithin(canonicalPrivatePath, canonicalAuthorizationPath)) {
    throw new Error("Authorization directory resolves outside project private/.");
  }
  const filePath = path.join(canonicalAuthorizationPath, authorizationFile);
  const fileInfo = await lstat(filePath).catch(() => null);
  if (!fileInfo?.isFile() || fileInfo.isSymbolicLink()) {
    throw new Error("Authorization file must be an existing regular, non-symlink file.");
  }
  const canonicalFilePath = await realpath(filePath);
  if (
    !pathIsWithin(canonicalAuthorizationPath, canonicalFilePath) ||
    !pathEquals(canonicalFilePath, filePath)
  ) {
    throw new Error("Authorization file must remain under project private/authorization/.");
  }

  let authorization;
  let authorizationBytes;
  try {
    authorizationBytes = await readFile(canonicalFilePath);
    authorization = JSON.parse(authorizationBytes.toString("utf8"));
  } catch {
    throw new Error("Authorization file is not valid JSON.");
  }
  assertActiveAuthorizationRecord(authorization, now);
  if (
    authorization.project !== project ||
    authorization.tenantOrigin !== expectedTenant.origin ||
    authorization.environment !== environment ||
    String(authorization.app) !== String(appId) ||
    (authorization.guestSpace === null ? null : String(authorization.guestSpace)) !==
      (guestSpaceId === null ? null : String(guestSpaceId)) ||
    authorization.operation !== operation
  ) {
    throw new Error(
      "Authorization does not match the explicit project, tenant, environment, App/guest-space, or operation.",
    );
  }
  if (
    typeof authorization.approvalReference !== "string" ||
    !authorization.approvalReference.trim() ||
    authorization.approvalReference.length > 512 ||
    /[\r\n\u0000-\u001f]/u.test(authorization.approvalReference)
  ) {
    throw new Error("Authorization needs a valid user approval reference.");
  }
  const limits = deepFreeze(validateLimits(authorization, operation));
  const context = Object.freeze({
    operation,
    project,
    environment,
    tenantOrigin: expectedTenant.origin,
    app: String(appId),
    guestSpace: guestSpaceId === null ? null : String(guestSpaceId),
    approvalReference: authorization.approvalReference,
    limits,
  });
  mutationContexts.set(context, {
    authorizationPath: canonicalFilePath,
    authorizationDirectory: canonicalAuthorizationPath,
    authorizationHash: sha256(authorizationBytes),
    uploadedFileKeys: new Set(),
    customizationBaseline: null,
  });
  return context;
}

async function assertCurrentMutationAuthorization(context, state) {
  const authorizationDirectory = await realpath(state.authorizationDirectory).catch(() => null);
  if (!authorizationDirectory || !pathEquals(authorizationDirectory, state.authorizationDirectory)) {
    throw new Error("Authorization directory changed or is no longer canonical.");
  }
  const fileInfo = await lstat(state.authorizationPath).catch(() => null);
  if (!fileInfo?.isFile() || fileInfo.isSymbolicLink()) {
    throw new Error("Authorization file changed or is no longer a regular, non-symlink file.");
  }
  const canonicalFile = await realpath(state.authorizationPath);
  if (
    !pathEquals(canonicalFile, state.authorizationPath) ||
    !pathIsWithin(authorizationDirectory, canonicalFile)
  ) {
    throw new Error("Authorization file no longer resolves inside project private/authorization/.");
  }

  const bytes = await readFile(canonicalFile);
  let authorization;
  try {
    authorization = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("Authorization file changed and is no longer valid JSON.");
  }
  assertActiveAuthorizationRecord(authorization);
  if (sha256(bytes) !== state.authorizationHash) {
    throw new Error("Authorization file changed after validation; reload and re-approve the exact operation.");
  }
  if (
    authorization.project !== context.project ||
    authorization.tenantOrigin !== context.tenantOrigin ||
    authorization.environment !== context.environment ||
    String(authorization.app) !== context.app ||
    (authorization.guestSpace === null ? null : String(authorization.guestSpace)) !==
      context.guestSpace ||
    authorization.operation !== context.operation
  ) {
    throw new Error("Authorization scope no longer matches the active mutation context.");
  }
}

export class KintoneRestError extends Error {
  constructor(method, endpointPath, status) {
    super(`Kintone REST ${method} ${endpointPath} failed with HTTP ${status}.`);
    this.name = "KintoneRestError";
    this.method = method;
    this.endpointPath = endpointPath;
    this.status = status;
  }
}

export class KintoneTransportError extends Error {
  constructor(method, endpointPath, message, code, uncertainState = false) {
    super(message);
    this.name = "KintoneTransportError";
    this.method = method;
    this.endpointPath = endpointPath;
    this.code = code;
    this.uncertainState = uncertainState;
  }
}

function resolveEndpoint(pathInput, baseUrl) {
  if (
    typeof pathInput !== "string" ||
    !pathInput.startsWith("/") ||
    pathInput.startsWith("//") ||
    pathInput.includes("\\") ||
    pathInput.includes("#") ||
    /[\r\n\u0000]/u.test(pathInput) ||
    /(?:^|\/)(?:\.|%2e){1,2}(?:\/|$)/iu.test(pathInput.split(/[?#]/u, 1)[0])
  ) {
    throw new Error("Kintone REST endpoint must be an origin-relative API path.");
  }
  const endpoint = new URL(pathInput, baseUrl);
  if (
    endpoint.origin !== baseUrl.origin ||
    endpoint.username ||
    endpoint.password ||
    endpoint.hash
  ) {
    throw new Error("Kintone REST endpoint must remain on the configured HTTPS origin.");
  }
  return endpoint;
}

function safeEndpointPath(endpoint) {
  return endpoint.pathname;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function customizationUpdateEntry(entry) {
  if (entry?.type === "URL" && entry.url) {
    return { type: "URL", url: entry.url };
  }
  if (entry?.type === "FILE" && entry.file?.fileKey) {
    return { type: "FILE", file: { fileKey: entry.file.fileKey } };
  }
  throw new Error("Existing customization contains an unsupported entry shape.");
}

function customizationUpdateSettings(settings) {
  const convert = (entries) => (entries ?? []).map(customizationUpdateEntry);
  return {
    scope: settings.scope,
    desktop: {
      js: convert(settings.desktop?.js),
      css: convert(settings.desktop?.css),
    },
    mobile: {
      js: convert(settings.mobile?.js),
      css: convert(settings.mobile?.css),
    },
  };
}

function expectedCustomizationUpdate({ context, state, body }) {
  const baseline = state.customizationBaseline;
  const allowedKeys = ["app", "revision", "scope", "desktop", "mobile"];
  if (
    !baseline ||
    String(body.revision) !== String(baseline.data.revision) ||
    !isDeepStrictEqual(Object.keys(body).sort(), [...allowedKeys].sort())
  ) {
    throw new Error(
      "Customization update needs the current read-back revision and the exact supported settings fields.",
    );
  }

  const settings = customizationUpdateSettings(baseline.data);
  const targetEntries = settings[context.limits.target].js;
  const originalEntries = baseline.data[context.limits.target]?.js ?? [];
  const matchingIndexes = originalEntries.flatMap((entry, index) =>
    entry?.type === "FILE" && entry.file?.name === context.limits.fileName
      ? [index]
      : [],
  );
  if (
    (context.limits.replaceExisting && matchingIndexes.length !== 1) ||
    (!context.limits.replaceExisting && matchingIndexes.length !== 0)
  ) {
    throw new Error(
      "Current customization does not match the exactly approved add-versus-replace mode; no settings were changed.",
    );
  }

  const newEntry = body[context.limits.target]?.js?.find(
    (entry) =>
      entry?.type === "FILE" &&
      typeof entry.file?.fileKey === "string" &&
      state.uploadedFileKeys.has(entry.file.fileKey),
  );
  if (!newEntry) {
    throw new Error(
      "Customization update must attach the exact file uploaded under this authorization context.",
    );
  }
  if (matchingIndexes.length === 1) {
    targetEntries.splice(matchingIndexes[0], 1, {
      type: "FILE",
      file: { fileKey: newEntry.file.fileKey },
    });
  } else {
    targetEntries.push({
      type: "FILE",
      file: { fileKey: newEntry.file.fileKey },
    });
  }
  if (!isDeepStrictEqual(body.scope === undefined ? undefined : {
    scope: body.scope,
    desktop: body.desktop,
    mobile: body.mobile,
  }, settings)) {
    throw new Error(
      "Customization update would add, remove, or alter settings beyond the exactly approved file entry.",
    );
  }
}

async function authorizeMutation({ context, endpoint, method, body }) {
  const state = context && mutationContexts.get(context);
  if (!state) {
    throw new Error(
      "Kintone REST client is read-only by default; load a current, operation-scoped authorization record before staging writes.",
    );
  }
  if (
    endpoint.origin !== context.tenantOrigin ||
    endpoint.search ||
    endpoint.hash
  ) {
    throw new Error("Mutation target does not match the authorized canonical tenant origin.");
  }
  await assertCurrentMutationAuthorization(context, state);
  const apiRoot = context.guestSpace
    ? `/k/guest/${context.guestSpace}/v1`
    : "/k/v1";

  if (context.operation === "app-customization.stage") {
    const limits = context.limits;
    if (method === "POST" && endpoint.pathname === `${apiRoot}/file.json`) {
      if (!(body instanceof FormData)) {
        throw new Error("Authorized customization upload must use the multipart file endpoint.");
      }
      const file = body.get("file");
      if (
        !file ||
        file.name !== limits.fileName ||
        file.size > limits.maxFileBytes ||
        sha256(Buffer.from(await file.arrayBuffer())) !== limits.sha256
      ) {
        throw new Error("Upload file does not match the authorized name, hash, or byte limit.");
      }
      return { state, upload: true };
    }
    if (
      method === "PUT" &&
      endpoint.pathname === `${apiRoot}/preview/app/customize.json` &&
      body?.app !== undefined &&
      String(body.app) === context.app
    ) {
      expectedCustomizationUpdate({ context, state, body });
      return { state, upload: false };
    }
  }

  if (
    context.operation === "process-management.stage" &&
    method === "PUT" &&
    endpoint.pathname === `${apiRoot}/preview/app/status.json` &&
    body?.app !== undefined &&
    String(body.app) === context.app
  ) {
    const { app: _app, revision: _revision, ...config } = body;
    if (sha256(JSON.stringify(config)) !== context.limits.configSha256) {
      throw new Error("Process settings do not match the authorized configuration hash.");
    }
    return { state, upload: false };
  }

  throw new Error(
    "Mutation method or endpoint is outside the explicit app/operation authorization scope.",
  );
}

async function parseResponse(response, method, endpointPath, readOnly) {
  if (!response.ok) {
    throw new KintoneRestError(method, endpointPath, response.status);
  }
  let text;
  try {
    text = await response.text();
  } catch {
    throw new KintoneTransportError(
      method,
      endpointPath,
      `Kintone REST ${method} ${endpointPath} response body could not be read` +
        (readOnly
          ? "."
          : "; write outcome is uncertain. Read back the target state before any retry."),
      "ENETWORK",
      !readOnly,
    );
  }
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    if (!readOnly) {
      throw new KintoneTransportError(
        method,
        endpointPath,
        `Kintone REST ${method} ${endpointPath} returned an unreadable response; write outcome is uncertain. Read back the target state before any retry.`,
        "EPROTOCOL",
        true,
      );
    }
    throw new Error(`Kintone REST ${method} ${endpointPath} returned a non-JSON response.`);
  }
}

function isReadRetryable(error) {
  return (
    (error instanceof KintoneRestError &&
      RETRYABLE_READ_STATUSES.has(error.status)) ||
    (error instanceof KintoneTransportError &&
      ["ETIMEDOUT", "ENETWORK"].includes(error.code))
  );
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createKintoneRestClient({
  env = process.env,
  fetchImpl = fetch,
  allowApiToken = true,
  mutationContext,
  timeoutMs = 15_000,
  maxReadRetries = 2,
  retryDelayMs = 100,
} = {}) {
  const baseUrl = validateKintoneBaseUrl(env.KINTONE_BASE_URL);
  assertSecureTls(env);
  const authHeaders = buildKintoneAuthHeaders(env, { allowApiToken });
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    throw new Error("timeoutMs must be a positive integer.");
  }
  if (!Number.isSafeInteger(maxReadRetries) || maxReadRetries < 0 || maxReadRetries > 5) {
    throw new Error("maxReadRetries must be an integer from 0 to 5.");
  }

  return {
    async request(pathInput, { method = "GET", body, headers = {} } = {}) {
      const normalizedMethod = String(method).toUpperCase();
      const endpoint = resolveEndpoint(pathInput, baseUrl);
      const endpointPath = safeEndpointPath(endpoint);
      const readOnly =
        ["GET", "HEAD"].includes(normalizedMethod) && body === undefined;
      const mutation = readOnly
        ? null
        : await authorizeMutation({
            context: mutationContext,
            endpoint,
            method: normalizedMethod,
            body,
          });

      for (const [name] of Object.entries(headers)) {
        if (credentialHeaderNames.has(name.toLowerCase())) {
          throw new Error(
            `Caller-supplied ${name} header is forbidden; authentication headers are controlled by the runtime.`,
          );
        }
      }

      const requestHeaders = { ...authHeaders, ...headers };
      const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
      let requestBody = body;
      if (body !== undefined && !isFormData) {
        requestHeaders["Content-Type"] ??= "application/json";
        requestBody = typeof body === "string" ? body : JSON.stringify(body);
      }

      const safeReadRetry =
        normalizedMethod === "GET" && body === undefined;
      const attempts = safeReadRetry ? maxReadRetries + 1 : 1;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        // Authorization file I/O is deliberately outside the transport timeout/catch:
        // a local revocation or expiry means no request was sent and must not be
        // reported as an uncertain remote write.
        if (mutation) {
          await assertCurrentMutationAuthorization(mutationContext, mutation.state);
        }
        const controller = new AbortController();
        let timeoutHandle;
        let timedOut = false;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutHandle = setTimeout(() => {
            timedOut = true;
            controller.abort();
            reject(
              new KintoneTransportError(
                normalizedMethod,
                endpointPath,
                `Kintone REST ${normalizedMethod} ${endpointPath} timed out after ${timeoutMs} ms` +
                  (readOnly
                    ? "."
                    : "; write outcome is uncertain. Read back the target state before any retry."),
                "ETIMEDOUT",
                !readOnly,
              ),
            );
          }, timeoutMs);
        });

        const operationPromise = (async () => {
          let response;
          try {
            response = await fetchImpl(endpoint, {
              method: normalizedMethod,
              headers: requestHeaders,
              body: requestBody,
              signal: controller.signal,
              redirect: "error",
            });
          } catch {
            throw new KintoneTransportError(
              normalizedMethod,
              endpointPath,
              `Kintone REST ${normalizedMethod} ${endpointPath} failed before receiving a response` +
                (readOnly
                  ? "."
                  : "; write outcome is uncertain. Read back the target state before any retry."),
              "ENETWORK",
              !readOnly,
            );
          }

          if (response.url) {
            let responseUrl;
            try {
              responseUrl = new URL(response.url);
            } catch {
              throw new KintoneTransportError(
                normalizedMethod,
                endpointPath,
                "Kintone REST response URL is invalid; refusing credential-bearing redirects" +
                  (readOnly
                    ? "."
                    : "; write outcome is uncertain. Read back the target state before any retry."),
                "EPROTOCOL",
                !readOnly,
              );
            }
            if (responseUrl.origin !== baseUrl.origin) {
              throw new KintoneTransportError(
                normalizedMethod,
                endpointPath,
                "Kintone REST response changed origin; credential-bearing redirects are rejected" +
                  (readOnly
                    ? "."
                    : "; write outcome is uncertain. Read back the target state before any retry."),
                "EPROTOCOL",
                !readOnly,
              );
            }
          }
          const data = await parseResponse(
            response,
            normalizedMethod,
            endpointPath,
            readOnly,
          );
          if (
            mutation?.upload &&
            typeof data.fileKey === "string" &&
            data.fileKey.length > 0
          ) {
            mutation.state.uploadedFileKeys.add(data.fileKey);
          }
          if (
            normalizedMethod === "GET" &&
            mutationContext &&
            endpoint.pathname ===
              `${mutationContext.guestSpace ? `/k/guest/${mutationContext.guestSpace}/v1` : "/k/v1"}/preview/app/customize.json` &&
            endpoint.searchParams.getAll("app").length === 1 &&
            endpoint.searchParams.get("app") === mutationContext.app &&
            [...endpoint.searchParams.keys()].every((key) => key === "app")
          ) {
            const state = mutationContexts.get(mutationContext);
            if (state && mutationContext.operation === "app-customization.stage") {
              state.customizationBaseline = {
                requestPath: endpoint.pathname,
                data: structuredClone(data),
              };
            }
          }
          return data;
        })();

        try {
          return await Promise.race([operationPromise, timeoutPromise]);
        } catch (error) {
          if (timedOut) {
            if (!readOnly) error.uncertainState = true;
            if (safeReadRetry && attempt + 1 < attempts && isReadRetryable(error)) {
              await wait(retryDelayMs * (attempt + 1));
              continue;
            }
            throw error;
          }
          if (safeReadRetry && attempt + 1 < attempts && isReadRetryable(error)) {
            await wait(retryDelayMs * (attempt + 1));
            continue;
          }
          if (!readOnly && error instanceof KintoneTransportError) {
            error.uncertainState = true;
            if (!error.message.includes("write outcome is uncertain")) {
              error.message += "; write outcome is uncertain. Read back the target state before any retry.";
            }
          }
          if (!readOnly && error instanceof KintoneRestError && error.status >= 500) {
            error.uncertainState = true;
            error.message += "; write outcome may be uncertain. Read back the target state before any retry.";
          }
          throw error;
        } finally {
          clearTimeout(timeoutHandle);
        }
      }
      throw new Error("Kintone REST request ended without a result.");
    },
  };
}
