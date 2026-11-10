import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  loadEffectiveConfig,
  loadMutationAuthorization,
  reportConfigConflicts,
  resolveProjectFile,
  validateKintoneBaseUrl,
  createKintoneRestClient,
} from "./lib/kintone-rest.mjs";
import {
  toUpdateSettings,
  verifyStagedFile,
} from "./lib/customization-verification.mjs";

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1];
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

const appId = argument("app");
const filePath = argument("file");
const target = argument("target") ?? "desktop";
const guestSpaceId = argument("guest-space") ?? null;
const project = argument("project");
const environment = argument("environment");
const authorizationFile = argument("authorization");
const replaceExisting = process.argv.includes("--replace-existing");

if (!/^[1-9]\d*$/u.test(appId ?? "")) {
  console.error("App ID must be a positive integer.");
  process.exit(1);
}
if (guestSpaceId !== null && !/^[1-9]\d*$/u.test(guestSpaceId)) {
  console.error("Guest Space ID must be a positive integer.");
  process.exit(1);
}
if (!filePath) {
  console.error("--file is required.");
  process.exit(1);
}
if (!["desktop", "mobile"].includes(target)) {
  console.error("--target must be desktop or mobile.");
  process.exit(1);
}

const absoluteFilePath = await resolveProjectFile({ project, filePath });
const fileName = path.basename(absoluteFilePath);
const file = await readFile(absoluteFilePath);
const fileHash = createHash("sha256").update(file).digest("hex");
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
  operation: "app-customization.stage",
});
const limits = mutationContext.limits;
if (
  limits.fileName !== fileName ||
  limits.target !== target ||
  file.byteLength > limits.maxFileBytes ||
  limits.sha256 !== fileHash ||
  limits.replaceExisting !== replaceExisting
) {
  throw new Error(
    "Selected customization file/target/replacement mode does not match the user-approved authorization limits.",
  );
}
const client = createKintoneRestClient({
  env,
  allowApiToken: false,
  mutationContext,
});
const apiRoot = guestSpaceId ? `/k/guest/${guestSpaceId}/v1` : "/k/v1";
const previewPath = `${apiRoot}/preview/app/customize.json?app=${appId}`;

const before = await client.request(previewPath);
const existingSameName = (before[target]?.js ?? []).some(
  (entry) => entry.type === "FILE" && entry.file?.name === fileName,
);
if (existingSameName && !replaceExisting) {
  throw new Error(
    `${fileName} already exists in ${target}.js. Re-run with --replace-existing only after replacement is approved.`,
  );
}

const form = new FormData();
form.append("file", new Blob([file], { type: "text/javascript" }), fileName);
const upload = await client.request(`${apiRoot}/file.json`, {
  method: "POST",
  body: form,
});
if (!upload.fileKey) throw new Error("Upload File did not return fileKey.");

const pending = toUpdateSettings(before);
const targetEntries = pending[target].js;
const existingIndex = (before[target]?.js ?? []).findIndex(
  (entry) => entry.type === "FILE" && entry.file?.name === fileName,
);
const newEntry = { type: "FILE", file: { fileKey: upload.fileKey } };
if (existingIndex >= 0) targetEntries.splice(existingIndex, 1, newEntry);
else targetEntries.push(newEntry);

const update = await client.request(`${apiRoot}/preview/app/customize.json`, {
  method: "PUT",
  body: {
    app: appId,
    revision: before.revision,
    ...pending,
  },
});
if (!update.revision) throw new Error("Update Customization did not return revision.");

const after = await client.request(previewPath);
let verification;
try {
  verification = verifyStagedFile({
    before,
    after,
    target,
    fileName,
    fileSize: file.byteLength,
    updateRevision: update.revision,
  });
} catch {
  throw new Error(
    `Customization read-back failed. PUT revision=${update.revision}; ` +
      `GET revision=${after.revision}; target=${target}.js; ` +
      `expectedSize=${file.byteLength}; observedEntryCount=${(after[target]?.js ?? []).length}. ` +
      "Customer customization values and URLs were omitted from terminal output.",
  );
}

console.log(
  JSON.stringify(
    {
      verified: true,
      app: appId,
      revisionBefore: String(before.revision),
      ...verification,
      note: "Customization is staged in preview and has not been deployed.",
    },
    null,
    2,
  ),
);
