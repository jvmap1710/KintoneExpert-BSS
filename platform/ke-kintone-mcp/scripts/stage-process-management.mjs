import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  findRemovedWorkflowItems,
  validateFieldEntityCodes,
  validateProcessConfig,
  verifyProcessSettings,
} from "./lib/process-management-verification.mjs";
import {
  createKintoneRestClient,
  loadEffectiveConfig,
  loadMutationAuthorization,
  reportConfigConflicts,
  resolveProjectFile,
  validateKintoneBaseUrl,
} from "./lib/kintone-rest.mjs";

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1];
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

const appId = argument("app");
const configPath = argument("config");
const guestSpaceId = argument("guest-space") ?? null;
const project = argument("project");
const environment = argument("environment");
const authorizationFile = argument("authorization");
const allowRemovals = process.argv.includes("--allow-removals");
if (!/^[1-9]\d*$/u.test(appId ?? "")) {
  console.error("App ID must be a positive integer.");
  process.exit(1);
}
if (!configPath) {
  console.error("--config is required.");
  process.exit(1);
}
if (guestSpaceId !== null && !/^[1-9]\d*$/u.test(guestSpaceId)) {
  console.error("Guest Space ID must be a positive integer.");
  process.exit(1);
}

const absoluteConfigPath = await resolveProjectFile({ project, filePath: configPath });
const config = validateProcessConfig(
  JSON.parse(await readFile(absoluteConfigPath, "utf8")),
);
const configSha256 = createHash("sha256")
  .update(JSON.stringify(config))
  .digest("hex");
const effectiveConfig = await loadEffectiveConfig();
reportConfigConflicts(effectiveConfig);
const env = effectiveConfig.values;
const tenant = validateKintoneBaseUrl(env.KINTONE_BASE_URL);
const mutationContext = await loadMutationAuthorization({
  project,
  authorizationFile,
  tenantOrigin: tenant.origin,
  environment,
  appId,
  guestSpaceId,
  operation: "process-management.stage",
});
if (mutationContext.limits.configSha256 !== configSha256) {
  throw new Error(
    "Process configuration does not match the user-approved authorization hash.",
  );
}
const client = createKintoneRestClient({
  env,
  allowApiToken: false,
  mutationContext,
});
const apiRoot = guestSpaceId ? `/k/guest/${guestSpaceId}/v1` : "/k/v1";
const previewPath = `${apiRoot}/preview/app/status.json?app=${appId}&lang=default`;
const before = await client.request(previewPath);
const form = await client.request(
  `${apiRoot}/preview/app/form/fields.json?app=${appId}&lang=default`,
);
validateFieldEntityCodes(config, form.properties);

const removed = findRemovedWorkflowItems(before, config);
const authorizedRemovedActions = [...mutationContext.limits.removedActions]
  .map((action) => JSON.stringify(action))
  .sort();
const actualRemovedActions = [...removed.actions]
  .map((action) => JSON.stringify(action))
  .sort();
if (
  JSON.stringify([...mutationContext.limits.removedStates].sort()) !==
    JSON.stringify([...removed.states].sort()) ||
  JSON.stringify(authorizedRemovedActions) !==
    JSON.stringify(actualRemovedActions)
) {
  throw new Error(
    "Process removals do not match the exact state/action removals in the authorization record.",
  );
}
if ((removed.states.length || removed.actions.length) && !allowRemovals) {
  throw new Error(
    "The requested workflow omits existing statuses/actions. " +
      "Refusing the write without --allow-removals. Removal details were omitted from terminal output.",
  );
}

const update = await client.request(`${apiRoot}/preview/app/status.json`, {
  method: "PUT",
  body: {
    app: appId,
    revision: before.revision,
    ...config,
  },
});
if (!update.revision) {
  throw new Error("Update Process Management did not return revision.");
}

const after = await client.request(previewPath);
let verification;
try {
  verification = verifyProcessSettings({
    expected: config,
    actual: after,
    updateRevision: update.revision,
  });
} catch (error) {
  throw new Error(
    `Process Management read-back failed. PUT revision=${update.revision}; ` +
      `GET revision=${after.revision}. Workflow settings and URLs were omitted from terminal output.`,
  );
}

console.log(
  JSON.stringify(
    {
      verified: true,
      app: appId,
      guestSpace: guestSpaceId ?? null,
      revisionBefore: String(before.revision),
      removed,
      ...verification,
      note: "Process Management is staged in preview and has not been deployed.",
    },
    null,
    2,
  ),
);
