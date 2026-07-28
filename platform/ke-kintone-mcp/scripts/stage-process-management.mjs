import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  findRemovedWorkflowItems,
  normalizeProcessSettings,
  validateFieldEntityCodes,
  validateProcessConfig,
  verifyProcessSettings,
} from "./lib/process-management-verification.mjs";
import { createKintoneRestClient } from "./lib/kintone-rest.mjs";

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1];
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

const appId = argument("app");
const configPath = argument("config");
const guestSpaceId = argument("guest-space");
const allowRemovals = process.argv.includes("--allow-removals");
if (!/^[1-9]\d*$/u.test(appId ?? "")) {
  console.error("App ID must be a positive integer.");
  process.exit(1);
}
if (!configPath) {
  console.error("--config is required.");
  process.exit(1);
}
if (guestSpaceId !== undefined && !/^[1-9]\d*$/u.test(guestSpaceId)) {
  console.error("Guest Space ID must be a positive integer.");
  process.exit(1);
}

const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
const absoluteConfigPath = path.resolve(invocationDirectory, configPath);
const config = validateProcessConfig(
  JSON.parse(await readFile(absoluteConfigPath, "utf8")),
);
const client = createKintoneRestClient();
const apiRoot = guestSpaceId ? `/k/guest/${guestSpaceId}/v1` : "/k/v1";
const previewPath = `${apiRoot}/preview/app/status.json?app=${appId}&lang=default`;
const before = await client.request(previewPath);
const form = await client.request(
  `${apiRoot}/preview/app/form/fields.json?app=${appId}&lang=default`,
);
validateFieldEntityCodes(config, form.properties);

const removed = findRemovedWorkflowItems(before, config);
if ((removed.states.length || removed.actions.length) && !allowRemovals) {
  throw new Error(
    "The requested workflow omits existing statuses/actions. " +
      `Refusing the write without --allow-removals. ${JSON.stringify(removed)}`,
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
      `GET revision=${after.revision}; expected=` +
      `${JSON.stringify(normalizeProcessSettings(config))}; observed=` +
      `${JSON.stringify(normalizeProcessSettings(after))}. ${error.message}`,
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
